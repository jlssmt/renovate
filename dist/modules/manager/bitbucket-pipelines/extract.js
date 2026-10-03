import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { addDepAsBitbucketTag, addDepAsDockerImage, addDepFromObject, dockerImageObjectRegex, dockerImageRegex, pipeRegex } from "./util.js";
//#region lib/modules/manager/bitbucket-pipelines/extract.ts
function extractPackageFile(content, packageFile, config) {
	const deps = [];
	try {
		const lines = content.replaceAll(regEx(/^\s*\r?\n/gm), "").replaceAll(regEx(/^\s*#.*\r?\n/gm), "").split(newlineRegex);
		const len = lines.length;
		for (let lineIdx = 0; lineIdx < len; lineIdx++) {
			const line = lines[lineIdx];
			const dockerImageObjectGroups = dockerImageObjectRegex.exec(line)?.groups;
			if (dockerImageObjectGroups) {
				lineIdx = addDepFromObject(deps, lines, lineIdx, len, dockerImageObjectGroups.spaces, config.registryAliases);
				continue;
			}
			const pipeMatch = pipeRegex.exec(line);
			if (pipeMatch) {
				const pipe = pipeMatch[1];
				if (pipe.startsWith("docker://")) {
					const currentPipe = pipe.replace("docker://", "");
					addDepAsDockerImage(deps, currentPipe, config.registryAliases);
				} else addDepAsBitbucketTag(deps, pipe);
				continue;
			}
			const dockerImageMatch = dockerImageRegex.exec(line);
			if (dockerImageMatch) {
				const currentFrom = dockerImageMatch[1];
				addDepAsDockerImage(deps, currentFrom, config.registryAliases);
			}
		}
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Error extracting Bitbucket Pipes dependencies");
	}
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map