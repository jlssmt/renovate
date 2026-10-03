import { CONFIG_VALIDATION } from "../../../../../constants/error-messages.js";
import { regEx } from "../../../../../util/regex.js";
import { logger } from "../../../../../logger/index.js";
import { loadPackageJson } from "../../utils.js";
import { extractDependency, getExtractedConstraints, parseDepName } from "./dependency.js";
import { setNodeCommitTopic } from "./node.js";
import { extractOverrideDepsRec } from "./overrides.js";
import { isNonEmptyObject, isNonEmptyString, isNonEmptyStringAndNotWhitespace, isObject, isString } from "@sindresorhus/is";
import { parsePkgAndParentSelector } from "@pnpm/parse-overrides";
//#region lib/modules/manager/npm/extract/common/package-file.ts
function extractPackageJson(packageJson, packageFile) {
	logger.trace(`npm.extractPackageJson(${packageFile})`);
	const deps = [];
	if (packageJson._id && packageJson._args && packageJson._from) {
		logger.debug({ packageFile }, "Ignoring vendorised package.json");
		return null;
	}
	if (packageFile !== "package.json" && packageJson.renovate) {
		const error = new Error(CONFIG_VALIDATION);
		error.validationSource = packageFile;
		error.validationError = "Nested package.json must not contain Renovate configuration. Please use `packageRules` with `matchFileNames` in your main config instead.";
		throw error;
	}
	const packageJsonName = packageJson.name;
	logger.debug(`npm file ${packageFile} has name ${JSON.stringify(packageJsonName)}`);
	const packageFileVersion = packageJson.version;
	const depTypes = {
		dependencies: "dependency",
		devDependencies: "devDependency",
		optionalDependencies: "optionalDependency",
		peerDependencies: "peerDependency",
		engines: "engine",
		volta: "volta",
		resolutions: "resolutions",
		packageManager: "packageManager",
		overrides: "overrides",
		pnpm: "pnpm"
	};
	for (const depType of Object.keys(depTypes)) {
		let dependencies = packageJson[depType];
		if (dependencies) try {
			if (depType === "packageManager") {
				const match = regEx("^(?<name>.+)@(?<range>.+)$").exec(dependencies);
				/* v8 ignore next -- needs test */
				if (!match?.groups) break;
				dependencies = { [match.groups.name]: match.groups.range };
			}
			for (const [key, val] of Object.entries(dependencies)) {
				const depName = parseDepName(depType, key);
				let dep = {
					depType,
					depName
				};
				if (depName !== key) dep.managerData = { key };
				// v8 ignore else -- TODO: add test #40625
				if (depType === "overrides" && !isString(val)) deps.push(...extractOverrideDepsRec([depName], val));
				else if (depType === "pnpm" && depName === "overrides") {
					for (const [overridesKey, overridesVal] of Object.entries(val)) if (isString(overridesVal)) {
						const packageName = parsePkgAndParentSelector(overridesKey).targetPkg.name;
						dep = {
							depName: overridesKey,
							packageName,
							depType: "pnpm.overrides",
							...extractDependency(depName, packageName, overridesVal)
						};
						setNodeCommitTopic(dep);
						dep.prettyDepType = depTypes[depName];
						deps.push(dep);
					} else if (isObject(overridesVal)) deps.push(...extractOverrideDepsRec([overridesKey], overridesVal));
				} else {
					dep = {
						...dep,
						...extractDependency(depType, depName, val)
					};
					setNodeCommitTopic(dep);
					dep.prettyDepType = depTypes[depType];
					deps.push(dep);
				}
			}
		} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
			logger.debug({
				fileName: packageFile,
				depType,
				err
			}, "Error parsing package.json");
			return null;
		}
	}
	return {
		deps,
		extractedConstraints: getExtractedConstraints(deps),
		packageFileVersion,
		managerData: {
			packageJsonName,
			hasPackageManager: isNonEmptyStringAndNotWhitespace(packageJson.packageManager) || isNonEmptyObject(packageJson.devEngines?.packageManager),
			workspaces: packageJson.workspaces
		}
	};
}
async function hasPackageManager(packageJsonDir) {
	logger.trace(`npm.hasPackageManager from package.json`);
	const packageJsonResult = await loadPackageJson(packageJsonDir);
	return isNonEmptyString(packageJsonResult?.packageManager?.name) && isNonEmptyString(packageJsonResult?.packageManager?.version);
}
//#endregion
export { extractPackageJson, hasPackageManager };

//# sourceMappingURL=package-file.js.map