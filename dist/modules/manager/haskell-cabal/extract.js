import { regEx } from "../../../util/regex.js";
//#region lib/modules/manager/haskell-cabal/extract.ts
const buildDependsRegex = regEx(/(?<buildDependsFieldName>build-depends[ \t]*:)/i);
const commentRegex = regEx(/^[ \t]*--/);
function isNonASCII(str) {
	for (let i = 0; i < str.length; i++) if (str.charCodeAt(i) > 127) return true;
	return false;
}
function countPackageNameLength(input) {
	if (input.length < 1 || isNonASCII(input)) return null;
	if (!regEx(/^[A-Za-z0-9]/).test(input[0])) return null;
	let idx = 1;
	while (idx < input.length) if (regEx(/[A-Za-z0-9-]/).test(input[idx])) idx++;
	else break;
	if (!regEx(/[A-Za-z]/).test(input.slice(0, idx))) return null;
	if (idx - 1 < input.length && input[idx - 1] === "-") return null;
	return idx;
}
/**
* Find extents of field contents
*
* @param {number} indent -
*    Indention level maintained within the block.
*    Any indention lower than this means it's outside the field.
*    Lines with this level or more are included in the field.
* @returns {number}
*    Index just after the end of the block.
*    Note that it may be after the end of the string.
*/
function findExtents(indent, content) {
	let blockIdx = 0;
	let mode = "finding-newline";
	for (;;) if (mode === "finding-newline") {
		while (content[blockIdx++] !== "\n") if (blockIdx >= content.length) break;
		if (blockIdx >= content.length) return content.length;
		mode = "finding-indention";
	} else {
		let thisIndent = 0;
		for (;;) {
			if ([" ", "	"].includes(content[blockIdx])) {
				thisIndent += 1;
				blockIdx++;
				if (blockIdx >= content.length) return content.length;
				continue;
			}
			mode = "finding-newline";
			blockIdx++;
			break;
		}
		if (thisIndent < indent) {
			if (content.slice(blockIdx - 1, blockIdx + 1) === "--") {
				mode = "finding-newline";
				continue;
			}
			for (;;) if (content[blockIdx--] === "\n") break;
			return blockIdx + 1;
		}
		mode = "finding-newline";
	}
}
/**
* Find indention level of build-depends
*
* @param {number} match -
*   Search starts at this index, and proceeds backwards.
* @returns {number}
*   Number of indention levels found before 'match'.
*/
function countPrecedingIndentation(content, match) {
	let whitespaceIdx = match - 1;
	let indent = 0;
	while (whitespaceIdx >= 0 && [" ", "	"].includes(content[whitespaceIdx])) {
		indent += 1;
		whitespaceIdx--;
	}
	return indent;
}
/**
* Find one 'build-depends' field name usage and its field value
*
* @returns {{buildDependsContent: string, lengthProcessed: number}}
*   buildDependsContent:
*     the contents of the field, excluding the field name and the colon,
*     and any comments within
*
*   lengthProcessed:
*     points to after the end of the field. Note that the field does _not_
*     necessarily start at `content.length - lengthProcessed`.
*
*   Returns null if no 'build-depends' field is found.
*/
function findDepends(content) {
	const matchObj = buildDependsRegex.exec(content);
	if (!matchObj?.groups) return null;
	const indent = countPrecedingIndentation(content, matchObj.index);
	const ourIdx = matchObj.index + matchObj.groups.buildDependsFieldName.length;
	const extentLength = findExtents(indent + 1, content.slice(ourIdx));
	const extent = content.slice(ourIdx, ourIdx + extentLength);
	const lines = [];
	for (const maybeCommentLine of extent.split("\n")) if (!commentRegex.test(maybeCommentLine)) lines.push(maybeCommentLine);
	return {
		buildDependsContent: lines.join("\n"),
		lengthProcessed: ourIdx + extentLength
	};
}
/**
* Split a cabal single dependency into its constituent parts.
* The first part is the package name, an optional second part contains
* the version constraint.
*
* For example 'base == 3.2' would be split into 'base' and ' == 3.2'.
*
* @returns {{name: string, range: string}}
*   Null if the trimmed string doesn't begin with a package name.
*/
function splitSingleDependency(input) {
	const match = countPackageNameLength(input);
	if (match === null) return null;
	return {
		name: input.slice(0, match),
		range: input.slice(match).trim()
	};
}
function extractNamesAndRanges(content) {
	const list = content.split(",");
	const deps = [];
	for (const untrimmedReplaceString of list) {
		const replaceString = untrimmedReplaceString.trim();
		const maybeNameRange = splitSingleDependency(replaceString);
		if (maybeNameRange !== null) deps.push({
			currentValue: maybeNameRange.range,
			packageName: maybeNameRange.name,
			replaceString
		});
	}
	return deps;
}
//#endregion
export { countPackageNameLength, countPrecedingIndentation, extractNamesAndRanges, findDepends, findExtents, splitSingleDependency };

//# sourceMappingURL=extract.js.map