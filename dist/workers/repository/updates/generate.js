import { CONFIG_SECRETS_EXPOSED } from "../../../constants/error-messages.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { sanitize } from "../../../util/sanitize.js";
import { safeStringify } from "../../../util/stringify.js";
import { logger } from "../../../logger/index.js";
import { mergeChildConfig } from "../../../config/utils.js";
import { compile } from "../../../util/template/index.js";
import { uniq } from "../../../util/uniq.js";
import "../../../config/index.js";
import { CommitMessage } from "../model/commit-message.js";
import { isArray, isNonEmptyString, isString } from "@sindresorhus/is";
import { DateTime } from "luxon";
import semver from "semver";
import { markdownTable } from "markdown-table";
//#region lib/workers/repository/updates/generate.ts
function prettifyVersion(version) {
	if (regEx(/^\d/).test(version)) return `v${version}`;
	return version;
}
function isTypesGroup(branchUpgrades) {
	return branchUpgrades.some(({ depName }) => depName?.startsWith("@types/")) && new Set(branchUpgrades.map(({ depName }) => depName?.replace(regEx(/^@types\//), ""))).size === 1;
}
function sortTypesGroup(upgrades) {
	function isTypesUpgrade({ depName }) {
		return !!depName?.startsWith("@types/");
	}
	const regularUpgrades = upgrades.filter((upgrade) => !isTypesUpgrade(upgrade));
	const typesUpgrades = upgrades.filter(isTypesUpgrade);
	upgrades.splice(0, upgrades.length);
	upgrades.push(...regularUpgrades, ...typesUpgrades);
}
function getTableValues(upgrade) {
	if (!upgrade.commitBodyTable) return null;
	const { datasource, packageName, depName, currentVersion, newVersion } = upgrade;
	const name = packageName ?? depName;
	if (datasource && name && currentVersion && newVersion) return [
		datasource,
		name,
		currentVersion,
		newVersion
	];
	logger.trace({
		datasource,
		packageName,
		depName,
		currentVersion,
		newVersion
	}, "Cannot determine table values");
	return null;
}
function compileCommitMessage(upgrade) {
	if (upgrade.semanticCommits === "enabled" && !upgrade.commitMessagePrefix) {
		logger.trace("Upgrade has semantic commits enabled");
		let semanticPrefix = upgrade.semanticCommitType;
		if (upgrade.semanticCommitScope) semanticPrefix += `(${compile(upgrade.semanticCommitScope, upgrade)})`;
		upgrade.commitMessagePrefix = CommitMessage.formatPrefix(semanticPrefix);
		upgrade.toLowerCase = regEx(/[A-Z]/).exec(upgrade.semanticCommitType) === null && !upgrade.semanticCommitType.startsWith(":");
	}
	upgrade.commitMessage = compile(upgrade.commitMessage ?? "", upgrade);
	upgrade.commitMessage = compile(upgrade.commitMessage, upgrade);
	upgrade.commitMessage = compile(upgrade.commitMessage, upgrade);
	// istanbul ignore if
	if (upgrade.commitMessage !== sanitize(upgrade.commitMessage)) {
		logger.debug({ branchName: upgrade.branchName }, "Secrets exposed in commit message");
		throw new Error(CONFIG_SECRETS_EXPOSED);
	}
	upgrade.commitMessage = upgrade.commitMessage.trim();
	upgrade.commitMessage = upgrade.commitMessage.replace(regEx(/\s+/g), " ");
	upgrade.commitMessage = upgrade.commitMessage.replace(regEx(/to vv(?<digit>\d)/), "to v$<digit>");
	if (upgrade.toLowerCase && upgrade.commitMessageLowerCase !== "never") {
		const splitMessage = upgrade.commitMessage.split(newlineRegex);
		splitMessage[0] = splitMessage[0].toLowerCase();
		upgrade.commitMessage = splitMessage.join("\n");
	}
	logger.trace(`commitMessage: ${JSON.stringify(upgrade.commitMessage)}`);
	return upgrade.commitMessage;
}
function compilePrTitle(upgrade, commitMessage) {
	if (upgrade.prTitle) {
		upgrade.prTitle = compile(upgrade.prTitle, upgrade);
		upgrade.prTitle = compile(upgrade.prTitle, upgrade);
		upgrade.prTitle = compile(upgrade.prTitle, upgrade).trim().replace(regEx(/\s+/g), " ");
		// istanbul ignore if
		if (upgrade.prTitle !== sanitize(upgrade.prTitle)) {
			logger.debug({ branchName: upgrade.branchName }, "Secrets were exposed in PR title");
			throw new Error(CONFIG_SECRETS_EXPOSED);
		}
		if (upgrade.toLowerCase && upgrade.commitMessageLowerCase !== "never") upgrade.prTitle = upgrade.prTitle.toLowerCase();
	} else [upgrade.prTitle] = commitMessage.split(newlineRegex);
	if (!upgrade.prTitleStrict) {
		upgrade.prTitle += upgrade.hasBaseBranches ? " ({{baseBranch}})" : "";
		if (upgrade.isGroup) {
			if (!!!semver.coerce(compile(upgrade.commitMessageExtra ?? "", upgrade))) {
				upgrade.prTitle += upgrade.updateType === "major" && upgrade.separateMajorMinor ? " (major)" : "";
				upgrade.prTitle += upgrade.updateType === "minor" && upgrade.separateMinorPatch ? " (minor)" : "";
				upgrade.prTitle += upgrade.updateType === "patch" && upgrade.separateMinorPatch ? " (patch)" : "";
			}
		}
	}
	upgrade.prTitle = compile(upgrade.prTitle, upgrade);
	logger.trace(`prTitle: ${JSON.stringify(upgrade.prTitle)}`);
}
function getMinimumGroupSize(upgrades) {
	let minimumGroupSize = 1;
	const groupSizes = /* @__PURE__ */ new Set();
	for (const upg of upgrades) if (upg.minimumGroupSize) {
		groupSizes.add(upg.minimumGroupSize);
		if (minimumGroupSize < upg.minimumGroupSize) minimumGroupSize = upg.minimumGroupSize;
	}
	if (groupSizes.size > 1) logger.debug("Multiple minimumGroupSize values found for this branch, using highest.");
	return minimumGroupSize;
}
const semanticCommitTypeByPriority = [
	"chore",
	"ci",
	"build",
	"fix",
	"feat"
];
function generateBranchConfig(upgrades) {
	let branchUpgrades = upgrades;
	if (!branchUpgrades.every((upgrade) => upgrade.pendingChecks)) {
		logger.debug({ branch: branchUpgrades[0].branchName }, "Branch is not pending, removing pending upgrades");
		branchUpgrades = branchUpgrades.filter((upgrade) => !upgrade.pendingChecks);
	}
	logger.trace({ config: branchUpgrades }, "generateBranchConfig");
	let config = { upgrades: [] };
	const hasGroupName = branchUpgrades[0].groupName !== null;
	logger.trace(`hasGroupName: ${hasGroupName}`);
	const depNames = [];
	const newValue = [];
	const toVersions = [];
	const toValues = /* @__PURE__ */ new Set();
	const depTypes = /* @__PURE__ */ new Set();
	for (const upg of branchUpgrades) {
		upg.recreateClosed = upg.recreateWhen === "always";
		if (upg.currentDigest) upg.currentDigestShort = upg.currentDigestShort ?? upg.currentDigest.replace("sha256:", "").substring(0, 7);
		if (upg.newDigest) upg.newDigestShort = upg.newDigestShort ?? upg.newDigest.replace("sha256:", "").substring(0, 7);
		if (upg.isDigest || upg.isPinDigest) {
			upg.displayFrom = upg.currentDigestShort;
			upg.displayTo = upg.newDigestShort;
		} else if (upg.isLockfileUpdate) {
			upg.displayFrom = upg.currentVersion;
			upg.displayTo = upg.newVersion;
		} else if (!upg.isLockFileMaintenance) {
			upg.displayFrom = upg.currentValue;
			upg.displayTo = upg.newValue;
		}
		if (upg.isLockFileMaintenance) upg.recreateClosed = upg.recreateWhen !== "never";
		upg.displayFrom ??= "";
		upg.displayTo ??= "";
		if (!depNames.includes(upg.depName)) depNames.push(upg.depName);
		if (!toVersions.includes(upg.newVersion)) toVersions.push(upg.newVersion);
		toValues.add(upg.newValue);
		if (upg.depType) depTypes.add(upg.depType);
		if (upg.newVersion) upg.prettyNewVersion = prettifyVersion(upg.newVersion);
		if (upg.newMajor) upg.prettyNewMajor = `v${upg.newMajor}`;
		if (upg.commitMessageExtra) {
			const extra = compile(upg.commitMessageExtra, upg);
			if (!newValue.includes(extra)) newValue.push(extra);
		}
	}
	const groupEligible = depNames.length > 1 || toVersions.length > 1 || !toVersions[0] && newValue.length > 1;
	const typesGroup = depNames.length > 1 && !hasGroupName && isTypesGroup(branchUpgrades);
	logger.trace(`groupEligible: ${groupEligible}`);
	const singleUpdateGroup = hasGroupName && !groupEligible && !branchUpgrades[0].sharedVariableName;
	logger.trace(`singleUpdateGroup: ${singleUpdateGroup}`);
	const useGroupSettings = hasGroupName && (groupEligible || singleUpdateGroup && branchUpgrades[0].groupSingleUpdates === true);
	logger.trace(`useGroupSettings: ${useGroupSettings}`);
	let releaseTimestamp;
	if (depTypes.size) config.depTypes = Array.from(depTypes).sort();
	for (const branchUpgrade of branchUpgrades) {
		let upgrade = { ...branchUpgrade };
		upgrade.depTypes = config.depTypes;
		if (newValue.length > 1 && !groupEligible) upgrade.commitMessageExtra = `to v${toVersions[0]}`;
		const pendingVersionsLength = upgrade.pendingVersions?.length;
		if (pendingVersionsLength) {
			upgrade.displayPending = `\`${upgrade.pendingVersions.at(-1)}\``;
			if (pendingVersionsLength > 1) upgrade.displayPending += ` (+${pendingVersionsLength - 1})`;
		} else upgrade.displayPending = "";
		upgrade.prettyDepType = upgrade.prettyDepType ?? upgrade.depType ?? "dependency";
		if (useGroupSettings) {
			upgrade = mergeChildConfig(upgrade, upgrade.group);
			upgrade.isGroup = true;
			if (singleUpdateGroup) {
				delete upgrade.commitMessageExtra;
				upgrade.recreateClosed = upgrade.recreateWhen !== "never";
			}
		} else delete upgrade.groupName;
		delete upgrade.group;
		if (toVersions.length > 1 && toValues.size > 1 && newValue.length > 1 && !typesGroup) {
			logger.trace({ toVersions });
			logger.trace({ toValues });
			delete upgrade.commitMessageExtra;
			upgrade.recreateClosed = upgrade.recreateWhen !== "never";
		} else if (newValue.length > 1 && (upgrade.isDigest || upgrade.isPinDigest)) {
			logger.trace({ newValue });
			delete upgrade.commitMessageExtra;
			upgrade.recreateClosed = upgrade.recreateWhen !== "never";
		} else if (semver.valid(toVersions[0])) upgrade.isRange = false;
		config.upgrades.push(upgrade);
		if (upgrade.releaseTimestamp) {
			if (releaseTimestamp) {
				const existingStamp = DateTime.fromISO(releaseTimestamp);
				if (DateTime.fromISO(upgrade.releaseTimestamp) > existingStamp) releaseTimestamp = upgrade.releaseTimestamp;
			} else releaseTimestamp = upgrade.releaseTimestamp;
		}
	}
	if (typesGroup) {
		if (config.upgrades[0].depName?.startsWith("@types/")) {
			logger.debug("Found @types - reversing upgrades to use depName in PR");
			sortTypesGroup(config.upgrades);
			config.upgrades[0].recreateClosed = false;
			config.hasTypes = true;
		}
	} else config.upgrades.sort((a, b) => {
		if (a.fileReplacePosition && b.fileReplacePosition) return a.fileReplacePosition > b.fileReplacePosition ? -1 : 1;
		if (a.fileReplacePosition) return 1;
		if (b.fileReplacePosition) return -1;
		if (a.depName < b.depName) return -1;
		if (a.depName > b.depName) return 1;
		return 0;
	});
	config = {
		...config,
		...config.upgrades[0],
		releaseTimestamp
	};
	if (config.upgrades.some((upgrade) => upgrade.semanticCommits === "enabled")) {
		config.semanticCommits = "enabled";
		let highestIndex = -1;
		for (const upgrade of config.upgrades) if (upgrade.semanticCommits === "enabled" && upgrade.semanticCommitType) {
			const priorityIndex = semanticCommitTypeByPriority.indexOf(upgrade.semanticCommitType);
			if (priorityIndex > highestIndex) highestIndex = priorityIndex;
		}
		if (highestIndex > -1) config.semanticCommitType = semanticCommitTypeByPriority[highestIndex];
	}
	const commitMessage = compileCommitMessage(config);
	compilePrTitle(config, commitMessage);
	config.dependencyDashboardApproval = config.upgrades.some((upgrade) => upgrade.dependencyDashboardApproval);
	config.dependencyDashboardPrApproval = config.upgrades.some((upgrade) => upgrade.prCreation === "approval");
	config.prBodyColumns = [...new Set(config.upgrades.reduce((existing, upgrade) => existing.concat(upgrade.prBodyColumns), []))].filter(isNonEmptyString);
	if (config.upgrades.some((u) => u.excludeCommitPaths && u.excludeCommitPaths.length > 0)) config.excludeCommitPaths = Object.keys(config.upgrades.reduce((acc, upgrade) => {
		if (upgrade.excludeCommitPaths) upgrade.excludeCommitPaths.forEach((p) => {
			acc[p] = true;
		});
		return acc;
	}, {}));
	config.automerge = config.upgrades.every((upgrade) => upgrade.automerge);
	config.labels = [...new Set(config.upgrades.map((upgrade) => coerceArray(upgrade.labels)).reduce((a, b) => a.concat(b), []))];
	config.addLabels = [...new Set(config.upgrades.map((upgrade) => coerceArray(upgrade.addLabels)).reduce((a, b) => a.concat(b), []))];
	if (config.upgrades.some((upgrade) => upgrade.updateType === "major")) config.updateType = "major";
	config.isBreaking = config.upgrades.some((upgrade) => upgrade.isBreaking);
	if (config.upgrades.some((upgrade) => upgrade.isLockFileMaintenance)) {
		config.isLockFileMaintenance = true;
		// istanbul ignore if: should never happen
		if (config.upgrades.some((upgrade) => !upgrade.isLockFileMaintenance)) logger.warn("Grouping lockfile maintenance with other update types is not supported");
	}
	config.constraints = {};
	config.extractedConstraints = {};
	for (const upgrade of config.upgrades) {
		if (upgrade.constraints) config.constraints = {
			...config.constraints,
			...upgrade.constraints
		};
		if (upgrade.extractedConstraints) config.extractedConstraints = {
			...config.extractedConstraints,
			...upgrade.extractedConstraints
		};
	}
	config.minimumGroupSize = getMinimumGroupSize(config.upgrades);
	config.skipInstalls = config.upgrades.every((upgrade) => upgrade.skipInstalls !== false);
	config.skipArtifactsUpdate = config.upgrades.every((upgrade) => upgrade.skipArtifactsUpdate);
	if (!config.skipArtifactsUpdate && config.upgrades.some((upgrade) => upgrade.skipArtifactsUpdate)) logger.debug({ upgrades: config.upgrades.map((upgrade) => ({
		depName: upgrade.depName,
		skipArtifactsUpdate: upgrade.skipArtifactsUpdate
	})) }, "Mixed `skipArtifactsUpdate` values in upgrades. Artifacts will be updated.");
	const tableRows = config.upgrades.map(getTableValues).filter((x) => isArray(x, isString));
	if (tableRows.length) {
		const table = [];
		table.push([
			"datasource",
			"package",
			"from",
			"to"
		]);
		const seenRows = /* @__PURE__ */ new Set();
		for (const row of tableRows) {
			const key = safeStringify(row);
			if (seenRows.has(key)) continue;
			seenRows.add(key);
			table.push(row);
		}
		config.commitMessage += `\n\n${markdownTable(table)}\n`;
	}
	const additionalReviewers = uniq(config.upgrades.map((upgrade) => upgrade.additionalReviewers).flat().filter(isNonEmptyString));
	if (additionalReviewers.length > 0) config.additionalReviewers = additionalReviewers;
	return config;
}
//#endregion
export { generateBranchConfig };

//# sourceMappingURL=generate.js.map