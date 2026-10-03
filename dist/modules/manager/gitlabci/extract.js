import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseYaml } from "../../../util/yaml.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { id } from "../../versioning/semver-partial/index.js";
import { Result } from "../../../util/result.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { GitlabDocument, Job, Jobs, MultiDocumentLocalIncludes } from "./schema.js";
import { getGitlabDep } from "./utils.js";
//#region lib/modules/manager/gitlabci/extract.ts
const componentReferenceRegex = regEx(/(?<fqdn>[^/]+)\/(?<projectPath>.+)\/(?:.+)@(?<specificVersion>.+)/);
function extractDepFromIncludeComponent(component, registryAliases) {
	let componentUrl = component;
	if (registryAliases) for (const key in registryAliases) componentUrl = componentUrl.replace(key, registryAliases[key]);
	const componentReference = componentReferenceRegex.exec(componentUrl)?.groups;
	if (!componentReference) {
		logger.debug({ componentReference: componentUrl }, "Ignoring malformed component reference");
		return null;
	}
	if (componentReference.projectPath.split("/").length < 2) {
		logger.debug({ componentReference: componentUrl }, "Ignoring component reference with incomplete project path");
		return null;
	}
	return {
		datasource: GitlabTagsDatasource.id,
		depName: componentReference.projectPath,
		depType: "repository",
		currentValue: componentReference.specificVersion,
		registryUrls: [`https://${componentReference.fqdn}`],
		versioning: id
	};
}
function extractPackageFile(content, packageFile, config) {
	const deps = [];
	try {
		const docs = parseYaml(content, { uniqueKeys: false });
		for (const doc of docs) {
			const topLevel = Job.parse(doc);
			const jobs = Jobs.parse(doc);
			for (const job of [topLevel, ...jobs]) {
				const { image, services } = job;
				if (image) {
					const dep = getGitlabDep(image.value, config.registryAliases);
					dep.depType = image.type;
					deps.push(dep);
				}
				for (const service of services) {
					const dep = getGitlabDep(service, config.registryAliases);
					dep.depType = "service-image";
					deps.push(dep);
				}
			}
			const includedComponents = GitlabDocument.parse(doc);
			for (const includedComponent of includedComponents) {
				const dep = extractDepFromIncludeComponent(includedComponent, config.registryAliases);
				if (dep) deps.push(dep);
			}
		}
	} catch (err) /* istanbul ignore next */ {
		if (err.stack?.startsWith("YAMLException:")) logger.debug({
			err,
			packageFile
		}, "YAML exception extracting GitLab CI includes");
		else logger.debug({
			err,
			packageFile
		}, "Error extracting GitLab CI dependencies");
	}
	return deps.length ? { deps } : null;
}
async function extractAllPackageFiles(config, packageFiles) {
	const filesToExamine = [...packageFiles];
	const seen = new Set(packageFiles);
	const results = [];
	while (filesToExamine.length > 0) {
		const file = filesToExamine.pop();
		const content = await readLocalFile(file, "utf8");
		if (!content) {
			logger.debug({ packageFile: file }, `Empty or non existent gitlabci file`);
			continue;
		}
		const { val: docs, err } = Result.wrap(() => parseYaml(content, { uniqueKeys: false })).unwrap();
		if (err) {
			logger.debug({
				err,
				packageFile: file
			}, "Error extracting GitLab CI dependencies");
			continue;
		}
		const localIncludes = MultiDocumentLocalIncludes.parse(docs);
		for (const file of localIncludes) if (!seen.has(file)) {
			seen.add(file);
			filesToExamine.push(file);
		}
		const result = extractPackageFile(content, file, config);
		// v8 ignore else -- needs a listed file that yields no deps
		if (result !== null) results.push({
			packageFile: file,
			deps: result.deps
		});
	}
	logger.trace({
		packageFiles,
		files: filesToExamine.entries()
	}, "extracted all GitLab CI files");
	if (!results.length) return null;
	return results;
}
//#endregion
export { extractAllPackageFiles, extractPackageFile };

//# sourceMappingURL=extract.js.map