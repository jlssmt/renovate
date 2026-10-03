//#region lib/constants/platforms.ts
const PLATFORM_HOST_TYPES = [
	"azure",
	"bitbucket",
	"bitbucket-server",
	"codecommit",
	"forgejo",
	"gerrit",
	"gitea",
	"github",
	"gitlab",
	"local",
	"scm-manager"
];
/**
* Capabilities of each platform family, so that a consumer which detected a
* family with `detectPlatform` can look the rest up instead of carrying its own
* mapping.
*
* Keys are ordered the way `detectPlatform` used to test them; both the
* `apiUsingHostTypes` and the `knownHosts` sets are pairwise disjoint
*/
const PLATFORM_FAMILIES = {
	azure: {
		apiUsingHostTypes: ["azure", "azure-tags"],
		knownHosts: ["dev.azure.com"],
		tagsDatasource: "azure-tags",
		apiBaseUrl: null,
		webDirPath: "tree/HEAD"
	},
	"bitbucket-server": {
		apiUsingHostTypes: [
			"bitbucket-server",
			"bitbucket-server-changelog",
			"bitbucket-server-tags"
		],
		knownHosts: [],
		tagsDatasource: "bitbucket-server-tags",
		apiBaseUrl: (baseUrl) => `${baseUrl}rest/api/1.0/`,
		webDirPath: "browse"
	},
	bitbucket: {
		apiUsingHostTypes: [
			"bitbucket",
			"bitbucket-changelog",
			"bitbucket-tags"
		],
		knownHosts: ["bitbucket.org", "bitbucket.com"],
		tagsDatasource: "bitbucket-tags",
		apiBaseUrl: (_baseUrl) => "https://api.bitbucket.org/",
		webDirPath: "src/HEAD"
	},
	forgejo: {
		apiUsingHostTypes: [
			"forgejo",
			"forgejo-changelog",
			"forgejo-releases",
			"forgejo-tags"
		],
		knownHosts: ["codeberg.org", "codefloe.com"],
		tagsDatasource: "forgejo-tags",
		apiBaseUrl: (baseUrl) => `${baseUrl}api/v1/`,
		webDirPath: "tree/HEAD"
	},
	gitea: {
		apiUsingHostTypes: [
			"gitea",
			"gitea-changelog",
			"gitea-releases",
			"gitea-tags"
		],
		knownHosts: ["gitea.com"],
		tagsDatasource: "gitea-tags",
		apiBaseUrl: (baseUrl) => `${baseUrl}api/v1/`,
		webDirPath: "tree/HEAD"
	},
	github: {
		apiUsingHostTypes: [
			"github",
			"github-releases",
			"github-release-attachments",
			"github-tags",
			"pod",
			"hermit",
			"github-changelog",
			"conan"
		],
		knownHosts: ["github.com"],
		tagsDatasource: "github-tags",
		apiBaseUrl: (baseUrl) => baseUrl.startsWith("https://github.com/") ? "https://api.github.com/" : `${baseUrl}api/v3/`,
		webDirPath: "tree/HEAD"
	},
	gitlab: {
		apiUsingHostTypes: [
			"gitlab",
			"gitlab-releases",
			"gitlab-tags",
			"gitlab-packages",
			"gitlab-changelog",
			"pypi"
		],
		knownHosts: ["gitlab.com"],
		tagsDatasource: "gitlab-tags",
		apiBaseUrl: (baseUrl) => `${baseUrl}api/v4/`,
		webDirPath: "tree/HEAD"
	}
};
//#endregion
export { PLATFORM_FAMILIES, PLATFORM_HOST_TYPES };

//# sourceMappingURL=platforms.js.map