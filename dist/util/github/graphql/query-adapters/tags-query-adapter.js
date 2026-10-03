import { Timestamp } from "../../../timestamp.js";
import { prepareQuery } from "../util.js";
import { z } from "zod/v4";
//#region lib/util/github/graphql/query-adapters/tags-query-adapter.ts
const key = "github-tags-datasource-v2";
const GithubGraphqlTag = z.object({
	version: z.string(),
	target: z.union([z.object({
		type: z.literal("Commit"),
		oid: z.string(),
		releaseTimestamp: Timestamp
	}), z.object({
		type: z.literal("Tag"),
		target: z.union([z.object({
			type: z.literal("Commit"),
			oid: z.string()
		}), z.object({
			type: z.literal("Tag"),
			target: z.object({ oid: z.string() })
		})]),
		tagger: z.object({ releaseTimestamp: Timestamp })
	})])
});
const query = prepareQuery(`
  refs(
    first: $count
    after: $cursor
    orderBy: {field: TAG_COMMIT_DATE, direction: DESC}
    refPrefix: "refs/tags/"
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
        ... on Tag {
          target {
            type: __typename
            ... on Commit {
              oid
            }
            ... on Tag {
              target {
                oid
              }
            }
          }
          tagger {
            releaseTimestamp: date
          }
        }
      }
    }
  }`);
function transform(item) {
	if (!GithubGraphqlTag.safeParse(item).success) return null;
	const { version, target } = item;
	if (target.type === "Commit") {
		const releaseTimestamp = target.releaseTimestamp;
		return {
			version,
			gitRef: version,
			hash: target.oid,
			releaseTimestamp
		};
	}
	const releaseTimestamp = target.tagger.releaseTimestamp;
	if (target.target.type === "Commit") return {
		version,
		gitRef: version,
		hash: target.target.oid,
		releaseTimestamp
	};
	return {
		version,
		gitRef: version,
		hash: target.target.target.oid,
		releaseTimestamp
	};
}
const adapter = {
	key,
	query,
	transform
};
//#endregion
export { adapter };

//# sourceMappingURL=tags-query-adapter.js.map