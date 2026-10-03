import { GithubGraphqlDatasourceFetcher } from "./datasource-fetcher.js";
import { adapter } from "./query-adapters/branches-query-adapter.js";
import { adapter as adapter$1 } from "./query-adapters/releases-query-adapter.js";
import { adapter as adapter$2 } from "./query-adapters/tags-query-adapter.js";
//#region lib/util/github/graphql/index.ts
async function queryTags(config, http) {
	return await GithubGraphqlDatasourceFetcher.query(config, http, adapter$2);
}
async function queryReleases(config, http) {
	return await GithubGraphqlDatasourceFetcher.query(config, http, adapter$1);
}
async function queryBranches(config, http) {
	return await GithubGraphqlDatasourceFetcher.query(config, http, adapter);
}
//#endregion
export { queryBranches, queryReleases, queryTags };

//# sourceMappingURL=index.js.map