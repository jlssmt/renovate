import { logger } from "../../../logger/index.js";
import { massage } from "../../../util/toml.js";
import { getSiblingFileName, localPathExists, readLocalFile } from "../../../util/fs/index.js";
import { filterMap } from "../../../util/filter-map.js";
import { Result } from "../../../util/result.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { Lockfile, PoetryPyProject } from "./schema.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/manager/poetry/extract.ts
async function extractPackageFile(content, packageFile) {
	logger.trace(`poetry.extractPackageFile(${packageFile})`);
	const { val: res, err } = Result.parse(massage(content), PoetryPyProject.transform(({ packageFileContent }) => packageFileContent)).unwrap();
	if (err) {
		logger.debug({
			packageFile,
			err
		}, `Poetry: error parsing pyproject.toml`);
		return null;
	}
	const lockfileName = getSiblingFileName(packageFile, "poetry.lock");
	const lockContents = await readLocalFile(lockfileName, "utf8");
	const lockfileMapping = Result.parse(lockContents, Lockfile.transform(({ lock }) => lock)).unwrapOr({});
	let pythonVersion;
	filterMap(res.deps, (dep) => {
		if (dep.depName === "python") {
			// v8 ignore else -- a python dep always carries a current value
			if (dep.currentValue) pythonVersion = dep.currentValue;
			return {
				...dep,
				packageName: "containerbase/python-prebuild",
				datasource: GithubReleasesDatasource.id,
				commitMessageTopic: "Python",
				registryUrls: null
			};
		}
		const packageName = dep.packageName ?? dep.depName;
		if (packageName && packageName in lockfileMapping) dep.lockedVersion = lockfileMapping[packageName];
		return dep;
	});
	if (!res.deps.length) return null;
	const extractedConstraints = {};
	if (isNonEmptyString(pythonVersion)) extractedConstraints.python = pythonVersion;
	res.extractedConstraints = extractedConstraints;
	let lockFile = getSiblingFileName(packageFile, "poetry.lock");
	// istanbul ignore next
	if (await localPathExists(lockFile)) res.lockFiles = [lockFile];
	else {
		lockFile = getSiblingFileName(packageFile, "pyproject.lock");
		if (await localPathExists(lockFile)) res.lockFiles = [lockFile];
	}
	return res;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map