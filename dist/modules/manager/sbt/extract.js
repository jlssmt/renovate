import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { id } from "../../versioning/semver/index.js";
import { id as id$1 } from "../../versioning/maven/index.js";
import { get } from "../../versioning/index.js";
import { MAVEN_REPO } from "../../datasource/maven/common.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { SbtPackageDatasource } from "../../datasource/sbt-package/index.js";
import { SBT_PLUGINS_REPO, SbtPluginDatasource } from "../../datasource/sbt-plugin/index.js";
import { normalizeScalaVersion, sortPackageFiles } from "./util.js";
import { lang, query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/sbt/extract.ts
const scala = lang.createLang("scala");
const sbtVersionRegex = regEx("sbt\\.version *= *(?<version>\\d+\\.\\d+\\.\\d+)");
const sbtProxyUrlRegex = regEx(/^\s*(?<repoName>\S+):\s+(?<proxy>https?:\/\/[\w./-]+)/);
const scalaVersionMatch = query.sym("scalaVersion").op(":=").alt(query.sym((ctx, { value: currentVarName }) => ({
	...ctx,
	currentVarName
})).op(".").sym((ctx, { value: varName }) => {
	const dottedVariableName = `${ctx.currentVarName}.${varName}`;
	const currentValue = ctx.vars[dottedVariableName];
	if (currentValue) ctx.scalaVersion = currentValue;
	delete ctx.currentVarName;
	return ctx;
}), query.sym((ctx, { value: varName }) => {
	const scalaVersion = ctx.vars[varName];
	if (scalaVersion) ctx.scalaVersion = scalaVersion;
	return ctx;
}), query.str((ctx, { value: scalaVersion }) => ({
	...ctx,
	scalaVersion
}))).handler((ctx) => {
	if (ctx.scalaVersion) {
		const version = get(id$1);
		let packageName = "org.scala-lang:scala-library";
		if (version.getMajor(ctx.scalaVersion) === 3) packageName = "org.scala-lang:scala3-library_3";
		const dep = {
			datasource: MavenDatasource.id,
			depName: "scala",
			packageName,
			currentValue: ctx.scalaVersion,
			separateMinorPatch: true
		};
		ctx.scalaVersion = normalizeScalaVersion(ctx.scalaVersion);
		ctx.deps.push(dep);
	}
	return ctx;
});
const packageFileVersionMatch = query.sym("version").op(":=").alt(query.str((ctx, { value: packageFileVersion }) => ({
	...ctx,
	packageFileVersion
})), query.sym((ctx, { value: varName }) => {
	const packageFileVersion = ctx.vars[varName];
	if (packageFileVersion) ctx.packageFileVersion = packageFileVersion;
	return ctx;
}));
const variableNameMatch = query.sym((ctx, { value: varName }) => ({
	...ctx,
	currentVarName: varName
})).opt(query.op(":").sym("String"));
const variableValueMatch = query.str((ctx, { value }) => {
	ctx.vars[ctx.currentVarName] = value;
	delete ctx.currentVarName;
	return ctx;
});
const assignmentMatch = query.sym("val").join(variableNameMatch).op("=");
const variableDefinitionMatch = query.alt(query.sym("lazy").join(assignmentMatch), assignmentMatch, variableNameMatch.op(":=")).join(variableValueMatch);
const objectFieldMatch = query.sym((ctx, { value: fieldName }) => ({
	...ctx,
	currentVarName: `${ctx.currentObjectName}.${fieldName}`
})).op("=").str((ctx, { value }) => {
	ctx.vars[ctx.currentVarName] = value;
	delete ctx.currentVarName;
	return ctx;
});
const objectAssignmentMatch = query.sym("val").sym((ctx, { value: currentObjectName }) => ({
	...ctx,
	currentObjectName
})).op("=").sym("new").tree({ search: query.many(objectFieldMatch) }).handler((ctx) => {
	delete ctx.currentObjectName;
	return ctx;
});
const groupIdMatch = query.alt(query.sym((ctx, { value: varName }) => {
	const currentGroupId = ctx.vars[varName];
	if (currentGroupId) ctx.groupId = currentGroupId;
	return ctx;
}), query.str((ctx, { value: groupId }) => ({
	...ctx,
	groupId
})));
const artifactIdMatch = query.alt(query.sym((ctx, { value }) => {
	const artifactId = ctx.vars[value];
	if (artifactId) ctx.artifactId = artifactId;
	return ctx;
}), query.str((ctx, { value: artifactId }) => ({
	...ctx,
	artifactId
})));
const versionMatch = query.alt(query.sym((ctx, { value: currentVarName }) => ({
	...ctx,
	currentVarName
})).op(".").sym((ctx, { value: varName }) => {
	const dottedVariableName = `${ctx.currentVarName}.${varName}`;
	const currentValue = ctx.vars[dottedVariableName];
	if (currentValue) {
		ctx.currentValue = currentValue;
		ctx.variableName = dottedVariableName;
	}
	delete ctx.currentVarName;
	return ctx;
}), query.sym((ctx, { value: varName }) => {
	const currentValue = ctx.vars[varName];
	if (currentValue) {
		ctx.currentValue = currentValue;
		ctx.variableName = varName;
	}
	return ctx;
}), query.str((ctx, { value: currentValue }) => ({
	...ctx,
	currentValue
})));
const simpleDependencyMatch = groupIdMatch.op("%").join(artifactIdMatch).op("%").join(versionMatch);
const versionedDependencyMatch = groupIdMatch.op("%%").join(artifactIdMatch).handler((ctx) => ({
	...ctx,
	useScalaVersion: true
})).op("%").join(versionMatch);
const crossDependencyMatch = groupIdMatch.op("%%%").join(artifactIdMatch).handler((ctx) => ({
	...ctx,
	useScalaVersion: true
})).op("%").join(versionMatch);
function depHandler(ctx) {
	const { scalaVersion, groupId, artifactId, currentValue, useScalaVersion, depType, variableName } = ctx;
	delete ctx.groupId;
	delete ctx.artifactId;
	delete ctx.currentValue;
	delete ctx.useScalaVersion;
	delete ctx.depType;
	delete ctx.variableName;
	const depName = `${groupId}:${artifactId}`;
	const dep = {
		datasource: SbtPackageDatasource.id,
		depName,
		packageName: scalaVersion && useScalaVersion ? `${depName}_${scalaVersion}` : depName,
		currentValue
	};
	if (depType) dep.depType = depType;
	if (depType === "plugin") dep.datasource = SbtPluginDatasource.id;
	if (variableName) {
		dep.sharedVariableName = variableName;
		dep.variableName = variableName;
	}
	ctx.deps.push(dep);
	return ctx;
}
function depTypeHandler(ctx, { value: depType }) {
	return {
		...ctx,
		depType
	};
}
const sbtPackageMatch = query.opt(query.opt(query.sym("lazy")).sym("val").sym().op("=")).alt(crossDependencyMatch, simpleDependencyMatch, versionedDependencyMatch).opt(query.alt(query.sym("classifier").str(depTypeHandler), query.op("%").sym(depTypeHandler), query.op("%").str(depTypeHandler))).handler(depHandler);
const sbtPluginMatch = query.sym(regEx(/^(?:addSbtPlugin|addCompilerPlugin)$/)).tree({
	type: "wrapped-tree",
	maxDepth: 1,
	search: query.begin().alt(simpleDependencyMatch, versionedDependencyMatch).end()
}).handler((ctx) => ({
	...ctx,
	depType: "plugin"
})).handler(depHandler);
const resolverMatch = query.str().sym("at").str((ctx, { value }) => {
	if (parseUrl(value)) ctx.registryUrls.push(value);
	return ctx;
});
const addResolverMatch = query.sym("resolvers").alt(query.op("+=").join(resolverMatch), query.op("++=").sym("Seq").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	search: resolverMatch
}));
function registryUrlHandler(ctx) {
	for (const dep of ctx.deps) dep.registryUrls = [...ctx.registryUrls];
	return ctx;
}
const query$1 = query.tree({
	type: "root-tree",
	maxDepth: 32,
	search: query.alt(scalaVersionMatch, packageFileVersionMatch, sbtPackageMatch, sbtPluginMatch, addResolverMatch, variableDefinitionMatch, objectAssignmentMatch),
	postHandler: registryUrlHandler
});
function extractProxyUrls(content, packageFile) {
	const extractedProxyUrls = [];
	logger.debug(`Parsing proxy repository file ${packageFile}`);
	for (const line of content.split(newlineRegex)) {
		const extraction = sbtProxyUrlRegex.exec(line);
		if (extraction?.groups?.proxy) extractedProxyUrls.push(extraction.groups.proxy);
		else if (line.trim() === "maven-central") extractedProxyUrls.push(MAVEN_REPO);
	}
	return extractedProxyUrls;
}
function extractPackageFile(content, packageFile) {
	return extractPackageFileInternal(content, packageFile);
}
function extractPackageFileInternal(content, packageFile, ctxScalaVersion) {
	if (packageFile === "project/build.properties" || packageFile.endsWith("/project/build.properties")) {
		const regexResult = sbtVersionRegex.exec(content);
		const sbtVersion = regexResult?.groups?.version;
		const matchString = regexResult?.[0];
		if (sbtVersion) return { deps: [{
			datasource: GithubReleasesDatasource.id,
			depName: "sbt/sbt",
			packageName: "sbt/sbt",
			versioning: id,
			currentValue: sbtVersion,
			replaceString: matchString,
			extractVersion: "^v(?<version>\\S+)",
			registryUrls: []
		}] };
		return null;
	}
	let parsedResult = null;
	try {
		parsedResult = scala.query(content, query$1, {
			vars: {},
			deps: [],
			registryUrls: [],
			scalaVersion: ctxScalaVersion
		});
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Sbt parsing error");
	}
	if (!parsedResult) return null;
	const { deps, scalaVersion, packageFileVersion } = parsedResult;
	if (!deps.length) return null;
	return {
		deps,
		packageFileVersion,
		managerData: { scalaVersion }
	};
}
async function extractAllPackageFiles(_config, packageFiles) {
	const packages = [];
	const proxyUrls = [];
	let ctxScalaVersion;
	const sortedPackageFiles = sortPackageFiles(packageFiles);
	for (const packageFile of sortedPackageFiles) {
		const content = await readLocalFile(packageFile, "utf8");
		if (!content) {
			logger.debug({ packageFile }, "packageFile has no content");
			continue;
		}
		if (packageFile === "repositories") {
			const urls = extractProxyUrls(content, packageFile);
			proxyUrls.push(...urls);
		} else {
			const pkg = extractPackageFileInternal(content, packageFile, ctxScalaVersion);
			if (pkg) {
				packages.push({
					deps: pkg.deps,
					packageFile
				});
				if (pkg.managerData?.scalaVersion) ctxScalaVersion = pkg.managerData.scalaVersion;
			}
		}
	}
	for (const pkg of packages) for (const dep of pkg.deps) if (dep.datasource !== GithubReleasesDatasource.id) {
		if (proxyUrls.length > 0) dep.registryUrls.unshift(...proxyUrls);
		else if (dep.depType === "plugin") dep.registryUrls.unshift(SBT_PLUGINS_REPO, MAVEN_REPO);
		else dep.registryUrls.unshift(MAVEN_REPO);
	}
	return packages;
}
//#endregion
export { extractAllPackageFiles, extractPackageFile, extractProxyUrls };

//# sourceMappingURL=extract.js.map