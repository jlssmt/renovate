import { pkg } from "../../../../expose.js";
import { regEx } from "../../../../util/regex.js";
import { logger } from "../../../../logger/index.js";
import { getOptions } from "../../../../config/options/index.js";
import { coersions } from "./coersions.js";
import { Command } from "commander";
//#region lib/workers/global/config/parse/cli.ts
function getCliName(option) {
	if (option.cli === false) return "";
	return `--${option.name.replace(regEx(/(?<upper>[A-Z])/g), "-$<upper>").toLowerCase()}`;
}
function createProgram() {
	const options = getOptions();
	let program = new Command().arguments("[repositories...]");
	options.forEach((option) => {
		if (option.cli !== false) {
			const param = `<${option.type}>`.replace("<boolean>", "[boolean]");
			const optionString = `${getCliName(option)} ${param}`;
			program = program.option(optionString, option.description, coersions[option.type]);
		}
	});
	/* istanbul ignore next */
	function helpConsole() {
		console.log("  Examples:");
		console.log("");
		console.log("    $ renovate --token 123test singapore/lint-condo");
		console.log("    $ LOG_LEVEL=debug renovate --labels=renovate,dependency --ignore-unstable=false singapore/lint-condo");
		console.log("    $ renovate singapore/lint-condo singapore/package-test");
		console.log(`    $ renovate singapore/lint-condo --onboarding-config='{"extends":["config:recommended"]}'`);
	}
	return program.version(pkg.version, "-v, --version").on("--help", helpConsole);
}
/**
* Massage migrated configuration keys.
* This must run before any Commander parse call so that
* deprecated/bare flags like `--dry-run` (no value) are rewritten
* before Commander tries to consume them.
*/
function migrateArgs(input) {
	return input.map((a) => a.replace("--allow-post-upgrade-command-templating", "--allow-command-templating").replace("--allowed-post-upgrade-commands", "--allowed-commands").replace("--endpoints=", "--host-rules=").replace("--expose-env=true", "--trust-level=high").replace("--expose-env", "--trust-level=high").replace("--renovate-fork", "--include-forks").replace("\"platform\":\"", "\"hostType\":\"").replace("\"endpoint\":\"", "\"matchHost\":\"").replace("\"host\":\"", "\"matchHost\":\"").replace("--azure-auto-complete", "--platform-automerge").replace("--git-lab-automerge", "--platform-automerge").replace(regEx(/^--dry-run$/), "--dry-run=true").replace(regEx(/^--require-config$/), "--require-config=true").replace("--aliases", "--registry-aliases").replace("--include-forks=true", "--fork-processing=enabled").replace("--include-forks", "--fork-processing=enabled").replace("--recreate-closed=false", "--recreate-when=auto").replace("--recreate-closed=true", "--recreate-when=always").replace("--recreate-closed", "--recreate-when=always")).filter((a) => !a.startsWith("--git-fs"));
}
function parseEarlyFlags(input = process.argv) {
	createProgram().allowUnknownOption().allowExcessArguments().parse(migrateArgs(input));
}
function getConfig(input) {
	const argv = migrateArgs(input);
	const options = getOptions();
	const config = {};
	createProgram().action((repositories, opts) => {
		if (repositories?.length) config.repositories = repositories;
		for (const option of options) if (option.cli !== false && opts[option.name] !== void 0) {
			config[option.name] = opts[option.name];
			if (option.name === "dryRun") {
				if (config[option.name] === "true") {
					logger.warn("cli config dryRun property has been changed to full");
					config[option.name] = "full";
				} else if (config[option.name] === "false") {
					logger.warn("cli config dryRun property has been changed to null");
					config[option.name] = null;
				} else if (config[option.name] === "null") config[option.name] = null;
			}
			if (option.name === "requireConfig") {
				if (config[option.name] === "true") {
					logger.warn("cli config requireConfig property has been changed to required");
					config[option.name] = "required";
				} else if (config[option.name] === "false") {
					logger.warn("cli config requireConfig property has been changed to optional");
					config[option.name] = "optional";
				}
			}
		}
	}).parse(argv);
	return config;
}
//#endregion
export { getCliName, getConfig, parseEarlyFlags };

//# sourceMappingURL=cli.js.map