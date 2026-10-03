import { newlineRegex } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { api } from "../../versioning/rust-release-channel/index.js";
import { RustVersionDatasource } from "../../datasource/rust-version/index.js";
import { RustToolchain } from "./schema.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/manager/rust-toolchain/extract.ts
function extractPackageFile(content, packageFile) {
	logger.trace(`rust-toolchain.extractPackageFile(${packageFile})`);
	const parsedResult = RustToolchain.safeParse(content);
	if (parsedResult.success) {
		const { channel, path } = parsedResult.data.toolchain;
		if (isNonEmptyString(channel)) return { deps: [createDependency(channel)] };
		if (isNonEmptyString(path)) {
			logger.debug(`rust-toolchain.toml file at ${packageFile} uses a local path toolchain, which cannot be updated`);
			return { deps: [{
				...baseDependency(),
				skipReason: "path-dependency"
			}] };
		}
		logger.debug(`rust-toolchain.toml file at ${packageFile} has no toolchain channel or path specified`);
		return { deps: [{
			...baseDependency(),
			skipReason: "unspecified-version"
		}] };
	}
	if (packageFile.endsWith(".toml")) {
		logger.debug({
			err: parsedResult.error,
			packageFile
		}, "Failed to parse rust-toolchain.toml file");
		return null;
	}
	logger.trace({ packageFile }, "TOML parsing failed, trying legacy format");
	const lines = content.split(newlineRegex).map((l) => l.trim()).filter((l) => l.length > 0);
	if (lines.length !== 1) {
		logger.debug({ packageFile }, "rust-toolchain file is empty or contains multiple lines");
		return null;
	}
	return { deps: [createDependency(lines[0])] };
}
function baseDependency() {
	return {
		depName: "rust",
		depType: "toolchain",
		datasource: RustVersionDatasource.id
	};
}
function createDependency(channel) {
	const dep = {
		...baseDependency(),
		currentValue: channel
	};
	if (!api.isValid(channel)) {
		logger.debug(`Unsupported rust-toolchain channel value "${channel}"`);
		dep.skipReason = "invalid-version";
	}
	return dep;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map