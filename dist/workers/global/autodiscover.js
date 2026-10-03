import { matchRegexOrGlobList } from "../../util/string-match.js";
import { logger } from "../../logger/index.js";
import { platform } from "../../modules/platform/index.js";
import { isString } from "@sindresorhus/is";
//#region lib/workers/global/autodiscover.ts
// istanbul ignore next
function repoName(value) {
	return String(isString(value) ? value : value.repository).toLowerCase();
}
async function autodiscoverRepositories(config) {
	const { autodiscoverFilter } = config;
	if (config.platform === "local") {
		if (config.repositories?.length) {
			logger.debug({ repositories: config.repositories }, "Found repositories when in local mode");
			throw new Error("Invalid configuration: repositories list not supported when platform=local");
		}
		config.repositories = ["local"];
		return config;
	}
	if (!config.autodiscover) {
		if (!config.repositories?.length) logger.warn("No repositories found - did you want to run with flag --autodiscover?");
		return config;
	}
	const autodiscoverConfig = {
		topics: config.autodiscoverTopics,
		sort: config.autodiscoverRepoSort,
		order: config.autodiscoverRepoOrder,
		includeMirrors: config.includeMirrors,
		namespaces: config.autodiscoverNamespaces,
		projects: config.autodiscoverProjects
	};
	logger.debug({ autodiscoverConfig }, `Attempting to autodiscover ${config.platform} repositories`);
	let discovered = await platform.getRepos(autodiscoverConfig);
	if (!discovered?.length) {
		logger.debug("No repositories were autodiscovered");
		return config;
	}
	logger.debug(`Autodiscovered ${discovered.length} repositories`);
	logger.trace({
		length: discovered.length,
		repositories: discovered
	}, `Autodiscovered repositories`);
	if (autodiscoverFilter) {
		logger.debug({ autodiscoverFilter }, "Applying autodiscoverFilter");
		discovered = applyFilters(discovered, isString(autodiscoverFilter) ? [autodiscoverFilter] : autodiscoverFilter);
		if (!discovered.length) {
			logger.debug("None of the discovered repositories matched the filter");
			return config;
		}
	}
	logger.info({
		length: discovered.length,
		repositories: discovered
	}, `Autodiscovered repositories`);
	// istanbul ignore if
	if (config.repositories?.length) {
		logger.debug("Checking autodiscovered repositories against configured repositories");
		for (const configuredRepo of config.repositories) {
			const repository = repoName(configuredRepo);
			let found = false;
			for (let i = discovered.length - 1; i > -1; i -= 1) if (repository === repoName(discovered[i])) {
				found = true;
				logger.debug({ repository }, "Using configured repository settings");
				discovered[i] = configuredRepo;
			}
			if (!found) logger.warn({ repository }, "Configured repository is in not in autodiscover list");
		}
	}
	return {
		...config,
		repositories: discovered
	};
}
function applyFilters(repos, filters) {
	return repos.filter((repo) => matchRegexOrGlobList(repo, filters));
}
//#endregion
export { applyFilters, autodiscoverRepositories };

//# sourceMappingURL=autodiscover.js.map