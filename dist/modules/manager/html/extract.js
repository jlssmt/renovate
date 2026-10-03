import { regEx } from "../../../util/regex.js";
import { CdnjsDatasource } from "../../datasource/cdnjs/index.js";
import { cloudflareUrlRegex } from "../cdnurl/extract.js";
//#region lib/modules/manager/html/extract.ts
const regex = regEx(/<\s*(?:script|link)\s+[^>]*?\/?>/i);
const integrityRegex = regEx(/\s+integrity\s*=\s*(?:"|')(?<currentDigest>[^"']+)/);
function extractDep(tag) {
	const match = cloudflareUrlRegex.exec(tag);
	if (!match?.groups) return null;
	const { depName, currentValue, asset } = match.groups;
	const dep = {
		datasource: CdnjsDatasource.id,
		depName,
		packageName: `${depName}/${asset}`,
		currentValue,
		replaceString: tag
	};
	const integrityMatch = integrityRegex.exec(tag);
	if (integrityMatch?.groups) dep.currentDigest = integrityMatch.groups.currentDigest;
	return dep;
}
function extractPackageFile(content) {
	const deps = [];
	let rest = content;
	let match = regex.exec(rest);
	let offset = 0;
	while (match) {
		const [replaceString] = match;
		offset += match.index + replaceString.length;
		rest = content.slice(offset);
		match = regex.exec(rest);
		const dep = extractDep(replaceString);
		if (dep) deps.push(dep);
	}
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractDep, extractPackageFile };

//# sourceMappingURL=extract.js.map