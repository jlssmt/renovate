import { pkg } from "../../expose.js";
import { regEx } from "../regex.js";
import { GlobalConfig } from "../../config/global.js";
import { toArray } from "../array.js";
import { logger } from "../../logger/index.js";
import { getChildEnv } from "../exec/utils.js";
import { isArray, isNumber, isPlainObject, isPrimitive, isString } from "@sindresorhus/is";
import handlebars from "handlebars";
//#region lib/util/template/index.ts
const helpers = {
	encodeURIComponent,
	decodeURIComponent,
	encodeBase64: (str) => Buffer.from(str ?? "").toString("base64"),
	decodeBase64: (str) => Buffer.from(str ?? "", "base64").toString(),
	stringToPrettyJSON: (input) => JSON.stringify(JSON.parse(input), null, 2),
	toJSON: (input) => JSON.stringify(input),
	toArray: (...args) => {
		args.pop();
		return args;
	},
	toObject: (...args) => {
		args.pop();
		if (args.length % 2 !== 0) throw new Error(`Must contain an even number of elements`);
		const keys = args.filter((_, index) => index % 2 === 0);
		const values = args.filter((_, index) => index % 2 === 1);
		return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
	},
	replace: (find, replace, context) => (context ?? "").replace(regEx(find, "g"), replace),
	lowercase: (str) => str?.toLowerCase(),
	uppercase: (str) => str?.toUpperCase(),
	containsString: (str, subStr) => str?.includes(subStr),
	equals: (arg1, arg2) => arg1 === arg2,
	includes: (arg1, arg2) => {
		if (isArray(arg1, isString) && isString(arg2)) return arg1.includes(arg2);
		return false;
	},
	split: (str, separator) => {
		if (isString(str) && isString(separator)) return str.split(separator);
		return [];
	},
	and: (...args) => {
		args.pop();
		return args.every(Boolean);
	},
	or: (...args) => {
		args.pop();
		return args.some(Boolean);
	},
	lookupArray: (obj, key, options) => {
		return toArray(obj).filter((element) => !handlebars.Utils.isEmpty(element)).map((element) => options.lookupProperty(element, key)).filter((value) => value !== void 0);
	},
	distinct: (obj) => {
		const seen = /* @__PURE__ */ new Set();
		return toArray(obj).filter((value) => {
			const str = JSON.stringify(value);
			if (seen.has(str)) return false;
			seen.add(str);
			return true;
		});
	},
	add: (a, b) => {
		if (isNumber(a) && isNumber(b)) return a + b;
		throw new Error("add: inputs are not valid");
	}
};
for (const [name, fn] of Object.entries(helpers)) handlebars.registerHelper(name, fn);
Object.keys(helpers);
/**
* Config options whose **values** are exposed as template variables.
* e.g. `groupName` is in this list because you can write `{{groupName}}` inside a template.
* This is distinct from `supportsTemplating`, which marks options whose values
* are themselves *compiled* as Handlebars templates via `template.compile()`.
*/
const exposedConfigOptions = [
	"additionalBranchPrefix",
	"addLabels",
	"allowedVersions",
	"branchName",
	"branchPrefix",
	"branchTopic",
	"commitBody",
	"commitMessage",
	"commitMessageAction",
	"commitMessageExtra",
	"commitMessagePrefix",
	"commitMessageSuffix",
	"commitMessageTopic",
	"gitAuthor",
	"group",
	"groupName",
	"groupSlug",
	"labels",
	"prBodyColumns",
	"prBodyDefinitions",
	"prBodyNotes",
	"prTitle",
	"semanticCommitScope",
	"semanticCommitType",
	"separateMajorMinor",
	"separateMinorPatch",
	"separateMultipleMinor",
	"sourceDirectory"
];
/**
* Runtime-generated fields available as template variables.
* These are not config options — they are computed during Renovate's run
* (e.g. `depName`, `newVersion`, `isMajor`) and made available in templates.
*/
const allowedFields = {
	baseBranch: "The baseBranch for this branch/PR",
	body: "The body of the release notes",
	categories: "The categories of the manager of the dependency being updated",
	currentValue: "The extracted current value of the dependency being updated",
	currentVersion: "The version that would be currently installed. For example, if currentValue is ^3.0.0 then currentVersion might be 3.1.0.",
	currentVersionAgeInDays: "The age of the current version in days",
	currentVersionTimestamp: "The timestamp of the current version",
	currentDigest: "The extracted current digest of the dependency being updated",
	currentDigestShort: "The extracted current short digest of the dependency being updated",
	datasource: "The datasource used to look up the upgrade",
	depName: "The name of the dependency being updated",
	depNameLinked: "The dependency name already linked to its home page using markdown",
	depNameSanitized: "The depName field sanitized for use in branches after removing spaces and special characters",
	depType: "The dependency type (if extracted - manager-dependent)",
	depTypes: "A deduplicated array of dependency types (if extracted - manager-dependent) in a branch",
	displayFrom: "The current value, formatted for display",
	displayPending: "Latest pending update, if internalChecksFilter is in use",
	displayTo: "The to value, formatted for display",
	hasReleaseNotes: "true if the upgrade has release notes",
	indentation: "The indentation of the dependency being updated",
	isGroup: "true if the upgrade is part of a group",
	isLockfileUpdate: "true if the branch is a lock file update",
	isMajor: "true if the upgrade is major",
	isMinor: "true if the upgrade is minor",
	isPatch: "true if the upgrade is a patch upgrade",
	isPin: "true if the upgrade is pinning dependencies",
	isPinDigest: "true if the upgrade is pinning digests",
	isRollback: "true if the upgrade is a rollback PR",
	isReplacement: "true if the upgrade is a replacement",
	isRange: "true if the new value is a range",
	isSingleVersion: "true if the upgrade is to a single version rather than a range",
	isVulnerabilityAlert: "true if the upgrade is a vulnerability alert",
	logJSON: "ChangeLogResult object for the upgrade",
	manager: "The (package) manager which detected the dependency",
	newDigest: "The new digest value",
	newDigestShort: "A shortened version of newDigest, for use when the full digest is too long to be conveniently displayed",
	newMajor: "The major version of the new version. e.g. \"3\" if the new version is \"3.1.0\"",
	newMinor: "The minor version of the new version. e.g. \"1\" if the new version is \"3.1.0\"",
	newPatch: "The patch version of the new version. e.g. \"0\" if the new version is \"3.1.0\"",
	newName: "The name of the new dependency that replaces the current deprecated dependency",
	newNameLinked: "The new dependency name already linked to its home page using markdown",
	newValue: "The new value in the upgrade. Can be a range or version e.g. \"^3.0.0\" or \"3.1.0\"",
	newVersion: "The new version in the upgrade, e.g. \"3.1.0\"",
	newVersionAgeInDays: "The age of the new version in days",
	major: "The major version of the current version. e.g. \"3\" if the current version is \"3.1.0\"",
	minor: "The minor version of the current version. e.g. \"1\" if the current version is \"3.1.0\"",
	patch: "The patch version of the current version. e.g. \"0\" if the current version is \"3.1.0\"",
	packageFile: "The filename that the dependency was found in",
	packageFileDir: "The directory with full path where the packageFile was found",
	packageName: "The full name that was used to look up the dependency",
	packageScope: "The scope of the package name. Supports Maven group ID only",
	parentDir: "The name of the directory that the dependency was found in, without full path",
	parentOrg: "The name of the parent organization for the current repository",
	platform: "VCS platform in use, e.g. \"github\", \"gitlab\", etc.",
	prettyDepType: "Massaged depType",
	prettyNewMajor: "The new major value with v prepended to it.",
	prettyNewVersion: "The new version value with v prepended to it.",
	project: "ChangeLogProject object",
	recreateClosed: "If true, this PR will be recreated if closed",
	references: "A list of references for the upgrade",
	releases: "An array of releases for an upgrade",
	releaseNotes: "A ChangeLogNotes object for the release",
	releaseTimestamp: "The timestamp of the release",
	renovateVersion: "The currently running Renovate version.",
	repository: "The current repository",
	semanticPrefix: "The fully generated semantic prefix for commit messages",
	sourceRepo: "The repository in the sourceUrl, if present",
	sourceRepoName: "The repository name in the sourceUrl, if present",
	sourceRepoOrg: "The repository organization in the sourceUrl, if present",
	sourceRepoSlug: "The slugified pathname of the sourceUrl, if present",
	sourceUrl: "The source URL for the package",
	topLevelOrg: "The name of the top-level organization for the current repository",
	updateType: "One of digest, pin, rollback, patch, minor, major, replacement, pinDigest",
	upgrades: "An array of upgrade objects in the branch",
	url: "The url of the release notes",
	version: "The version number of the changelog",
	versioning: "The versioning scheme in use",
	versions: "An array of ChangeLogRelease objects in the upgrade",
	vulnerabilitySeverity: "The severity for a vulnerability alert upgrade (LOW, MEDIUM, MODERATE, HIGH, CRITICAL, UNKNOWN)"
};
/**
* The complete set of field names that may be referenced inside a Handlebars template.
* Union of runtime fields (`allowedFields`) and config options (`exposedConfigOptions`).
* Used by the compile proxy to warn on unknown variable references.
*/
const allowedTemplateFields = /* @__PURE__ */ new Set([...Object.keys(allowedFields), ...exposedConfigOptions]);
var CompileInputProxyHandler = class {
	warnVariables;
	constructor(warnVariables) {
		this.warnVariables = warnVariables;
	}
	get(target, prop) {
		if (prop === "env") return target[prop];
		if (!allowedTemplateFields.has(prop)) {
			this.warnVariables.add(prop);
			return;
		}
		const value = target[prop];
		if (prop === "prBodyDefinitions") return value;
		if (isArray(value)) return value.map((element) => isPrimitive(element) ? element : proxyCompileInput(element, this.warnVariables));
		if (isPlainObject(value)) return proxyCompileInput(value, this.warnVariables);
		return value;
	}
};
function proxyCompileInput(input, warnVariables) {
	return new Proxy(input, new CompileInputProxyHandler(warnVariables));
}
function compile(template, input, filterFields = true) {
	const env = getChildEnv({});
	const data = {
		...GlobalConfig.get(),
		renovateVersion: pkg.version,
		...input,
		env
	};
	const warnVariables = /* @__PURE__ */ new Set();
	const filteredInput = filterFields ? proxyCompileInput(data, warnVariables) : data;
	logger.trace({
		template,
		filteredInput
	}, "Compiling template");
	const result = handlebars.compile(template, { noEscape: true })(filteredInput);
	if (warnVariables.size > 0) logger.info({
		varNames: Array.from(warnVariables),
		template
	}, "Disallowed variable names in template");
	return result;
}
function safeCompile(template, input, filterFields = true) {
	try {
		return compile(template, input, filterFields);
	} catch (err) {
		logger.warn({
			err,
			template
		}, "Error compiling template");
		return "";
	}
}
/**
* Validate that the template is a valid Handlebars template string.
*
* NOTE: Does not validate that fields are set to valid field names.
*/
function validate(template) {
	handlebars.parse(template);
}
//#endregion
export { allowedFields, compile, exposedConfigOptions, proxyCompileInput, safeCompile, validate };

//# sourceMappingURL=index.js.map