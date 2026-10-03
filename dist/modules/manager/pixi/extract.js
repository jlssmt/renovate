import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, isHttpUrl, joinUrlParts } from "../../../util/url.js";
import { getSiblingFileName, localPathExists } from "../../../util/fs/index.js";
import { coerceNumber } from "../../../util/number.js";
import { Result } from "../../../util/result.js";
import { defaultRegistryUrl } from "../../datasource/conda/common.js";
import { PixiFile, PixiPyProject } from "./schema.js";
import { isString } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/manager/pixi/extract.ts
function getUserPixiConfig(content, packageFile) {
	if (packageFile === "pyproject.toml" || packageFile.endsWith("/pyproject.toml")) {
		const { val, err } = Result.parse(content, PixiPyProject).unwrap();
		if (err) {
			logger.debug({
				packageFile,
				err
			}, `error parsing ${packageFile}`);
			return null;
		}
		return val.tool?.pixi ?? null;
	}
	if (packageFile === "pixi.toml" || packageFile.endsWith("/pixi.toml")) {
		const { val, err } = Result.parse(content, PixiFile).unwrap();
		if (err) {
			logger.debug({
				packageFile,
				err
			}, `error parsing ${packageFile}`);
			return null;
		}
		return val;
	}
	const { val, err } = Result.parse(content, z.union([PixiFile, PixiPyProject.transform((p) => p.tool?.pixi)])).unwrap();
	if (err) {
		logger.debug({
			packageFile,
			err
		}, `error parsing ${packageFile}`);
		return null;
	}
	/* v8 ignore next -- a successful parse always yields a value */
	return val ?? null;
}
async function extractPackageFile(content, packageFile) {
	logger.trace(`pixi.extractPackageFile(${packageFile})`);
	const val = getUserPixiConfig(content, packageFile);
	if (!val) return null;
	const lockfileName = getSiblingFileName(packageFile, "pixi.lock");
	const lockFiles = [];
	if (await localPathExists(lockfileName)) lockFiles.push(lockfileName);
	const project = val.project;
	const channelPriority = project["channel-priority"];
	let registryStrategy;
	if (channelPriority === "disabled") registryStrategy = "merge";
	const conda = [];
	for (const item of val.conda) conda.push(addRegistryUrls({
		...item,
		channels: project.channels,
		registryStrategy
	}));
	for (const item of val.feature.conda) conda.push(addRegistryUrls({
		...item,
		registryStrategy,
		channels: [...coerceArray(item.channels), ...project.channels]
	}));
	return {
		lockFiles,
		deps: [
			conda,
			val.pypi,
			val.feature.pypi
		].flat()
	};
}
function addRegistryUrls(item) {
	const channels = orderChannels(item.channels);
	if (item.channel) return {
		...item,
		channels,
		registryUrls: [channelToRegistryUrl(item.channel)]
	};
	if (channels.length === 0) return {
		...item,
		channels,
		skipStage: "extract",
		skipReason: "unknown-registry"
	};
	const registryUrls = [];
	for (const channel of channels) registryUrls.push(channelToRegistryUrl(channel));
	return {
		...item,
		channels,
		registryUrls
	};
}
function channelToRegistryUrl(channel) {
	if (isHttpUrl(channel)) return ensureTrailingSlash(channel);
	return ensureTrailingSlash(joinUrlParts(defaultRegistryUrl, channel));
}
function orderChannels(channels = []) {
	return channels.map((channel, index) => {
		if (isString(channel)) return {
			channel,
			priority: 0,
			index
		};
		return {
			...channel,
			priority: coerceNumber(channel.priority),
			index
		};
	}).toSorted((a, b) => {
		if (a.priority !== b.priority) return b.priority - a.priority;
		return a.index - b.index;
	}).map((c) => c.channel);
}
//#endregion
export { extractPackageFile, getUserPixiConfig };

//# sourceMappingURL=extract.js.map