import { logger } from "../../logger/index.js";
import { clone } from "../../util/clone.js";
import { emojify } from "../../util/emoji.js";
import { isEmptyArray, isEmptyObject, isTruthy } from "@sindresorhus/is";
//#region lib/workers/repository/package-files.ts
var PackageFiles = class PackageFiles {
	static data = /* @__PURE__ */ new Map();
	static add(baseBranch, packageFiles) {
		logger.debug({ baseBranch }, `PackageFiles.add() - Package file saved for base branch`);
		this.data.set(baseBranch, packageFiles);
	}
	static clear() {
		logger.debug("PackageFiles.clear() - Package files deleted");
		this.data.clear();
	}
	/**
	* Truncates the detected dependencies' section until it fits the available space
	* i.e. It has length smaller than maxLength.
	* This does not mutate the original PackageFiles data
	* Note:  setHeader=false is used for testing purposes only
	*        Mainly for comparing truncated and non-truncated markdown
	* @param maxLength
	* @param setHeader
	*/
	static getDashboardMarkdown(maxLength, setHeader = true) {
		const note = emojify(`> :information_source: **Note**\n> \n> Detected dependencies section has been truncated\n\n`);
		const title = `## Detected Dependencies\n\n`;
		const mdMaxLength = maxLength - (setHeader ? (title + note).length : 0);
		let md;
		let header = "";
		let removed = false;
		let truncated = false;
		const data = new Map(clone(Array.from(this.data)));
		for (const managers of [...data.values()].filter(isTruthy)) for (const files of Object.values(managers).filter(isTruthy)) for (const file of files.filter((f) => isTruthy(f.deps))) file.deps = file.deps.filter(isTruthy).filter((d) => !d.skipReason);
		do {
			md = PackageFiles.getDashboardMarkdownInternal(data);
			if (md.length > mdMaxLength) removed = PackageFiles.pop(data);
			if (removed) truncated = true;
		} while (removed && md.length > mdMaxLength);
		header += title;
		header += truncated ? note : "";
		return (setHeader ? header : "") + md;
	}
	/**
	* Generates the "detected dependencies" markdown
	* @param data
	*/
	static getDashboardMarkdownInternal(data) {
		const none = "None detected\n\n";
		const pad = data.size > 1;
		let deps = "";
		for (const [branch, packageFiles] of Array.from(data).sort(([a], [b]) => a.localeCompare(b, void 0, { numeric: true }))) {
			deps += pad ? `<details><summary>Branch ${branch}</summary>\n<blockquote>\n\n` : "";
			if (packageFiles === null) {
				deps += none;
				deps += pad ? "</blockquote>\n</details>\n\n" : "";
				continue;
			}
			const managers = Object.keys(packageFiles).sort();
			if (managers.length === 0) {
				deps += none;
				deps += pad ? "</blockquote>\n</details>\n\n" : "";
				continue;
			}
			for (const manager of managers) {
				const managerPackageFiles = Array.from(packageFiles[manager]).sort((a, b) => a.packageFile.localeCompare(b.packageFile));
				deps += `<details><summary>${manager} (${managerPackageFiles.length})</summary>\n<blockquote>\n\n`;
				for (const packageFile of managerPackageFiles) {
					deps += `<details><summary>${packageFile.packageFile}${packageFile.deps.length > 0 ? ` (${packageFile.deps.length})` : ""}</summary>\n\n`;
					for (const dep of packageFile.deps) {
						const ver = dep.currentValue;
						const digest = dep.currentDigest;
						const lock = dep.lockedVersion;
						let version;
						if (ver || digest) version = ver && digest ? `${ver}@${digest}` : `${digest ?? ver}`;
						else if (lock) version = `lock file @ ${lock}`;
						else version = "unknown version";
						let updates = "";
						const uniqueUpdates = [...new Set(dep.updates?.map((update) => `\`${update.newValue}\``))];
						if (uniqueUpdates.length > 0) updates = ` → [Updates: ${uniqueUpdates.join(", ")}]`;
						deps += ` - \`${dep.depName} ${version}\`${updates}\n`;
					}
					deps += "\n</details>\n\n";
				}
				deps += `</blockquote>\n</details>\n\n`;
			}
			deps += pad ? "</blockquote>\n</details>\n\n" : "";
		}
		return deps;
	}
	/**
	* Removes the last dependency/entry in the PackageFiles data
	* i.e. the last line in the tobe generated detected dependency section
	* @param data
	* @Returns true if anything that translates to a markdown written line was deleted
	*          otherwise false is returned
	*/
	static pop(data) {
		const [branch, managers] = Array.from(data).pop() ?? [];
		if (!branch) return false;
		if (!managers || isEmptyObject(managers)) return data.delete(branch);
		const [manager, packageFiles] = Object.entries(managers).pop();
		if (!packageFiles || isEmptyArray(packageFiles)) return delete managers[manager];
		const len = packageFiles.length - 1;
		if (isEmptyArray(packageFiles[len].deps)) return !!packageFiles.pop();
		return !!packageFiles[len].deps.pop();
	}
};
//#endregion
export { PackageFiles };

//# sourceMappingURL=package-files.js.map