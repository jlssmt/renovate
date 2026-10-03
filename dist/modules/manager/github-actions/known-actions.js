import { actionSchema } from "./known-actions/utils.js";
import { crateDynamicActions } from "./known-actions/crate-dynamic.js";
import { dartVersionActions } from "./known-actions/dart-version.js";
import { dockerActions } from "./known-actions/docker.js";
import { dockerDynamicActions } from "./known-actions/docker-dynamic.js";
import { dotnetVersionActions } from "./known-actions/dotnet-version.js";
import { githubReleaseAttachmentsDynamicActions } from "./known-actions/github-release-attachments-dynamic.js";
import { githubReleasesActions } from "./known-actions/github-releases.js";
import { githubReleasesDynamicActions } from "./known-actions/github-releases-dynamic.js";
import { gradleVersionActions } from "./known-actions/gradle-version.js";
import { javaVersionDynamicActions } from "./known-actions/java-version-dynamic.js";
import { multipleActions } from "./known-actions/multiple.js";
import { npmActions } from "./known-actions/npm.js";
import { pypiActions } from "./known-actions/pypi.js";
import { rubyVersionActions } from "./known-actions/ruby-version.js";
import { rustVersionActions } from "./known-actions/rust-version.js";
import { rustVersionDynamicActions } from "./known-actions/rust-version-dynamic.js";
//#region lib/modules/manager/github-actions/known-actions.ts
/**
* Community-maintained and first-party (GitHub's own `actions/*`) Actions
* with known version input schemas.
*/
const knownActions = {
	...dockerActions,
	...dockerDynamicActions,
	...dartVersionActions,
	...dotnetVersionActions,
	...githubReleasesActions,
	...githubReleasesDynamicActions,
	...githubReleaseAttachmentsDynamicActions,
	...gradleVersionActions,
	...javaVersionDynamicActions,
	...npmActions,
	...pypiActions,
	...rubyVersionActions,
	...rustVersionActions,
	...rustVersionDynamicActions,
	...crateDynamicActions,
	...multipleActions
};
//#endregion
export { actionSchema, knownActions };

//# sourceMappingURL=known-actions.js.map