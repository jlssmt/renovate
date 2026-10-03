import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { id } from "../../versioning/maven/index.js";
import { JenkinsPluginsDatasource } from "../../datasource/jenkins-plugins/index.js";
import { isSkipComment } from "../../../util/ignore.js";
import { isNonEmptyArray, isString } from "@sindresorhus/is";
//#region lib/modules/manager/jenkins/extract.ts
const YamlExtension = regEx(/\.ya?ml$/);
function getDependency(plugin) {
	const dep = {
		datasource: JenkinsPluginsDatasource.id,
		versioning: id,
		depName: plugin.artifactId
	};
	if (plugin.source?.version) {
		dep.currentValue = plugin.source.version.toString();
		if (!isString(plugin.source.version)) {
			dep.skipReason = "invalid-version";
			logger.warn({ dep }, "Jenkins plugin dependency version is not a string and will be ignored");
		}
	} else dep.skipReason = "unspecified-version";
	if (plugin.source?.version === "latest" || plugin.source?.version === "experimental" || plugin.groupId) dep.skipReason = "unsupported-version";
	if (plugin.source?.url) dep.skipReason = "internal-package";
	if (!dep.skipReason && plugin.renovate?.ignore) dep.skipReason = "ignored";
	logger.debug({ dep }, "Jenkins plugin dependency");
	return dep;
}
function extractYaml(content, packageFile) {
	const deps = [];
	try {
		const doc = parseSingleYaml(content);
		if (isNonEmptyArray(doc?.plugins)) {
			for (const plugin of doc.plugins) if (plugin.artifactId) {
				const dep = getDependency(plugin);
				deps.push(dep);
			}
		}
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Error parsing Jenkins plugins");
	}
	return deps;
}
function extractText(content) {
	const deps = [];
	const regex = regEx(/^\s*(?<depName>[\d\w-]+):(?<currentValue>[^#\s]+)[#\s]*(?<comment>.*)$/);
	for (const line of content.split(newlineRegex)) {
		const match = regex.exec(line);
		if (match?.groups) {
			const { depName, currentValue, comment } = match.groups;
			const dep = getDependency({
				artifactId: depName,
				source: { version: currentValue },
				renovate: { ignore: isSkipComment(comment) }
			});
			deps.push(dep);
		}
	}
	return deps;
}
function extractPackageFile(content, packageFile) {
	logger.trace(`jenkins.extractPackageFile(${packageFile})`);
	const deps = [];
	if (YamlExtension.test(packageFile)) deps.push(...extractYaml(content, packageFile));
	else deps.push(...extractText(content));
	if (deps.length === 0) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map