import { regEx } from "../../../util/regex.js";
import { minimatch } from "../../../util/minimatch.js";
import { logger } from "../../../logger/index.js";
import { readLocalDirectory } from "../../../util/fs/index.js";
import { HermitDatasource } from "../../datasource/hermit/index.js";
import upath from "upath";
//#region lib/modules/manager/hermit/extract.ts
const pkgReferenceRegex = regEx(`(?<packageName>.*?)-(?<version>[0-9]{1}.*)`);
/**
* extractPackageFile scans the folder of the package files
* and looking for .{packageName}-{version}.pkg
*/
async function extractPackageFile(_content, packageFile) {
	logger.trace(`hermit.extractPackageFile(${packageFile})`);
	const dependencies = [];
	const packages = await listHermitPackages(packageFile);
	if (!packages?.length) return null;
	for (const p of packages) {
		const version = p.Version === "" ? `@${p.Channel}` : p.Version;
		const dep = {
			datasource: HermitDatasource.id,
			depName: p.Name,
			currentValue: version
		};
		dependencies.push(dep);
	}
	return { deps: dependencies };
}
/**
* listHermitPackages will fetch all installed packages from the bin folder
*/
async function listHermitPackages(packageFile) {
	logger.trace("hermit.listHermitPackages()");
	const hermitFolder = upath.dirname(packageFile);
	let files = [];
	try {
		files = await readLocalDirectory(hermitFolder);
	} catch (err) {
		logger.debug({
			hermitFolder,
			err,
			packageFile
		}, "error listing hermit package references");
		return null;
	}
	logger.trace({
		files,
		hermitFolder
	}, "files for hermit package list");
	const out = [];
	for (const f of files) {
		if (!minimatch(".*.pkg").match(f)) continue;
		const fileName = f.replace(`${hermitFolder}/`, "").substring(1).replace(regEx(/\.pkg$/), "");
		const channelParts = fileName.split("@");
		if (channelParts.length > 1) out.push({
			Name: channelParts[0],
			Channel: channelParts[1],
			Version: ""
		});
		const groups = pkgReferenceRegex.exec(fileName)?.groups;
		if (!groups) {
			logger.debug({ fileName }, "invalid hermit package reference file name found");
			continue;
		}
		out.push({
			Name: groups.packageName,
			Version: groups.version,
			Channel: ""
		});
	}
	return out;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map