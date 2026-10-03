import { regEx } from "../../../util/regex.js";
import { CdnjsDatasource } from "../../datasource/cdnjs/index.js";
//#region lib/modules/manager/cdnurl/extract.ts
const cloudflareUrlRegex = regEx(/\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/(?<depName>[^/]+?)\/(?<currentValue>[^/]+?)\/(?<asset>[-/_.a-zA-Z0-9]+)/);
function extractPackageFile(content) {
	const deps = [];
	let rest = content;
	let match = cloudflareUrlRegex.exec(rest);
	let offset = 0;
	while (match?.groups) {
		const [wholeSubstr] = match;
		const { depName, currentValue, asset } = match.groups;
		offset += match.index + wholeSubstr.length;
		rest = content.slice(offset);
		match = cloudflareUrlRegex.exec(rest);
		deps.push({
			datasource: CdnjsDatasource.id,
			depName,
			packageName: `${depName}/${asset}`,
			currentValue
		});
	}
	return { deps };
}
//#endregion
export { cloudflareUrlRegex, extractPackageFile };

//# sourceMappingURL=extract.js.map