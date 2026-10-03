import { SYSTEM_INSUFFICIENT_MEMORY } from "../../../constants/error-messages.js";
import { newlineRegex, regEx } from "../../regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { coerceArray } from "../../array.js";
import { logger } from "../../../logger/index.js";
import { isCommandWithOptions } from "../utils.js";
import { rawExec } from "../common.js";
import { uniq } from "../../uniq.js";
import { isNonEmptyString, isString, isTruthy } from "@sindresorhus/is";
import { join, quote } from "shlex";
//#region lib/util/exec/docker/index.ts
const prefetchedImages = /* @__PURE__ */ new Map();
const digestRegex = regEx("Digest: (.*?)\n");
const sideCarName = "sidecar";
async function prefetchDockerImage(taggedImage) {
	if (prefetchedImages.has(taggedImage)) logger.debug(`Docker image is already prefetched: ${taggedImage}@${prefetchedImages.get(taggedImage)}`);
	else {
		logger.debug(`Fetching Docker image: ${taggedImage}`);
		const res = await rawExec(`docker pull ${taggedImage}`, {});
		const imageDigest = digestRegex.exec(res?.stdout)?.[1] ?? "unknown";
		logger.debug(`Finished fetching Docker image ${taggedImage}@${imageDigest}`);
		prefetchedImages.set(taggedImage, imageDigest);
	}
}
function expandVolumeOption(x) {
	if (isNonEmptyString(x)) return [x, x];
	if (Array.isArray(x) && x.length === 2) {
		const [from, to] = x;
		// v8 ignore else -- TODO: add test #40625
		if (isNonEmptyString(from) && isNonEmptyString(to)) return [from, to];
	}
	return null;
}
function volumesEql(x, y) {
	const [xFrom, xTo] = x;
	const [yFrom, yTo] = y;
	return xFrom === yFrom && xTo === yTo;
}
function prepareVolumes(volumes) {
	const filtered = volumes.map(expandVolumeOption).filter((vol) => vol !== null);
	return uniq(filtered, volumesEql).map(([from, to]) => `-v "${from}":"${to}"`);
}
function getContainerName(name, prefix) {
	return `${prefix ?? "renovate_"}${name}`.replace(regEx(/\//g), "_");
}
function getContainerLabel(prefix) {
	return `${prefix ?? "renovate_"}child`;
}
async function removeDockerContainer(image, prefix) {
	const containerName = getContainerName(sideCarName, prefix);
	let cmd = `docker ps --filter name=${containerName} -aq`;
	try {
		const containerId = (await rawExec(cmd, {}))?.stdout?.trim() || "";
		if (containerId.length) {
			logger.debug(`Removing container with ID: ${containerId}`);
			cmd = `docker rm -f ${containerId}`;
			await rawExec(cmd, {});
		} else logger.trace({
			image,
			containerName
		}, "No running containers to remove");
	} catch (err) {
		logger.warn({
			image,
			containerName,
			cmd,
			err
		}, "Could not remove Docker container");
	}
}
async function removeDanglingContainers() {
	if (GlobalConfig.get("binarySource") !== "docker") return;
	try {
		const containerLabel = getContainerLabel(GlobalConfig.get("dockerChildPrefix"));
		logger.debug(`Removing dangling child containers with label ${containerLabel}`);
		const res = await rawExec(`docker ps --filter label=${containerLabel} -aq`, {});
		if (res?.stdout?.trim().length) {
			const containerIds = res.stdout.trim().split(newlineRegex).map((container) => container.trim()).filter(isTruthy);
			logger.debug({ containerIds }, "Removing dangling child containers");
			await rawExec(`docker rm -f ${containerIds.join(" ")}`, {});
		} else logger.debug("No dangling containers to remove");
	} catch (err) {
		if (err.errno === "ENOMEM") throw new Error(SYSTEM_INSUFFICIENT_MEMORY);
		if (err.stderr?.includes("Cannot connect to the Docker daemon")) logger.info("No docker daemon found");
		else logger.warn({ err }, "Error removing dangling containers");
	}
}
async function generateDockerCommand(commands, preCommands, options, sideCarImage) {
	const { envVars, cwd } = options;
	const volumes = coerceArray(options.volumes);
	const { localDir, cacheDir, containerbaseDir, dockerUser, dockerChildPrefix, dockerCliOptions } = GlobalConfig.get();
	const result = ["docker run --rm"];
	const containerName = getContainerName(sideCarName, dockerChildPrefix);
	const containerLabel = getContainerLabel(dockerChildPrefix);
	result.push(`--name=${containerName}`);
	result.push(`--label=${containerLabel}`);
	if (dockerUser) result.push(`--user=${dockerUser}`);
	if (dockerCliOptions) result.push(dockerCliOptions);
	const volumeDirs = [localDir, cacheDir];
	if (containerbaseDir) {
		if (cacheDir && containerbaseDir.startsWith(cacheDir)) logger.debug("containerbaseDir is inside cacheDir");
		else {
			logger.debug("containerbaseDir is separate from cacheDir");
			volumeDirs.push(containerbaseDir);
		}
	} else logger.debug("containerbaseDir is missing");
	volumeDirs.push(...volumes);
	result.push(...prepareVolumes(volumeDirs));
	// v8 ignore else -- TODO: add test #40625
	if (envVars) result.push(...uniq(envVars).filter(isString).map((e) => `-e ${e}`));
	if (cwd) result.push(`-w "${cwd}"`);
	logger.debug({ image: sideCarImage }, "Resolved tag constraint");
	await prefetchDockerImage(sideCarImage);
	result.push(sideCarImage);
	const bashCommandParts = [];
	for (const preCommand of preCommands) if (isCommandWithOptions(preCommand) && isString(join(preCommand.command))) {
		if (preCommand.ignoreFailure) bashCommandParts.push(`${join(preCommand.command)} || true`);
		else bashCommandParts.push(join(preCommand.command));
	} else if (isString(preCommand)) bashCommandParts.push(preCommand);
	for (const command of commands) if (isCommandWithOptions(command)) {
		if (command.ignoreFailure) bashCommandParts.push(`${join(command.command)} || true`);
		else bashCommandParts.push(join(command.command));
	} else bashCommandParts.push(command);
	const bashCommand = bashCommandParts.join(" && ");
	result.push(`bash -l -c ${quote(bashCommand)}`);
	return result.join(" ");
}
//#endregion
export { generateDockerCommand, prefetchDockerImage, removeDanglingContainers, removeDockerContainer, sideCarName };

//# sourceMappingURL=index.js.map