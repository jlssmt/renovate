import { coerceObject } from "../../../util/object.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { getDep } from "../dockerfile/extract.js";
import { DockerComposeFile } from "./schema.js";
import { isString, isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/docker-compose/extract.ts
var LineMapper = class {
	imageLines;
	constructor(content, filter) {
		this.imageLines = [...content.split(newlineRegex).entries()].filter((entry) => filter.test(entry[1])).map(([lineNumber, line]) => ({
			lineNumber,
			line,
			used: false
		}));
	}
	pluckLineNumber(imageName) {
		const lineMeta = this.imageLines.find(({ line, used }) => !used && imageName && line.includes(imageName));
		// istanbul ignore if
		if (!lineMeta) return null;
		lineMeta.used = true;
		return lineMeta.lineNumber;
	}
};
function extractPackageFile(content, packageFile, extractConfig) {
	logger.debug(`docker-compose.extractPackageFile(${packageFile})`);
	let config;
	try {
		config = parseSingleYaml(content, {
			customSchema: DockerComposeFile,
			removeTemplates: true
		});
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, `Parsing Docker Compose config YAML failed`);
		return null;
	}
	try {
		const lineMapper = new LineMapper(content, regEx(/^\s*image:/));
		const services = config.services ?? config;
		const extensions = coerceObject(config.extensions);
		const deps = Object.values(services).concat(Object.values(extensions)).filter((service) => isString(service?.image) && !service?.build).map((service) => {
			const dep = getDep(service.image, true, extractConfig.registryAliases);
			// istanbul ignore if
			if (!lineMapper.pluckLineNumber(service.image)) return null;
			return dep;
		}).filter(isTruthy);
		logger.trace({ deps }, "Docker Compose image");
		return { deps };
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			packageFile,
			err
		}, "Error extracting Docker Compose file");
		return null;
	}
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map