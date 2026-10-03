import { regEx } from "../../../util/regex.js";
import { id } from "../../versioning/maven/index.js";
import { get } from "../../versioning/index.js";
//#region lib/modules/manager/sbt/util.ts
function normalizeScalaVersion(str) {
	// istanbul ignore if
	if (!str) return str;
	const versioning = get(id);
	if (versioning.isVersion(str)) {
		if (!versioning.isStable(str)) return str;
		if (!versioning.isGreaterThan(str, "2.10.0")) return str;
	}
	const isScala3 = versioning.isGreaterThan(str, "3.0.0");
	if (regEx(/^\d+\.\d+\.\d+$/).test(str)) {
		if (isScala3) return str.replace(regEx(/^(?<major>\d+)\.(?<minor>\d+)\.\d+$/), "$<major>");
		return str.replace(regEx(/^(?<major>\d+)\.(?<minor>\d+)\.\d+$/), "$<major>.$<minor>");
	}
	// istanbul ignore next
	return str;
}
function sortPackageFiles(packageFiles) {
	const sortedPackageFiles = [...packageFiles];
	const buildSbtIndex = sortedPackageFiles.findIndex((file) => file.endsWith("build.sbt"));
	if (buildSbtIndex !== -1) {
		const buildSbt = sortedPackageFiles.splice(buildSbtIndex, 1)[0];
		sortedPackageFiles.unshift(buildSbt);
	}
	return sortedPackageFiles;
}
//#endregion
export { normalizeScalaVersion, sortPackageFiles };

//# sourceMappingURL=util.js.map