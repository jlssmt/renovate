import changelog_urls_default from "../../data/changelog-urls.js";
import source_urls_default from "../../data/source-urls.js";
//#region lib/modules/datasource/metadata-manual.ts
const { $schema: _changelogSchema, ...changelogUrls } = changelog_urls_default;
const manualChangelogUrls = changelogUrls;
const { $schema: _sourceUrlSchema, ...sourceUrls } = source_urls_default;
const manualSourceUrls = sourceUrls;
//#endregion
export { manualChangelogUrls, manualSourceUrls };

//# sourceMappingURL=metadata-manual.js.map