import { DartDatasource } from "../../datasource/dart/index.js";
import { DartVersionDatasource } from "../../datasource/dart-version/index.js";
import { FlutterVersionDatasource } from "../../datasource/flutter-version/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { parsePubspec } from "./utils.js";
import { isObject, isString } from "@sindresorhus/is";
//#region lib/modules/manager/pub/extract.ts
function extractFromSection(pubspec, sectionKey) {
	const sectionContent = pubspec[sectionKey];
	if (!sectionContent) return [];
	const skippedPackages = [
		"flutter_driver",
		"flutter_localizations",
		"flutter_test",
		"flutter_web_plugins",
		"meta"
	];
	const deps = [];
	for (const depName of Object.keys(sectionContent)) {
		if (skippedPackages.includes(depName)) continue;
		let currentValue = sectionContent[depName];
		let skipReason;
		let registryUrls;
		let gitUrl;
		if (!isString(currentValue)) {
			const version = currentValue.version;
			const path = currentValue.path;
			const hosted = currentValue.hosted;
			const git = currentValue.git;
			if (isString(hosted)) registryUrls = [hosted];
			else if (isString(hosted?.url)) registryUrls = [hosted.url];
			if (isObject(git)) gitUrl = git?.url;
			else if (isString(git)) gitUrl = git;
			if (version) currentValue = version;
			else if (path) {
				currentValue = "";
				skipReason = "path-dependency";
			} else if (isObject(git) && isString(git?.ref)) currentValue = git.ref;
			else if (isObject(git) && !isString(git?.ref) && !isString(version)) {
				currentValue = "";
				skipReason = "unspecified-version";
			} else currentValue = "";
		}
		if (gitUrl === void 0) deps.push({
			depName,
			depType: sectionKey,
			currentValue,
			datasource: DartDatasource.id,
			...registryUrls && { registryUrls },
			skipReason
		});
		else deps.push({
			depName,
			depType: sectionKey,
			packageName: gitUrl,
			datasource: GitRefsDatasource.id,
			currentValue,
			skipReason
		});
	}
	return deps;
}
function extractDart(pubspec) {
	return [{
		depName: "dart",
		currentValue: pubspec.environment.sdk,
		datasource: DartVersionDatasource.id
	}];
}
function extractFlutter(pubspec) {
	const currentValue = pubspec.environment.flutter;
	if (!currentValue) return [];
	return [{
		depName: "flutter",
		currentValue,
		datasource: FlutterVersionDatasource.id
	}];
}
function extractConstraints(pubspec) {
	const extractedConstraints = { dart: pubspec.environment.sdk };
	if (pubspec.environment.flutter) extractedConstraints.flutter = pubspec.environment.flutter;
	return extractedConstraints;
}
function extractPackageFile(content, packageFile) {
	const pubspec = parsePubspec(packageFile, content);
	if (!pubspec) return null;
	return {
		deps: [
			...extractFromSection(pubspec, "dependencies"),
			...extractFromSection(pubspec, "dev_dependencies"),
			...extractDart(pubspec),
			...extractFlutter(pubspec)
		],
		extractedConstraints: extractConstraints(pubspec)
	};
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map