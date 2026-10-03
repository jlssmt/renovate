import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { LooseArray, LooseRecord, Nullish } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { isString, isUndefined } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/datasource/packagist/schema.ts
const MinifiedArray = z.array(z.record(z.string(), z.unknown())).transform((xs) => {
	if (xs.length === 0) return xs;
	const prevVals = {};
	for (const x of xs) {
		for (const key of Object.keys(x)) prevVals[key] ??= void 0;
		for (const key of Object.keys(prevVals)) {
			const val = x[key];
			if (val === "__unset") {
				delete x[key];
				prevVals[key] = void 0;
				continue;
			}
			if (!isUndefined(val)) {
				prevVals[key] = val;
				continue;
			}
			if (!isUndefined(prevVals[key])) {
				x[key] = prevVals[key];
				continue;
			}
		}
	}
	return xs;
});
const ComposerRelease = z.object({
	version: z.union([z.string(), z.number().transform((v) => v.toString())]),
	homepage: z.string().nullable().catch(null),
	source: z.object({ url: z.string() }).nullable().catch(null),
	time: MaybeTimestamp,
	["published-time"]: Nullish(MaybeTimestamp),
	require: z.object({ php: z.string() }).nullable().catch(null),
	abandoned: z.union([z.string(), z.boolean()]).optional().catch(void 0)
});
const ComposerReleases = z.union([MinifiedArray.pipe(LooseArray(ComposerRelease)), LooseRecord(ComposerRelease).transform((map) => Object.values(map))]).catch([]);
const ComposerPackagesResponse = z.object({
	packageName: z.string(),
	packagesResponse: z.object({ packages: z.record(z.string(), z.unknown()) })
}).transform(({ packageName, packagesResponse }) => packagesResponse.packages[packageName]).transform((xs) => ComposerReleases.parse(xs));
function parsePackagesResponse(packageName, packagesResponse) {
	try {
		return ComposerPackagesResponse.parse({
			packageName,
			packagesResponse
		});
	} catch (err) {
		logger.debug({
			packageName,
			err
		}, `Error parsing packagist response for ${packageName}`);
		return [];
	}
}
function extractReleaseResult(...composerReleasesArrays) {
	const releases = [];
	let homepage;
	let sourceUrl;
	let deprecationMessage;
	for (const composerReleasesArray of composerReleasesArrays) for (const composerRelease of composerReleasesArray) {
		const dep = {
			version: composerRelease.version.replace(regEx(/^v/), ""),
			gitRef: composerRelease.version
		};
		const releaseTimestamp = composerRelease["published-time"] ?? composerRelease.time;
		if (releaseTimestamp) dep.releaseTimestamp = releaseTimestamp;
		if (composerRelease.require?.php) dep.constraints = { php: [composerRelease.require.php] };
		if (composerRelease.abandoned) {
			dep.isDeprecated = true;
			deprecationMessage ??= getAbandonedMessage(composerRelease.abandoned);
		}
		releases.push(dep);
		if (!homepage && composerRelease.homepage) homepage = composerRelease.homepage;
		if (!sourceUrl && composerRelease.source?.url) sourceUrl = composerRelease.source.url;
	}
	if (releases.length === 0) return null;
	const result = { releases };
	if (homepage) result.homepage = homepage;
	if (sourceUrl) result.sourceUrl = sourceUrl;
	if (deprecationMessage) result.deprecationMessage = deprecationMessage;
	return result;
}
function getAbandonedMessage(abandoned) {
	const message = "This package is abandoned and no longer maintained.";
	if (isString(abandoned)) return `${message} The author suggests using the \`${abandoned}\` package instead.`;
	return message;
}
function extractDepReleases(composerReleases) {
	return extractReleaseResult(ComposerReleases.parse(composerReleases));
}
function parsePackagesResponses(packageName, packagesResponses) {
	return extractReleaseResult(...packagesResponses.map((pkgResp) => parsePackagesResponse(packageName, pkgResp)));
}
const HashSpec = z.union([z.object({ sha256: z.string().nullable() }).transform(({ sha256 }) => ({ hash: sha256 })), z.object({ sha1: z.string().nullable() }).transform(({ sha1 }) => ({ hash: sha1 }))]);
z.intersection(HashSpec, z.object({ key: z.string() }));
const PackagesResponse = z.object({ packages: LooseRecord(ComposerReleases).catch({}) });
const PackagistFile = PackagesResponse.merge(z.object({ providers: LooseRecord(HashSpec).transform((x) => Object.fromEntries(Object.entries(x).map(([key, { hash }]) => [key, hash]))).catch({}) }));
const RegistryMeta = z.record(z.string(), z.unknown()).catch({}).pipe(PackagistFile.merge(z.object({
	["includes"]: LooseRecord(HashSpec).transform((x) => Object.entries(x).map(([name, { hash }]) => ({
		key: name,
		hash
	}))).catch([]),
	["provider-includes"]: LooseRecord(HashSpec).transform((x) => Object.entries(x).map(([key, { hash }]) => ({
		key,
		hash
	}))).catch([]),
	["providers-lazy-url"]: z.string().nullable().catch(null),
	["providers-url"]: z.string().nullable().catch(null),
	["metadata-url"]: z.string().nullable().catch(null),
	["available-packages"]: z.array(z.string()).nullable().catch(null)
}))).transform(({ ["includes"]: includesFiles, ["packages"]: packages, ["provider-includes"]: files, ["providers"]: providerPackages, ["providers-lazy-url"]: providersLazyUrl, ["providers-url"]: providersUrl, ["metadata-url"]: metadataUrl, ["available-packages"]: availablePackages }) => {
	return {
		packages,
		includesFiles,
		providerPackages,
		files,
		providersUrl,
		providersLazyUrl,
		metadataUrl,
		includesPackages: {},
		availablePackages
	};
});
//#endregion
export { ComposerPackagesResponse, ComposerRelease, ComposerReleases, HashSpec, MinifiedArray, PackagesResponse, PackagistFile, RegistryMeta, extractDepReleases, extractReleaseResult, parsePackagesResponse, parsePackagesResponses };

//# sourceMappingURL=schema.js.map