import { regEx } from "../../../util/regex.js";
//#region lib/modules/manager/ant/properties.ts
const fullPlaceholderRegex = regEx(/^\$\{(?<key>[^}]+)}$/);
const placeholderTestRegex = regEx(/\$\{[^}]+}/);
const propertySeparatorRegex = regEx(/^(?<key>[^=:\s]+)\s*[=:\s]\s*(?<value>.*)$/);
function containsPlaceholder(str) {
	return !!str && placeholderTestRegex.test(str);
}
/**
* Find the byte offset of an attribute's value in raw XML content.
* Returns the offset of the first character of the value (after the opening quote).
*/
function findAttrValuePosition(content, node, attrName) {
	const startTag = node.startTagPosition;
	const tagEnd = content.indexOf(">", startTag);
	const tagContent = content.slice(startTag, tagEnd + 1);
	const match = regEx(`${RegExp.escape(attrName)}\\s*=\\s*(?:"(?<dq>[^"]*)"|'(?<sq>[^']*)')`).exec(tagContent);
	const valueInMatch = match.groups.dq ?? match.groups.sq;
	const valueOffset = match[0].indexOf(valueInMatch);
	return startTag + match.index + valueOffset;
}
/**
* Parse a .properties file into a map of property names to AntProp.
* Implements first-definition-wins: if a key already exists in the map, it is not overwritten.
*/
function parsePropertiesFile(content, packageFile, props) {
	let offset = 0;
	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();
		if (line.startsWith("#") || line.startsWith("!") || line === "") {
			offset += rawLine.length + 1;
			continue;
		}
		const separatorMatch = propertySeparatorRegex.exec(line);
		if (separatorMatch) {
			const key = separatorMatch.groups.key;
			const val = separatorMatch.groups.value.trim();
			if (!(key in props)) props[key] = {
				val,
				fileReplacePosition: offset + rawLine.indexOf(line) + line.indexOf(separatorMatch.groups.value),
				packageFile
			};
		}
		offset += rawLine.length + 1;
	}
}
/**
* Apply property resolution to a dependency.
* Handles chained references with circular detection.
*/
function applyProps(dep, depPackageFile, props) {
	const currentValue = dep.currentValue;
	if (!currentValue || !containsPlaceholder(currentValue)) return dep;
	const fullMatch = fullPlaceholderRegex.exec(currentValue);
	if (!fullMatch) {
		dep.skipReason = "version-placeholder";
		return dep;
	}
	const propKey = fullMatch.groups.key;
	const prop = props[propKey];
	if (!prop) {
		dep.skipReason = "version-placeholder";
		return dep;
	}
	if (containsPlaceholder(prop.val)) {
		dep.skipReason = "recursive-placeholder";
		return dep;
	}
	dep.currentValue = prop.val;
	dep.sharedVariableName = propKey;
	dep.fileReplacePosition = prop.fileReplacePosition;
	if (prop.packageFile !== depPackageFile) dep.editFile = prop.packageFile;
	dep.propSource = prop.packageFile;
	return dep;
}
/**
* Resolve a single property key, following chained references.
* Returns the resolved value or null if circular/unresolvable.
*/
function resolveKey(key, props, resolved, chain) {
	if (resolved.has(key)) return resolved.get(key);
	if (chain.has(key)) {
		resolved.set(key, null);
		return null;
	}
	const prop = props[key];
	if (!prop) return null;
	if (!containsPlaceholder(prop.val)) {
		resolved.set(key, prop.val);
		return prop.val;
	}
	chain.add(key);
	let isCircular = false;
	const val = prop.val.replace(regEx(/\$\{(?<key>[^}]+)}/g), (match, refKey) => {
		const refResult = resolveKey(refKey, props, resolved, chain);
		if (refResult === null) {
			isCircular = true;
			return match;
		}
		return refResult;
	});
	chain.delete(key);
	if (isCircular) {
		resolved.set(key, null);
		return null;
	}
	resolved.set(key, val);
	prop.val = val;
	return val;
}
/**
* Resolve chained property references within the property map itself.
* E.g., if prop A = "${B}" and prop B = "1.0", resolve A to "1.0".
* Marks circular properties by setting val to a placeholder that will be caught later.
*/
function resolveChainedProps(props) {
	const resolved = /* @__PURE__ */ new Map();
	for (const key of Object.keys(props)) resolveKey(key, props, resolved, /* @__PURE__ */ new Set());
}
//#endregion
export { applyProps, containsPlaceholder, findAttrValuePosition, parsePropertiesFile, resolveChainedProps };

//# sourceMappingURL=properties.js.map