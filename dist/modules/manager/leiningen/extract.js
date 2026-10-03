import { newlineRegex, regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { ClojureDatasource } from "../../datasource/clojure/index.js";
//#region lib/modules/manager/leiningen/extract.ts
function trimAtKey(str, kwName) {
	const regex = regEx(`:${kwName}\\s`);
	const keyOffset = str.search(regex);
	if (keyOffset < 0) return null;
	const withSpaces = str.slice(keyOffset + kwName.length + 1);
	const valueOffset = withSpaces.search(regEx(/[^\s]/));
	if (valueOffset < 0) return null;
	return withSpaces.slice(valueOffset);
}
function expandDepName(name) {
	return name.includes("/") ? name.replace("/", ":") : `${name}:${name}`;
}
function extractFromVectors(str, ctx = {}, vars = {}, dimensions = 2) {
	if (!str.startsWith("[")) return [];
	let balance = 0;
	const result = [];
	let idx = 0;
	let vecPos = 0;
	let artifactId = "";
	let version = "";
	let commentLevel = null;
	function isSpace(ch) {
		return !!ch && regEx(/[\s,]/).test(ch);
	}
	function cleanStrLiteral(s) {
		return s.replace(regEx(/^"/), "").replace(regEx(/"$/), "");
	}
	function yieldDep() {
		if (!commentLevel && artifactId && version) {
			const depName = expandDepName(cleanStrLiteral(artifactId));
			if (version.startsWith("~")) {
				const varName = version.replace(regEx(/^~\s*/), "");
				const currentValue = vars[varName];
				if (currentValue) result.push({
					...ctx,
					datasource: ClojureDatasource.id,
					depName,
					currentValue,
					sharedVariableName: varName
				});
			} else result.push({
				...ctx,
				datasource: ClojureDatasource.id,
				depName,
				currentValue: cleanStrLiteral(version)
			});
		}
		artifactId = "";
		version = "";
	}
	let prevChar = null;
	while (idx < str.length) {
		const char = str.charAt(idx);
		if (str.substring(idx).startsWith("#_[")) commentLevel = balance;
		if (char === "[") {
			balance += 1;
			if (balance === dimensions) vecPos = 0;
		} else if (char === "]") {
			balance -= 1;
			if (commentLevel === balance) {
				artifactId = "";
				version = "";
				commentLevel = null;
			}
			if (balance === dimensions - 1) yieldDep();
			if (balance === 0) break;
		} else if (balance === dimensions) {
			if (isSpace(char)) {
				if (!isSpace(prevChar)) vecPos += 1;
			} else if (vecPos === 0) artifactId += char;
			else if (vecPos === 1) version += char;
		}
		prevChar = char;
		idx += 1;
	}
	return result;
}
function extractLeinRepos(content) {
	const result = [];
	const repoContent = trimAtKey(content.replace(regEx(/;;.*(?<newline>[\r\n])/g), "$<newline>"), "repositories");
	if (repoContent) {
		let balance = 0;
		let endIdx = 0;
		for (let idx = 0; idx < repoContent.length; idx += 1) {
			const char = repoContent.charAt(idx);
			if (char === "[") balance += 1;
			else if (char === "]") {
				balance -= 1;
				if (balance <= 0) {
					endIdx = idx;
					break;
				}
			}
		}
		const repoSectionContent = repoContent.slice(0, endIdx);
		coerceArray(repoSectionContent.match(regEx(/"https?:\/\/[^"]*"/g))).map((x) => x.replace(regEx(/^"/), "").replace(regEx(/"$/), "")).forEach((url) => result.push(url));
	}
	return result;
}
const defRegex = regEx(/^[\s,]*\([\s,]*def[\s,]+(?<varName>[-+*=<>.!?#$%&_|a-zA-Z][-+*=<>.!?#$%&_|a-zA-Z0-9']+)[\s,]*"(?<stringValue>[^"]*)"[\s,]*\)[\s,]*$/);
function extractVariables(content) {
	const result = {};
	const lines = content.split(newlineRegex);
	for (const line of lines) {
		const match = defRegex.exec(line);
		if (match?.groups) {
			const { varName: key, stringValue: val } = match.groups;
			result[key] = val;
		}
	}
	return result;
}
function collectDeps(content, key, registryUrls, vars, options = { nested: true }) {
	const ctx = {
		depType: options.depType ?? key,
		registryUrls
	};
	const dimensions = options.nested ? 2 : 1;
	let result = [];
	let restContent = trimAtKey(content, key);
	while (restContent) {
		result = [...result, ...extractFromVectors(restContent, ctx, vars, dimensions)];
		restContent = trimAtKey(restContent, key);
	}
	return result;
}
function extractPackageFile(content) {
	const registryUrls = extractLeinRepos(content);
	const vars = extractVariables(content);
	return { deps: [
		...collectDeps(content, "dependencies", registryUrls, vars),
		...collectDeps(content, "managed-dependencies", registryUrls, vars),
		...collectDeps(content, "plugins", registryUrls, vars),
		...collectDeps(content, "pom-plugins", registryUrls, vars),
		...collectDeps(content, "coords", registryUrls, vars, {
			nested: false,
			depType: "parent-project"
		})
	] };
}
//#endregion
export { expandDepName, extractFromVectors, extractPackageFile, extractVariables, trimAtKey };

//# sourceMappingURL=extract.js.map