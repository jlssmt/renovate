import { logger } from "../../logger/index.js";
import { queryTags } from "./graphql/index.js";
//#region lib/util/github/tags.ts
async function findCommitOfTag(registryUrl, packageName, tag, http) {
	logger.trace(`github/tags.findCommitOfTag(${packageName}, ${tag})`);
	try {
		const tags = await queryTags({
			packageName,
			registryUrl
		}, http);
		if (!tags.length) logger.debug(`github/tags.findCommitOfTag(): No tags found for ${packageName}`);
		const tagItem = tags.find(({ version }) => version === tag);
		if (tagItem) {
			if (tagItem.hash) return tagItem.hash;
			logger.debug(`github/tags.findCommitOfTag: Tag ${tag} has no hash for ${packageName}`);
		} else logger.debug(`github/tags.findCommitOfTag: Tag ${tag} not found for ${packageName}`);
	} catch (err) {
		logger.debug({
			githubRepo: packageName,
			err
		}, "Error getting tag commit from GitHub repo");
	}
	return null;
}
//#endregion
export { findCommitOfTag };

//# sourceMappingURL=tags.js.map