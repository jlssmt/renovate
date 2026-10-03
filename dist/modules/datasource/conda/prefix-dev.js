import { isNotNullOrUndefined } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { PagedResponse } from "./schema/prefix-dev.js";
//#region lib/modules/datasource/conda/prefix-dev.ts
const MAX_PREFIX_DEV_GRAPHQL_PAGE = 100;
const query = `
query search($channel: String!, $package: String!, $page: Int = 0) {
  package(channelName: $channel, name: $package) {
    variants(limit: 500, page: $page) {
      pages
      page {
        createdAt
        version
        yankedReason
        urls {
          url
          kind
        }
      }
    }
  }
}
`;
async function getReleases(http, channel, packageName) {
	logger.debug({
		channel,
		packageName
	}, "lookup package from prefix.dev graphql API");
	const files = await getPagedResponse(http, query, {
		channel,
		package: packageName
	});
	if (!files.length) return null;
	let homepage = void 0;
	let sourceUrl = void 0;
	const releases = {};
	for (const file of files) {
		const version = file.version;
		homepage ??= file.urls.HOME;
		sourceUrl ??= file.urls.DEV;
		releases[version] ??= { version };
		releases[version].releaseTimestamp = releases[version].releaseTimestamp ?? MaybeTimestamp.parse(file.createdAt);
		releases[version].isDeprecated ??= isNotNullOrUndefined(file.yankedReason);
	}
	return {
		homepage,
		sourceUrl,
		releases: Object.values(releases)
	};
}
async function getPagedResponse(http, query, data) {
	const result = [];
	for (let page = 0; page <= MAX_PREFIX_DEV_GRAPHQL_PAGE; page++) {
		const currentPage = (await http.postJson("https://prefix.dev/api/graphql", { body: {
			operationName: "search",
			query,
			variables: {
				...data,
				page
			}
		} }, PagedResponse)).body.data.package?.variants;
		if (!currentPage) break;
		result.push(...currentPage.page);
		if (page >= currentPage.pages - 1) break;
	}
	return result;
}
//#endregion
export { getReleases };

//# sourceMappingURL=prefix-dev.js.map