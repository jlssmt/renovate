import { regEx } from "../../../util/regex.js";
import { isNotNullOrUndefined } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { isValidLocalPath, readLocalFile } from "../../../util/fs/index.js";
import upath from "upath";
//#region lib/modules/manager/bazel-module/bazelrc.ts
const importRegex = regEx(`^(?<type>(?:try-)?import)\\s+(?<path>\\S+)$`);
const optionRegex = regEx(`^(?<command>\\w+)(:(?<config>\\S+))?\\s+(?<options>.*)$`);
const spaceRegex = regEx(`\\s+`);
var ImportEntry = class {
	entryType = "import";
	path;
	isTry;
	constructor(path, isTry) {
		this.path = path;
		this.isTry = isTry;
	}
};
var BazelOption = class BazelOption {
	name;
	value;
	constructor(name, value) {
		this.name = name;
		this.value = value;
	}
	static parse(input) {
		const options = [];
		const parts = input.split(spaceRegex);
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (!part.startsWith("--")) continue;
			const nameStartIdx = 2;
			const equalSignIdx = part.indexOf("=");
			if (equalSignIdx >= 0) {
				const name = part.substring(nameStartIdx, equalSignIdx);
				const value = part.substring(equalSignIdx + 1);
				options.push(new BazelOption(name, value));
				continue;
			}
			const name = part.substring(nameStartIdx);
			const nextIdx = i + 1;
			const value = nextIdx < parts.length && !parts[nextIdx].startsWith("--") ? parts[nextIdx] : void 0;
			options.push(new BazelOption(name, value));
		}
		return options;
	}
};
var CommandEntry = class {
	entryType = "command";
	command;
	options;
	config;
	constructor(command, options, config) {
		this.command = command;
		this.options = options;
		this.config = config;
	}
	getOption(name) {
		return this.options.find((bo) => bo.name === name);
	}
};
function shouldProcessLine(line) {
	if (line.length === 0) return false;
	return !line.startsWith("#");
}
function createEntry(line) {
	const importResult = importRegex.exec(line);
	if (importResult?.groups) {
		const irGroups = importResult.groups;
		return new ImportEntry(irGroups.path, irGroups.type === "try-import");
	}
	const optionResult = optionRegex.exec(line);
	if (optionResult?.groups) {
		const orGroups = optionResult.groups;
		return new CommandEntry(orGroups.command, BazelOption.parse(orGroups.options), orGroups.config);
	}
}
function expandWorkspacePath(value, workspaceDir) {
	if (!value.includes("%workspace%")) return value;
	const absolutePath = upath.resolve(workspaceDir);
	const expandedPath = value.replace("%workspace%", absolutePath);
	if (!isValidLocalPath(expandedPath)) return null;
	return expandedPath;
}
function sanitizeOptions(options, workspaceDir) {
	return options.map((option) => {
		if (!option.value) return option;
		const expandedPath = expandWorkspacePath(option.value, workspaceDir);
		if (!expandedPath) {
			logger.debug(`Skipping invalid workspace path: ${option.value} in ${workspaceDir}`);
			return null;
		}
		return new BazelOption(option.name, expandedPath);
	}).filter(isNotNullOrUndefined);
}
function parse(contents) {
	return contents.split("\n").map((l) => l.trim()).filter(shouldProcessLine).map(createEntry).filter(isNotNullOrUndefined);
}
async function readFile(file, workspaceDir, readFiles) {
	if (readFiles.has(file)) throw new Error(`Attempted to read a bazelrc multiple times. file: ${file}`);
	readFiles.add(file);
	const contents = await readLocalFile(file, "utf8");
	if (!contents) return [];
	const entries = parse(contents);
	const results = [];
	for (const entry of entries) {
		if (entry.entryType === "command") {
			const sanitizedOptions = sanitizeOptions(entry.options, workspaceDir);
			results.push(new CommandEntry(entry.command, sanitizedOptions, entry.config));
			continue;
		}
		const importFile = upath.normalize(entry.path.replace("%workspace%", workspaceDir));
		if (isValidLocalPath(importFile)) {
			const importEntries = await readFile(importFile, workspaceDir, readFiles);
			results.push(...importEntries);
		} else logger.debug(`Skipping non-local .bazelrc import ${importFile}`);
	}
	return results;
}
async function read(workspaceDir) {
	return await readFile(upath.join(workspaceDir, ".bazelrc"), workspaceDir, /* @__PURE__ */ new Set());
}
//#endregion
export { BazelOption, CommandEntry, ImportEntry, expandWorkspacePath, parse, read, sanitizeOptions };

//# sourceMappingURL=bazelrc.js.map