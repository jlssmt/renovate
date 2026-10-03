import { ATTR_VCS_GIT_OPERATION_TYPE, ATTR_VCS_GIT_SUBCOMMAND } from "../../instrumentation/types.js";
import { instrument } from "../../instrumentation/index.js";
import { isString } from "@sindresorhus/is";
//#region lib/util/git/instrument.ts
function isGitOperationType(subcommand) {
	return knownGitOperationTypesBySubcommand.includes(subcommand);
}
function gitOperationTypeForSubcommand(subcommand) {
	let operationType = "other";
	if (!isGitOperationType(subcommand)) {
		if (subcommand === "update-index") operationType = "plumbing";
		return operationType;
	}
	return subcommand;
}
/** single-command prefixes that correspond to an operation type */
const knownGitOperationTypesBySubcommand = [
	"branch",
	"checkout",
	"clean",
	"clone",
	"commit",
	"fetch",
	"merge",
	"pull",
	"push",
	"reset",
	"submodule"
];
/** helper method for instrumentation of Git operations */
function prepareInstrumentation(subcommand, options = {}) {
	const operationType = gitOperationTypeForSubcommand(subcommand);
	options.attributes ??= {};
	options.attributes[ATTR_VCS_GIT_OPERATION_TYPE] = operationType;
	options.attributes[ATTR_VCS_GIT_SUBCOMMAND] = subcommand;
	return {
		spanName: `git ${subcommand}`,
		options
	};
}
function instrumentGit(git) {
	return new InstrumentedSimpleGit(git);
}
/**
* A wrapper for SimpleGit, which is instrumented and adds an ATTR_VCS_GIT_SUBCOMMAND and ATTR_VCS_GIT_OPERATION_TYPE attribute to all calls.
*
* We purposefully use a reduced set of methods, with simpler function parameters, to reduce the complexity needed to instrument the methods that we actually need.
*
* @see SimpleGit
*/
var InstrumentedSimpleGit = class {
	git;
	constructor(git) {
		this.git = git;
	}
	version() {
		return this.git.version();
	}
	raw(args) {
		const { spanName, options } = prepareInstrumentation(args[0]);
		return instrument(spanName, () => this.git.raw(args), options);
	}
	async checkout(whatOrOptions) {
		const { spanName, options } = prepareInstrumentation("checkout");
		return await instrument(spanName, async () => {
			if (isString(whatOrOptions)) return await this.git.checkout(whatOrOptions);
			return await this.git.checkout(whatOrOptions);
		}, options);
	}
	async checkoutBranch(branch, startPoint) {
		const { spanName, options } = prepareInstrumentation("checkout");
		await instrument(spanName, () => this.git.checkoutBranch(branch, startPoint), options);
	}
	async branch(args) {
		const { spanName, options } = prepareInstrumentation("branch");
		return await instrument(spanName, () => this.git.branch(args), options);
	}
	async branchLocal() {
		const { spanName, options } = prepareInstrumentation("branch");
		return await instrument(spanName, () => this.git.branchLocal(), options);
	}
	async add(files) {
		const { spanName, options } = prepareInstrumentation("add");
		return await instrument(spanName, () => this.git.add(files), options);
	}
	async addConfig(key, value) {
		const { spanName, options } = prepareInstrumentation("config");
		await instrument(spanName, () => this.git.addConfig(key, value), options);
	}
	async rm(files) {
		const { spanName, options } = prepareInstrumentation("rm");
		await instrument(spanName, () => this.git.rm(files), options);
	}
	async reset(modeOrOptions) {
		const { spanName, options } = prepareInstrumentation("reset");
		await instrument(spanName, () => this.git.reset(modeOrOptions), options);
	}
	async merge(args) {
		const { spanName, options } = prepareInstrumentation("merge");
		await instrument(spanName, () => this.git.merge(args), options);
	}
	async push(...args) {
		const { spanName, options } = prepareInstrumentation("push");
		return await instrument(spanName, () => this.git.push(...args), options);
	}
	async pull(args) {
		const { spanName, options } = prepareInstrumentation("pull");
		return await instrument(spanName, () => this.git.pull(args), options);
	}
	async fetch(args) {
		const { spanName, options } = prepareInstrumentation("fetch");
		return await instrument(spanName, () => this.git.fetch(args), options);
	}
	async clone(repo, dir, options) {
		const { spanName, options: spanOptions } = prepareInstrumentation("clone");
		await instrument(spanName, () => this.git.clone(repo, dir, options), spanOptions);
	}
	commit(message, files, options) {
		const { spanName, options: spanOptions } = prepareInstrumentation("clone");
		return instrument(spanName, () => this.git.commit(message, files, options), spanOptions);
	}
	status(args) {
		const { spanName, options } = prepareInstrumentation("status");
		return instrument(spanName, () => this.git.status(args), options);
	}
	async log(options) {
		const { spanName, options: spanOptions } = prepareInstrumentation("log");
		return await instrument(spanName, () => this.git.log(options), spanOptions);
	}
	async revparse(optionOrOptions) {
		const { spanName, options } = prepareInstrumentation("log");
		return await instrument(spanName, async () => {
			if (isString(optionOrOptions)) return await this.git.revparse(optionOrOptions);
			return await this.git.revparse(optionOrOptions);
		}, options);
	}
	async show(args) {
		const { spanName, options } = prepareInstrumentation("show");
		return await instrument(spanName, () => this.git.show(args), options);
	}
	async diff(args) {
		const { spanName, options } = prepareInstrumentation("diff");
		return await instrument(spanName, () => this.git.diff(args), options);
	}
	async diffSummary(options) {
		const { spanName, options: spanOptions } = prepareInstrumentation("diff");
		return await instrument(spanName, () => this.git.diffSummary(options), spanOptions);
	}
	async getRemotes(verbose) {
		const { spanName, options } = prepareInstrumentation("remote");
		return await instrument(spanName, async () => {
			if (verbose === true) return await instrument("other", () => this.git.getRemotes(true));
			return await instrument("other", () => this.git.getRemotes());
		}, options);
	}
	async addRemote(name, repo) {
		const { spanName, options } = prepareInstrumentation("remote");
		await instrument(spanName, () => this.git.addRemote(name, repo), options);
	}
	env(env) {
		this.git = this.git.env(env);
		return this;
	}
	async catFile(args) {
		const { spanName, options } = prepareInstrumentation("remote");
		return await instrument(spanName, () => this.git.catFile(args), options);
	}
	async listRemote(args) {
		const { spanName, options } = prepareInstrumentation("ls-remote");
		return await instrument(spanName, () => this.git.listRemote(args), options);
	}
	async submoduleUpdate(args) {
		const { spanName, options } = prepareInstrumentation("submodule");
		await instrument(spanName, () => this.git.submoduleUpdate(args), options);
	}
};
//#endregion
export { InstrumentedSimpleGit, instrumentGit, prepareInstrumentation };

//# sourceMappingURL=instrument.js.map