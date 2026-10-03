import { map } from "../../../util/promises.js";
import { getChangeLogJSON } from "../update/pr/changelog/index.js";
//#region lib/workers/repository/changelog/index.ts
async function embedChangelog(upgrade) {
	if (upgrade.logJSON !== void 0) return;
	if (upgrade.changelogContent === void 0) upgrade.logJSON = await getChangeLogJSON(upgrade);
	else upgrade.logJSON = {
		hasReleaseNotes: true,
		project: {
			packageName: upgrade.packageName,
			depName: upgrade.depName,
			type: void 0,
			apiBaseUrl: void 0,
			baseUrl: void 0,
			repository: upgrade.repository,
			sourceUrl: upgrade.sourceUrl,
			sourceDirectory: upgrade.sourceDirectory
		},
		versions: [{
			changes: void 0,
			compare: void 0,
			date: void 0,
			releaseNotes: {
				body: upgrade.changelogContent,
				notesSourceUrl: void 0,
				url: upgrade.changelogUrl
			},
			gitRef: void 0,
			version: upgrade.newVersion
		}]
	};
}
async function embedChangelogs({ upgrades, stage }) {
	const filteredUpgrades = upgrades.filter((upgrade) => upgrade.fetchChangeLogs === stage);
	await map(filteredUpgrades, embedChangelog, { concurrency: 10 });
}
//#endregion
export { embedChangelog, embedChangelogs };

//# sourceMappingURL=index.js.map