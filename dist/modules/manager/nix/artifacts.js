import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { find } from "../../../util/host-rules.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { resolveToolConstraint } from "../util.js";
import { findGithubToken } from "../../../util/check-token.js";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/modules/manager/nix/artifacts.ts
async function updateArtifacts({ packageFileName, config, updatedDeps }) {
	const lockFileName = packageFileName.replace(regEx(/\.nix$/), ".lock");
	if (!await readLocalFile(lockFileName, "utf8")) {
		logger.debug("No flake.lock found");
		return null;
	}
	let cmd = `nix --extra-experimental-features 'nix-command flakes' `;
	const token = findGithubToken(find({
		hostType: "github",
		url: "https://api.github.com/"
	}));
	if (token) cmd += `--extra-access-tokens github.com=${quote(token)} `;
	if (config.isLockFileMaintenance) cmd += "flake update";
	else {
		const inputs = updatedDeps.map(({ depName }) => depName).filter(isNonEmptyStringAndNotWhitespace).map((depName) => quote(depName)).join(" ");
		cmd += `flake update ${inputs}`;
	}
	const execOptions = {
		cwdFile: packageFileName,
		toolConstraints: [{
			toolName: "nix",
			constraint: await resolveToolConstraint(config, "nix")
		}],
		docker: {}
	};
	try {
		await exec(cmd, execOptions);
		if (!(await getRepoStatus()).modified.includes(lockFileName)) return null;
		logger.debug("Returning updated flake.lock");
		return [{ file: {
			type: "addition",
			path: lockFileName,
			contents: await readLocalFile(lockFileName)
		} }];
	} catch (err) {
		logger.warn({ err }, "Error updating flake.lock");
		return [{ artifactError: {
			fileName: lockFileName,
			stderr: err.message
		} }];
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map