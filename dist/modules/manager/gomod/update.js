import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
//#region lib/modules/manager/gomod/update.ts
function getNameWithNoVersion(name) {
	let nameNoVersion = name.replace(regEx(/\/v\d+$/), "");
	if (nameNoVersion.startsWith("gopkg.in")) nameNoVersion = nameNoVersion.replace(regEx(/\.v\d+$/), "");
	return nameNoVersion;
}
function updateDependency({ fileContent, upgrade }) {
	try {
		logger.debug(`gomod.updateDependency: ${upgrade.newValue}`);
		const { depType, updateType } = upgrade;
		const currentName = upgrade.depName;
		if (updateType === "replacement") {
			logger.warn("gomod manager does not support replacement updates yet");
			return null;
		}
		/* v8 ignore next -- should never happen */
		if (!currentName || !upgrade.managerData) return null;
		const currentNameNoVersion = getNameWithNoVersion(currentName);
		const lines = fileContent.split(newlineRegex);
		/* v8 ignore next -- hard to test */
		if (lines.length <= upgrade.managerData.lineNumber) {
			logger.warn("go.mod current line no longer exists after update");
			return null;
		}
		const lineToChange = lines[upgrade.managerData.lineNumber];
		logger.trace({
			upgrade,
			lineToChange
		}, "go.mod current line");
		if (!lineToChange.includes(currentNameNoVersion) && !lineToChange.includes("rethinkdb/rethinkdb-go.v5")) {
			logger.debug({
				lineToChange,
				depName: currentName
			}, "go.mod current line doesn't contain dependency");
			return null;
		}
		let updateLineExp;
		if (depType === "golang" || depType === "toolchain") updateLineExp = regEx(/(?<depPart>(?:toolchain )?go)(?<divider>\s*)(?:[^\s]+|[\w]+)/);
		if (depType === "replace") {
			if (upgrade.managerData.multiLine) updateLineExp = regEx(/^(?<depPart>\s+[^\s]+[\s]+[=][>]+\s+)(?<divider>[^\s]+\s+)[^\s]+/);
			else updateLineExp = regEx(/^(?<depPart>replace\s+[^\s]+[\s]+[=][>]+\s+)(?<divider>[^\s]+\s+)[^\s]+/);
		} else if (depType === "require" || depType === "indirect") {
			if (upgrade.managerData.multiLine) updateLineExp = regEx(/^(?<depPart>\s+[^\s]+)(?<divider>\s+)[^\s]+/);
			else updateLineExp = regEx(/^(?<depPart>require\s+[^\s]+)(?<divider>\s+)[^\s]+/);
		}
		if (updateLineExp && !updateLineExp.test(lineToChange)) {
			logger.debug("No line found to update");
			return null;
		}
		let newLine;
		if (upgrade.updateType === "digest") {
			if (upgrade.newValue?.startsWith("v0.0.0-") && upgrade.newValue !== upgrade.currentValue) {
				logger.debug({
					depName: currentName,
					lineToChange,
					newValue: upgrade.newValue
				}, "gomod: updating pseudo-version digest");
				newLine = lineToChange.replace(updateLineExp, `$<depPart>$<divider>${upgrade.newValue}`);
			} else {
				const newDigestRightSized = upgrade.newDigest.substring(0, upgrade.currentDigest.length);
				if (lineToChange.includes(newDigestRightSized)) return fileContent;
				logger.debug({
					depName: currentName,
					lineToChange,
					newDigestRightSized
				}, "gomod: need to update digest");
				newLine = lineToChange.replace(updateLineExp, `$<depPart>$<divider>${newDigestRightSized}`);
			}
		} else newLine = lineToChange.replace(updateLineExp, `$<depPart>$<divider>${upgrade.newValue}`);
		if (upgrade.updateType === "major") {
			logger.debug(`gomod: major update for ${currentName}`);
			if (currentName.startsWith("gopkg.in/")) {
				const oldV = currentName.split(".").pop();
				newLine = newLine.replace(`.${oldV}`, `.v${upgrade.newMajor}`);
				newLine = newLine.replace("gorethink/gorethink.v5", "rethinkdb/rethinkdb-go.v5");
			} else if (upgrade.newMajor > 1 && !newLine.includes(`/v${upgrade.newMajor}`) && !upgrade.newValue.endsWith("+incompatible")) {
				if (currentName === currentNameNoVersion) newLine = newLine.replaceAll(currentName, `${currentName}/v${upgrade.newMajor}`);
				else {
					const [oldV] = upgrade.currentValue.split(".");
					newLine = newLine.replace(regEx(`/${oldV}(\\s+)`, void 0, false), `/v${upgrade.newMajor}$1`);
				}
			}
		}
		if (lineToChange.endsWith("+incompatible") && !upgrade.newValue?.endsWith("+incompatible")) {
			let toAdd = "+incompatible";
			if (upgrade.updateType === "major" && upgrade.newMajor >= 2) toAdd = "";
			newLine += toAdd;
		}
		if (newLine === lineToChange) {
			logger.debug("No changes necessary");
			return fileContent;
		}
		if (depType === "indirect") newLine = newLine.replace(regEx(/\s*(?:\/\/\s*indirect(?:\s*;)?\s*)*$/), " // indirect");
		lines[upgrade.managerData.lineNumber] = newLine;
		return lines.join("\n");
	} catch (err) {
		logger.debug({ err }, "Error setting new go.mod version");
		return null;
	}
}
//#endregion
export { updateDependency };

//# sourceMappingURL=update.js.map