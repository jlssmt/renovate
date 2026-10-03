import { Timestamp } from "../../../timestamp.js";
import { prepareQuery } from "../util.js";
import { z } from "zod/v4";
//#region lib/util/github/graphql/query-adapters/branches-query-adapter.ts
const key = "github-branches-datasource-v1";
const GithubGraphqlBranch = z.object({
	version: z.string(),
	target: z.object({
		type: z.literal("Commit"),
		oid: z.string(),
		releaseTimestamp: Timestamp
	})
});
const query = prepareQuery(`
  refs(
    first: $count
    after: $cursor
    refPrefix: "refs/heads/"
  ) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      version: name
      target {
        type: __typename
        ... on Commit {
          oid
          releaseTimestamp: committedDate
        }
      }
    }
  }`);
function transform(item) {
	if (!GithubGraphqlBranch.safeParse(item).success) return null;
	const { version, target } = item;
	const releaseTimestamp = target.releaseTimestamp;
	return {
		version,
		gitRef: version,
		hash: target.oid,
		releaseTimestamp
	};
}
const adapter = {
	key,
	query,
	transform,
	maxItems: 300
};
//#endregion
export { adapter };

//# sourceMappingURL=branches-query-adapter.js.map