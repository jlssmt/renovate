import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { createSimpleGit } from "../../../util/git/index.js";
import upath from "upath";
//#region lib/modules/manager/git-submodules/update.ts
async function updateDependency({ fileContent, upgrade }) {
	const localDir = GlobalConfig.get("localDir");
	const authentication = { hostTypes: ["git-tags", "git-refs"] };
	const git = createSimpleGit({
		config: { baseDir: localDir },
		authentication
	});
	const submoduleGit = createSimpleGit({
		config: { baseDir: upath.join(localDir, upgrade.depName) },
		authentication
	});
	try {
		await git.submoduleUpdate([
			"--checkout",
			"--init",
			"--recursive",
			upgrade.depName
		]);
		await submoduleGit.checkout([upgrade.newDigest]);
		if (upgrade.newValue && upgrade.currentValue !== upgrade.newValue) {
			await git.subModule([
				"set-branch",
				"--branch",
				upgrade.newValue,
				upgrade.depName
			]);
			return await readLocalFile(upgrade.packageFile, "utf8");
		}
		return fileContent;
	} catch (err) {
		logger.debug({ err }, "submodule checkout error");
		return null;
	}
}
//#endregion
export { updateDependency as default };

//# sourceMappingURL=update.js.map