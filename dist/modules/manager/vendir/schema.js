import { regEx } from "../../../util/regex.js";
import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/vendir/schema.ts
const VendirResource = z.object({
	apiVersion: z.literal("vendir.k14s.io/v1alpha1"),
	kind: z.literal("Config")
});
const GitRef = z.object({
	ref: z.string(),
	url: z.string().regex(regEx(/^(?:ssh|https?):\/\/.+/)),
	depth: z.number().optional()
});
const GithubRelease = z.object({
	slug: z.string(),
	tag: z.string()
});
const HelmChart = z.object({
	name: z.string(),
	version: z.string(),
	repository: z.object({ url: z.string().regex(regEx(/^(?:oci|https?):\/\/.+/)) })
});
const HelmChartContent = z.object({
	path: z.string(),
	helmChart: HelmChart
});
const GitRefContent = z.object({
	path: z.string(),
	git: GitRef
});
const GithubReleaseContent = z.object({
	path: z.string(),
	githubRelease: GithubRelease
});
const HttpRelease = z.object({ url: z.string() });
const HttpContent = z.object({
	path: z.string(),
	http: HttpRelease
});
const Contents = z.union([
	HelmChartContent,
	GitRefContent,
	GithubReleaseContent,
	HttpContent
]);
const Vendir = VendirResource.extend({ directories: z.array(z.object({
	path: z.string(),
	contents: LooseArray(Contents)
})) });
//#endregion
export { Contents, GitRef, GitRefContent, GithubRelease, GithubReleaseContent, HelmChart, HelmChartContent, HttpContent, HttpRelease, Vendir, VendirResource };

//# sourceMappingURL=schema.js.map