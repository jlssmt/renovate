import { newlineRegex, regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
//#region lib/modules/manager/maven-wrapper/extract.ts
const DISTRIBUTION_URL_REGEX = regEx("^(?:distributionUrl\\s*=\\s*)(?<replaceString>\\S*-(?<version>\\d+\\.\\d+(?:\\.\\d+)?(?:-\\w+)*)-(?<type>bin|all)\\.zip)\\s*$");
const WRAPPER_URL_REGEX = regEx("^(?:wrapperUrl\\s*=\\s*)(?<replaceString>\\S*-(?<version>\\d+\\.\\d+(?:\\.\\d+)?(?:-\\w+)*)(?:.jar))");
const WRAPPER_VERSION_REGEX = regEx("^(?:wrapperVersion\\s*=\\s*)(?<replaceString>(?<version>\\d+\\.\\d+(?:\\.\\d+)?))");
const WRAPPER_VERSION_MVNW_REGEX = regEx("^(#|@REM) Apache Maven Wrapper startup batch script, version (?<replaceString>(?<version>\\d+\\.\\d+(?:\\.\\d+)?))");
function extractVersions(fileContent) {
	const lines = coerceArray(fileContent?.split(newlineRegex));
	return {
		maven: extractLineInfo(lines, DISTRIBUTION_URL_REGEX) ?? void 0,
		wrapper: extractLineInfo(lines, WRAPPER_URL_REGEX, WRAPPER_VERSION_REGEX, WRAPPER_VERSION_MVNW_REGEX) ?? void 0
	};
}
function extractLineInfo(lines, ...regexs) {
	for (const regex of regexs) for (const line of lines) {
		const match = regex.exec(line);
		if (match?.groups) return {
			replaceString: match.groups.replaceString,
			version: match.groups.version
		};
	}
	return null;
}
function extractPackageFile(fileContent) {
	logger.trace("maven-wrapper.extractPackageFile()");
	const extractResult = extractVersions(fileContent);
	const deps = [];
	if (extractResult.maven?.version) {
		const maven = {
			depName: "maven",
			packageName: "org.apache.maven:apache-maven",
			currentValue: extractResult.maven?.version,
			replaceString: extractResult.maven?.replaceString,
			datasource: MavenDatasource.id
		};
		deps.push(maven);
	}
	if (extractResult.wrapper?.version) {
		const wrapper = {
			depName: "maven-wrapper",
			packageName: "org.apache.maven.wrapper:maven-wrapper",
			currentValue: extractResult.wrapper?.version,
			replaceString: extractResult.wrapper?.replaceString,
			datasource: MavenDatasource.id
		};
		deps.push(wrapper);
	}
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map