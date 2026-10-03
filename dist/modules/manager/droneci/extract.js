import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { getDep } from "../dockerfile/extract.js";
//#region lib/modules/manager/droneci/extract.ts
function extractPackageFile(content, packageFile, config) {
	const deps = [];
	try {
		const lines = content.split(newlineRegex);
		for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
			const line = lines[lineNumber];
			const firstLineMatch = regEx(/^(?<leading>\s* image:\s*)(?<replaceString>['"](?<currentFrom>[^\s'"]+)\\)$/).exec(line);
			if (firstLineMatch?.groups) {
				let currentFrom = firstLineMatch.groups.currentFrom;
				let replaceString = firstLineMatch.groups.replaceString;
				for (let i = lineNumber + 1; i < lines.length; i += 1) {
					const internalLine = lines[i];
					const middleLineMatch = regEx(/^(?<replaceString>\s*(?<currentFrom>[^\s'"]+)\\)$/).exec(internalLine);
					if (middleLineMatch?.groups) {
						currentFrom += middleLineMatch.groups.currentFrom;
						replaceString += `\n${middleLineMatch.groups.replaceString}`;
					} else {
						const finalLineMatch = regEx(/^(?<replaceString>\s*(?<currentFrom>[^\s'"]+)['"])$/).exec(internalLine);
						if (finalLineMatch?.groups) {
							currentFrom += finalLineMatch.groups.currentFrom;
							replaceString += `\n${finalLineMatch.groups.replaceString}`;
							const dep = getDep(currentFrom, true, config.registryAliases);
							dep.depType = "docker";
							dep.replaceString = replaceString;
							const d = "@{{newDigest}}";
							const c = firstLineMatch.groups.leading.length + 1;
							const nd = `\\\n${" ".repeat(c)}${d}`;
							dep.autoReplaceStringTemplate = `"${dep.autoReplaceStringTemplate.replace(d, nd)}"`;
							deps.push(dep);
						}
						break;
					}
				}
			} else {
				const match = regEx(/^\s* image:\s*'?"?(?<currentFrom>[^\s'"]+)'?"?\s*$/).exec(line);
				if (match?.groups) {
					const dep = getDep(match.groups.currentFrom, true, config.registryAliases);
					dep.depType = "docker";
					deps.push(dep);
				}
			}
		}
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Error extracting DroneCI images");
	}
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map