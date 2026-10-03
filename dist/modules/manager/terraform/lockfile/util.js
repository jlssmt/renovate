import { newlineRegex, regEx } from "../../../../util/regex.js";
import { findLocalSiblingOrParent, readLocalFile } from "../../../../util/fs/index.js";
import { get } from "../../../versioning/index.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/lockfile/util.ts
const providerStartLineRegex = regEx(`^provider "(?<registryUrl>[^/]*)/(?<namespace>[^/]*)/(?<depName>[^/]*)"`);
const versionLineRegex = regEx(`^(?<prefix>[\\s]*version[\\s]*=[\\s]*")(?<version>[^"']+)(?<suffix>".*)$`);
const constraintLineRegex = regEx(`^(?<prefix>[\\s]*constraints[\\s]*=[\\s]*")(?<constraint>[^"']+)(?<suffix>".*)$`);
const hashLineRegex = regEx(`^(?<prefix>\\s*")(?<hash>[^"]+)(?<suffix>",.*)$`);
const lockFile = ".terraform.lock.hcl";
function findLockFile(packageFilePath) {
	return findLocalSiblingOrParent(packageFilePath, lockFile);
}
function readLockFile(lockFilePath) {
	return readLocalFile(lockFilePath, "utf8");
}
function extractLocks(lockFileContent) {
	const lines = lockFileContent.split(newlineRegex);
	const blockStarts = [];
	lines.forEach((line, index) => {
		if (line.startsWith("provider \"")) blockStarts.push(index);
	});
	const locks = blockStarts.sort((a, b) => a - b).map((start, index, array) => {
		let end;
		if (index < array.length - 1) end = array[index + 1];
		else end = lines.length - 1;
		return {
			lines: lines.slice(start, end),
			block: {
				start,
				end
			}
		};
	}).map((slice) => {
		let packageName = "";
		let registryUrl = "";
		let version = "";
		let constraints = "";
		const relativeLineNumbers = {
			block: slice.block,
			hashes: {
				start: -1,
				end: -1
			}
		};
		const hashes = [];
		slice.lines.forEach((line, index) => {
			const hashLineResult = hashLineRegex.exec(line);
			if (hashLineResult?.groups) {
				hashes.push(hashLineResult.groups.hash);
				relativeLineNumbers.hashes.start = relativeLineNumbers.hashes.start === -1 ? index : relativeLineNumbers.hashes.start;
				relativeLineNumbers.hashes.end = index;
				return;
			}
			const providerStartLineResult = providerStartLineRegex.exec(line);
			if (providerStartLineResult?.groups) {
				packageName = `${providerStartLineResult.groups.namespace}/${providerStartLineResult.groups.depName}`;
				registryUrl = providerStartLineResult.groups.registryUrl;
				return;
			}
			const versionLineResult = versionLineRegex.exec(line);
			if (versionLineResult?.groups) {
				version = versionLineResult.groups.version;
				relativeLineNumbers.version = index;
				return;
			}
			const constraintLineResult = constraintLineRegex.exec(line);
			if (constraintLineResult?.groups) {
				constraints = constraintLineResult.groups.constraint;
				relativeLineNumbers.constraint = index;
			}
		});
		return {
			packageName,
			registryUrl: `https://${registryUrl}`,
			version,
			constraints,
			hashes,
			lineNumbers: relativeLineNumbers
		};
	});
	if (locks.length === 0) return null;
	return locks;
}
function isPinnedVersion(value) {
	const versioning = get("hashicorp");
	return !!value && !!versioning.isSingleVersion(value);
}
function writeLockUpdates(updates, lockFilePath, oldLockFileContent) {
	const lines = oldLockFileContent.split(newlineRegex);
	const sections = [];
	updates.sort((a, b) => a.lineNumbers.block.start - b.lineNumbers.block.start);
	updates.forEach((update, index, array) => {
		let startWhitespace;
		if (index > 0) startWhitespace = array[index - 1].lineNumbers.block.end;
		const leadingNonRelevantLines = lines.slice(startWhitespace, update.lineNumbers.block.start);
		sections.push(leadingNonRelevantLines);
		const providerBlockLines = lines.slice(update.lineNumbers.block.start, update.lineNumbers.block.end);
		const newProviderBlockLines = [];
		let hashLinePrefix = "";
		let hashLineSuffix = "";
		providerBlockLines.forEach((providerBlockLine) => {
			const versionLine = providerBlockLine.replace(versionLineRegex, `$<prefix>${update.newVersion}$<suffix>`);
			if (versionLine !== providerBlockLine) {
				newProviderBlockLines.push(versionLine);
				return;
			}
			const constraintLine = providerBlockLine.replace(constraintLineRegex, `$<prefix>${update.newConstraint}$<suffix>`);
			if (constraintLine !== providerBlockLine) {
				newProviderBlockLines.push(constraintLine);
				return;
			}
			const hashLineRegexResult = hashLineRegex.exec(providerBlockLine);
			if (hashLineRegexResult?.groups) {
				hashLinePrefix = hashLineRegexResult.groups.prefix;
				hashLineSuffix = hashLineRegexResult.groups.suffix;
				return;
			}
			newProviderBlockLines.push(providerBlockLine);
		});
		const hashesWithWhitespace = update.newHashes.map((value) => `${hashLinePrefix}${value}${hashLineSuffix}`);
		newProviderBlockLines.splice(update.lineNumbers.hashes.start, 0, ...hashesWithWhitespace);
		sections.push(newProviderBlockLines);
	});
	const trailingNotUpdatedLines = lines.slice(updates.at(-1).lineNumbers.block?.end);
	sections.push(trailingNotUpdatedLines);
	return { file: {
		type: "addition",
		path: lockFilePath,
		contents: sections.reduce((previousValue, currentValue) => previousValue.concat(currentValue)).join("\n")
	} };
}
const hashicorpVersioning = get("hashicorp");
const constraintOperators = [
	">=",
	"<=",
	"!=",
	"~>",
	"=",
	">",
	"<"
];
function operatorPriority(operator, rawVersion) {
	switch (operator) {
		case ">": return 1;
		case ">=": return 2;
		case "": return 3;
		case "~>": return rawVersion.split(".").length > 2 ? 4 : 5;
		case "<=": return 6;
		case "<": return 7;
		case "!=": return 8;
		/* v8 ignore next -- unreachable for constraints that parsed successfully */
		default: return 0;
	}
}
function constrainToZero(version) {
	const sep = version.search(regEx(/[-+]/));
	const core = sep === -1 ? version : version.slice(0, sep);
	const extra = sep === -1 ? "" : version.slice(sep);
	const segments = core.split(".");
	while (segments.length < 3) segments.push("0");
	return segments.join(".") + extra;
}
function parseConstraint(token) {
	const raw = token.trim();
	for (const operator of constraintOperators) if (raw.startsWith(operator)) {
		const rawVersion = raw.slice(operator.length).trim();
		return {
			raw,
			operator: operator === "=" ? "" : operator,
			rawVersion,
			cmpVersion: constrainToZero(rawVersion)
		};
	}
	return {
		raw,
		operator: "",
		rawVersion: raw,
		cmpVersion: constrainToZero(raw)
	};
}
/**
* Reorder the sub-constraints of a Terraform lock `constraints` string into the
* normalized form Terraform/OpenTofu require: boundary version ascending, ties
* broken by operator priority. Renovate updates a version in place without
* re-sorting, which produces strings Terraform rejects with "must be written in
* normalized form" once a bumped exact pin overtakes an inherited `~>` range.
* See https://github.com/renovatebot/renovate/issues/37273.
*/
function sortConstraints(constraint) {
	if (!constraint?.includes(",")) return constraint;
	const parsed = [];
	for (const token of constraint.split(",")) {
		const entry = parseConstraint(token);
		if (!hashicorpVersioning.isValid(entry.cmpVersion)) return constraint;
		parsed.push(entry);
	}
	parsed.sort((a, b) => {
		if (!hashicorpVersioning.equals(a.cmpVersion, b.cmpVersion)) return hashicorpVersioning.isGreaterThan(a.cmpVersion, b.cmpVersion) ? 1 : -1;
		return operatorPriority(a.operator, a.rawVersion) - operatorPriority(b.operator, b.rawVersion);
	});
	return parsed.map((entry) => entry.raw).join(", ");
}
function massageNewValue(value) {
	if (isNullOrUndefined(value)) return value;
	const elements = value.split(",");
	const massagedElements = [];
	for (const element of elements) {
		if (element.includes("~>")) {
			massagedElements.push(element);
			continue;
		}
		const missing0s = 3 - element.split(".").length;
		let massagedElement = element;
		for (let i = 0; i < missing0s; i++) massagedElement = `${massagedElement}.0`;
		massagedElements.push(massagedElement);
	}
	return massagedElements.join(",");
}
//#endregion
export { extractLocks, findLockFile, isPinnedVersion, massageNewValue, readLockFile, sortConstraints, writeLockUpdates };

//# sourceMappingURL=util.js.map