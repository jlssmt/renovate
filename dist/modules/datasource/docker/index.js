import "../../../constants/error-messages.js";
import { hasKey } from "../../../util/object.js";
import { getEnv } from "../../../util/env.js";
import { GlobalConfig } from "../../../config/global.js";
import { isDockerDigest } from "../../../util/string-match.js";
import { logger } from "../../../logger/index.js";
import { ensurePathPrefix, joinUrlParts, parseLinkHeader, parseUrl } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { id } from "../../versioning/docker/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { RequestError } from "../../../util/http/got.js";
import { Result } from "../../../util/result.js";
import "../../../util/http/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { isArtifactoryServer, isCrossOriginPaginationAllowed, resolvePaginationUrl } from "../util.js";
import { ecrPublicRegex, ecrRegex, isECRMaxResultsError } from "./ecr.js";
import { DockerHubTagsPage, ManifestJson, OciHelmConfig, OciImageConfig, QuayTagsResponse, RegistryTagsList } from "./schema.js";
import { DOCKER_HUB, dockerDatasourceId, extractDigestFromResponseBody, findHelmSourceUrl, findLatestStable, getAuthHeaders, getRegistryRepository, gitRefLabel, imageUrlLabel, isDockerHost, sourceLabel, sourceLabels } from "./common.js";
import { DockerHubCache } from "./dockerhub-cache.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/datasource/docker/index.ts
const defaultConfig = {
	commitMessageTopic: "{{{depName}}} Docker tag",
	commitMessageExtra: "to {{#if isPinDigest}}{{{newDigestShort}}}{{else}}{{#if isMajor}}{{{prettyNewMajor}}}{{else}}{{{prettyNewVersion}}}{{/if}}{{/if}}",
	digest: {
		branchTopic: "{{{depNameSanitized}}}-{{{currentValue}}}",
		commitMessageExtra: "to {{newDigestShort}}",
		commitMessageTopic: "{{{depName}}}{{#if currentValue}}:{{{currentValue}}}{{/if}} Docker digest",
		group: {
			commitMessageTopic: "{{{groupName}}}",
			commitMessageExtra: ""
		}
	},
	pin: {
		commitMessageExtra: "",
		groupName: "Docker digests",
		group: {
			commitMessageTopic: "{{{groupName}}}",
			branchTopic: "digests-pin"
		}
	}
};
var DockerDatasource = class DockerDatasource extends Datasource {
	static id = dockerDatasourceId;
	defaultVersioning = id;
	getDefaultRegistryUrls(_packageName) {
		return [DOCKER_HUB];
	}
	defaultConfig = defaultConfig;
	releaseTimestampSupport = true;
	releaseTimestampNote = "Only supported on Docker Hub: The release timestamp is determined from the `tag_last_pushed` field in the results. **NOTE**: Currently, digests will receive the same release timestamp as the `tag_last_pushed`, which means that digests may appear newer than they are - see https://github.com/renovatebot/renovate/issues/38659";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `org.opencontainers.image.source` and `org.label-schema.vcs-url` labels present in the metadata of the **latest stable** image found on the Docker registry.";
	constructor() {
		super(DockerDatasource.id);
	}
	async getManifestResponse(registryHost, dockerRepository, tag, mode = "getText") {
		logger.debug(`getManifestResponse(${registryHost}, ${dockerRepository}, ${tag}, ${mode})`);
		try {
			const headers = await getAuthHeaders(this.http, registryHost, dockerRepository);
			if (!headers) {
				logger.warn("No docker auth found - returning");
				return null;
			}
			headers.accept = [
				"application/vnd.docker.distribution.manifest.list.v2+json",
				"application/vnd.docker.distribution.manifest.v2+json",
				"application/vnd.oci.image.manifest.v1+json",
				"application/vnd.oci.image.index.v1+json"
			].join(", ");
			const url = `${registryHost}/v2/${dockerRepository}/manifests/${tag}`;
			return await this.http[mode](url, {
				headers,
				noAuth: true,
				cacheProvider: memCacheProvider
			});
		} catch (err) /* istanbul ignore next */ {
			if (err instanceof ExternalHostError) throw err;
			if (err.statusCode === 401) {
				logger.debug({
					registryHost,
					dockerRepository
				}, "Unauthorized docker lookup");
				logger.debug({ err });
				return null;
			}
			if (err.statusCode === 404) {
				logger.debug({
					err,
					registryHost,
					dockerRepository,
					tag
				}, "Docker Manifest is unknown");
				return null;
			}
			if (err.statusCode === 429 && isDockerHost(registryHost)) throw new ExternalHostError(err);
			if (err.statusCode >= 500 && err.statusCode < 600) throw new ExternalHostError(err);
			if (err.code === "ETIMEDOUT") {
				logger.debug({ registryHost }, "Timeout when attempting to connect to docker registry");
				logger.debug({ err });
				return null;
			}
			logger.debug({
				err,
				registryHost,
				dockerRepository,
				tag
			}, "Unknown Error looking up docker manifest");
			return null;
		}
	}
	async _getImageConfig(registryHost, dockerRepository, configDigest) {
		logger.trace(`getImageConfig(${registryHost}, ${dockerRepository}, ${configDigest})`);
		const headers = await getAuthHeaders(this.http, registryHost, dockerRepository);
		/* v8 ignore next -- should never happen */
		if (!headers) {
			logger.warn("No docker auth found - returning");
			return;
		}
		const url = joinUrlParts(registryHost, "v2", dockerRepository, "blobs", configDigest);
		return await this.http.getJson(url, {
			headers,
			noAuth: true
		}, OciImageConfig);
	}
	getImageConfig(registryHost, dockerRepository, configDigest) {
		return withCache({
			namespace: "datasource-docker-imageconfig",
			key: `${registryHost}:${dockerRepository}@${configDigest}`,
			ttlMinutes: 40320
		}, () => this._getImageConfig(registryHost, dockerRepository, configDigest));
	}
	async _getHelmConfig(registryHost, dockerRepository, configDigest) {
		logger.trace(`getImageConfig(${registryHost}, ${dockerRepository}, ${configDigest})`);
		const headers = await getAuthHeaders(this.http, registryHost, dockerRepository);
		/* v8 ignore next -- should never happen */
		if (!headers) {
			logger.warn("No docker auth found - returning");
			return;
		}
		const url = joinUrlParts(registryHost, "v2", dockerRepository, "blobs", configDigest);
		return await this.http.getJson(url, {
			headers,
			noAuth: true
		}, OciHelmConfig);
	}
	getHelmConfig(registryHost, dockerRepository, configDigest) {
		return withCache({
			namespace: "datasource-docker-imageconfig",
			key: `${registryHost}:${dockerRepository}@${configDigest}`,
			ttlMinutes: 40320
		}, () => this._getHelmConfig(registryHost, dockerRepository, configDigest));
	}
	async getConfigDigest(registry, dockerRepository, tag) {
		return (await this.getManifest(registry, dockerRepository, tag))?.config?.digest ?? null;
	}
	async getManifestDocument(registry, dockerRepository, tag) {
		const manifestResponse = await this.getManifestResponse(registry, dockerRepository, tag);
		/* v8 ignore next -- should never happen */
		if (!manifestResponse) return null;
		const parsed = ManifestJson.safeParse(manifestResponse.body);
		if (!parsed.success) {
			logger.debug({
				registry,
				dockerRepository,
				tag,
				body: manifestResponse.body,
				headers: manifestResponse.headers,
				err: parsed.error
			}, "Invalid manifest response");
			return null;
		}
		return parsed.data;
	}
	async resolveImageManifest(registry, dockerRepository, tag, manifest) {
		switch (manifest.mediaType) {
			case "application/vnd.docker.distribution.manifest.v2+json":
			case "application/vnd.oci.image.manifest.v1+json": return manifest;
			case "application/vnd.docker.distribution.manifest.list.v2+json":
			case "application/vnd.oci.image.index.v1+json":
				if (!manifest.manifests.length) {
					logger.debug({ manifest }, "Invalid manifest list with no manifests - returning");
					return null;
				}
				logger.trace({
					registry,
					dockerRepository,
					tag
				}, "Found manifest list, using first image");
				return this.getManifest(registry, dockerRepository, manifest.manifests[0].digest);
			// istanbul ignore next: can't happen
			default: return null;
		}
	}
	async getManifest(registry, dockerRepository, tag) {
		const manifest = await this.getManifestDocument(registry, dockerRepository, tag);
		if (!manifest) return null;
		return this.resolveImageManifest(registry, dockerRepository, tag, manifest);
	}
	async _getImageArchitecture(registryHost, dockerRepository, currentDigest) {
		try {
			let manifestResponse;
			try {
				manifestResponse = await this.getManifestResponse(registryHost, dockerRepository, currentDigest, "head");
			} catch (_err) {
				const err = _err instanceof ExternalHostError ? _err.err : /* istanbul ignore next: can never happen */ _err;
				// v8 ignore else -- needs a non-5xx failure from the manifest request
				if (typeof err.statusCode === "number" && err.statusCode >= 500 && err.statusCode < 600) return null;
				/* istanbul ignore next */
				throw _err;
			}
			if (manifestResponse?.headers["content-type"] !== "application/vnd.docker.distribution.manifest.v2+json" && manifestResponse?.headers["content-type"] !== "application/vnd.oci.image.manifest.v1+json") return null;
			const configDigest = await this.getConfigDigest(registryHost, dockerRepository, currentDigest);
			if (!configDigest) return null;
			const configResponse = await this.getImageConfig(registryHost, dockerRepository, configDigest);
			// v8 ignore else -- needs a config blob with neither key
			if (configResponse && ("config" in configResponse.body || "architecture" in configResponse.body)) {
				const architecture = configResponse.body.architecture ?? null;
				logger.debug(`Current digest ${currentDigest} relates to architecture ${architecture ?? "null"}`);
				return architecture;
			}
		} catch (err) /* istanbul ignore next */ {
			if (err.statusCode !== 404 || err.message === "page-not-found") throw err;
			logger.debug({
				registryHost,
				dockerRepository,
				currentDigest,
				err
			}, "Unknown error getting image architecture");
		}
	}
	getImageArchitecture(registryHost, dockerRepository, currentDigest) {
		return withCache({
			namespace: "datasource-docker-architecture",
			key: `${registryHost}:${dockerRepository}@${currentDigest}`,
			ttlMinutes: 40320,
			shouldCacheResult: isNonEmptyString
		}, () => this._getImageArchitecture(registryHost, dockerRepository, currentDigest));
	}
	async _getLabels(registryHost, dockerRepository, tag) {
		logger.debug(`getLabels(${registryHost}, ${dockerRepository}, ${tag})`);
		if (getEnv().RENOVATE_X_DOCKER_HUB_DISABLE_LABEL_LOOKUP && registryHost === "https://index.docker.io") {
			logger.debug("Docker Hub image - skipping label lookup due to RENOVATE_X_DOCKER_HUB_DISABLE_LABEL_LOOKUP");
			return {};
		}
		try {
			let labels = {};
			const manifestDocument = await this.getManifestDocument(registryHost, dockerRepository, tag);
			if (!manifestDocument) {
				logger.debug({
					registryHost,
					dockerRepository,
					tag
				}, "No manifest found");
				return;
			}
			if ("annotations" in manifestDocument && manifestDocument.annotations) labels = manifestDocument.annotations;
			if ("manifests" in manifestDocument) {
				const descriptorAnnotations = manifestDocument.manifests.map((descriptor) => descriptor.annotations).find((annotations) => isNonEmptyString(annotations?.["org.opencontainers.image.source"]) && isNonEmptyString(annotations?.["org.opencontainers.image.revision"]));
				if (descriptorAnnotations) labels = {
					...labels,
					...descriptorAnnotations
				};
			}
			if ("manifests" in manifestDocument && labels["org.opencontainers.image.source"] && labels["org.opencontainers.image.revision"]) return labels;
			const manifest = await this.resolveImageManifest(registryHost, dockerRepository, tag, manifestDocument);
			if (!manifest) return;
			if ("annotations" in manifest && manifest.annotations) labels = {
				...labels,
				...manifest.annotations
			};
			switch (manifest.config.mediaType) {
				case "application/vnd.cncf.helm.config.v1+json": {
					if (labels["org.opencontainers.image.source"]) return labels;
					const configResponse = await this.getHelmConfig(registryHost, dockerRepository, manifest.config.digest);
					// v8 ignore else -- needs the helm config blob request to come back empty
					if (configResponse) {
						const url = findHelmSourceUrl(configResponse.body);
						// v8 ignore else -- needs a helm chart with no source url
						if (url) labels[sourceLabel] = url;
					}
					break;
				}
				case "application/vnd.oci.image.config.v1+json":
				case "application/vnd.docker.container.image.v1+json": {
					if (labels["org.opencontainers.image.source"] && labels["org.opencontainers.image.revision"]) return labels;
					const configResponse = await this.getImageConfig(registryHost, dockerRepository, manifest.config.digest);
					/* v8 ignore next -- should never happen */
					if (!configResponse) return labels;
					const body = configResponse.body;
					if (body.config) labels = {
						...labels,
						...body.config.Labels
					};
					else logger.debug({
						headers: configResponse.headers,
						body
					}, `manifest blob response body missing the "config" property`);
					break;
				}
			}
			// v8 ignore else -- labels are always set by the branches above
			if (labels) logger.debug({ labels }, "found labels in manifest");
			return labels;
		} catch (err) /* istanbul ignore next: should be tested in future */ {
			if (err instanceof ExternalHostError) throw err;
			if (err.statusCode === 400 || err.statusCode === 401) logger.debug({
				registryHost,
				dockerRepository,
				err
			}, "Unauthorized docker lookup");
			else if (err.statusCode === 404) logger.warn({
				err,
				registryHost,
				dockerRepository,
				tag
			}, "Config Manifest is unknown");
			else if (err.statusCode === 429 && isDockerHost(registryHost)) logger.warn({ err }, "docker registry failure: too many requests");
			else if (err.statusCode >= 500 && err.statusCode < 600) logger.debug({
				err,
				registryHost,
				dockerRepository,
				tag
			}, "docker registry failure: internal error");
			else if (err.code === "ERR_TLS_CERT_ALTNAME_INVALID" || err.code === "ETIMEDOUT") logger.debug({
				registryHost,
				err
			}, "Error connecting to docker registry");
			else if (registryHost === "https://quay.io")
 // istanbul ignore next
			logger.debug("Ignoring quay.io errors until they fully support v2 schema");
			else logger.info({
				registryHost,
				dockerRepository,
				tag,
				err
			}, "Unknown error getting Docker labels");
			return {};
		}
	}
	getLabels(registryHost, dockerRepository, tag) {
		return withCache({
			namespace: "datasource-docker-labels",
			key: `${registryHost}:${dockerRepository}:${tag}`,
			ttlMinutes: 1440
		}, () => this._getLabels(registryHost, dockerRepository, tag));
	}
	async getTagsQuayRegistry(registry, repository) {
		let tags = [];
		const limit = 100;
		function pageUrl(page) {
			return `${registry}/api/v1/repository/${repository}/tag/?limit=${limit}&page=${page}&onlyActiveTags=true`;
		}
		let page = 1;
		let url = pageUrl(page);
		while (url && page <= 20) {
			const res = await this.http.getJson(url, QuayTagsResponse);
			const pageTags = res.body.tags.map((tag) => tag.name);
			tags = tags.concat(pageTags);
			page += 1;
			url = res.body.has_additional ? pageUrl(page) : null;
		}
		return tags;
	}
	async getDockerApiTags(registryHost, dockerRepository) {
		let tags = [];
		let url = `${registryHost}/${dockerRepository}/tags/list?n=${ecrRegex.test(registryHost) || ecrPublicRegex.test(registryHost) ? 1e3 : 1e4}`;
		url = ensurePathPrefix(url, "/v2");
		const headers = await getAuthHeaders(this.http, registryHost, dockerRepository, url);
		if (!headers) {
			logger.debug("Failed to get authHeaders for getTags lookup");
			return;
		}
		let page = 0;
		const pages = [
			"https://ghcr.io",
			"https://quay.io",
			"https://cgr.dev",
			"https://registry.access.redhat.com",
			"https://registry.redhat.io"
		].includes(registryHost) ? 1e3 : GlobalConfig.get("dockerMaxPages");
		logger.trace({
			registryHost,
			dockerRepository,
			pages
		}, "docker.getTags");
		const allowCrossOrigin = isCrossOriginPaginationAllowed(dockerDatasourceId);
		let foundMaxResultsError = false;
		do {
			let res;
			try {
				res = await this.http.getJson(url, {
					headers,
					noAuth: true
				}, RegistryTagsList);
			} catch (err) {
				if (!foundMaxResultsError && err instanceof RequestError && isECRMaxResultsError(err)) {
					url = `${registryHost}/${dockerRepository}/tags/list?n=1000`;
					url = ensurePathPrefix(url, "/v2");
					foundMaxResultsError = true;
					continue;
				}
				throw err;
			}
			tags = tags.concat(res.body.tags);
			const linkHeader = parseLinkHeader(res.headers.link);
			if (isArtifactoryServer(res)) {
				if (linkHeader?.next?.last) {
					const parsed = parseUrl(url);
					// v8 ignore if: url is always a valid HTTP URL as `ensurePathPrefix`
					if (!parsed) {
						url = null;
						break;
					}
					parsed.searchParams.delete("last");
					parsed.searchParams.set("last", linkHeader.next.last);
					url = parsed.href;
				} else url = null;
			} else if (linkHeader?.next?.url) {
				const nextUrl = resolvePaginationUrl(url, linkHeader.next.url, allowCrossOrigin);
				if (!nextUrl) logger.once.warn({
					registryHost,
					nextUrl: linkHeader.next.url
				}, "Ignoring cross-origin or invalid Docker registry tags pagination link");
				url = nextUrl;
			} else url = null;
			page += 1;
		} while (url && page < pages);
		return tags;
	}
	async _getTags(registryHost, dockerRepository) {
		try {
			const isQuay = registryHost === "https://quay.io";
			let tags;
			if (isQuay) try {
				tags = await this.getTagsQuayRegistry(registryHost, dockerRepository);
			} catch (err) {
				if (err.statusCode === 401) {
					logger.debug({
						registryHost,
						dockerRepository
					}, "Quay v1 API unauthorized, falling back to Docker v2 API");
					tags = await this.getDockerApiTags(registryHost, dockerRepository);
				} else throw err;
			}
			else tags = await this.getDockerApiTags(registryHost, dockerRepository);
			return tags;
		} catch (_err) /* istanbul ignore next */ {
			const err = _err instanceof ExternalHostError ? _err.err : _err;
			if ((err.statusCode === 404 || err.message === "page-not-found") && !dockerRepository.includes("/")) {
				logger.debug(`Retrying Tags for ${registryHost}/${dockerRepository} using library/ prefix`);
				return this.getTags(registryHost, `library/${dockerRepository}`);
			}
			if ((err.statusCode === 404 || err.message === "page-not-found") && isArtifactoryServer(err.response) && dockerRepository.split("/").length === 2) {
				logger.debug(`JFrog Artifactory: Retrying Tags for ${registryHost}/${dockerRepository} using library/ path between JFrog virtual repository and image`);
				const dockerRepositoryParts = dockerRepository.split("/");
				const jfrogRepository = dockerRepositoryParts[0];
				const dockerImage = dockerRepositoryParts[1];
				return this.getTags(registryHost, `${jfrogRepository}/library/${dockerImage}`);
			}
			if (err.statusCode === 429 && isDockerHost(registryHost)) {
				logger.warn({
					registryHost,
					dockerRepository,
					err
				}, "docker registry failure: too many requests");
				throw new ExternalHostError(err);
			}
			if (err.statusCode >= 500 && err.statusCode < 600) {
				logger.warn({
					registryHost,
					dockerRepository,
					err
				}, "docker registry failure: internal error");
				throw new ExternalHostError(err);
			}
			if (["ECONNRESET", "ETIMEDOUT"].includes(err.code)) {
				logger.warn({
					registryHost,
					dockerRepository,
					err
				}, "docker registry connection failure");
				throw new ExternalHostError(err);
			}
			if (isDockerHost(registryHost)) logger.info({ err }, "Docker Hub lookup failure");
			throw _err;
		}
	}
	getTags(registryHost, dockerRepository) {
		return withCache({
			namespace: "datasource-docker-tags",
			key: `${registryHost}:${dockerRepository}`,
			cacheable: registryHost === DOCKER_HUB
		}, () => this._getTags(registryHost, dockerRepository));
	}
	/**
	* docker.getDigest
	*
	* The `newValue` supplied here should be a valid tag for the docker image.
	*
	* This function will:
	*  - Look up a sha256 digest for a tag on its registry
	*  - Return the digest as a string
	*/
	async _getDigest({ registryUrl, lookupName, packageName, currentDigest }, newValue) {
		let registryHost;
		let dockerRepository;
		if (registryUrl && lookupName) {
			registryHost = registryUrl;
			dockerRepository = lookupName;
		} else ({registryHost, dockerRepository} = getRegistryRepository(packageName, registryUrl));
		logger.debug(`getDigest(${registryHost}, ${dockerRepository}, ${newValue})`);
		const newTag = isNonEmptyString(newValue) ? newValue : "latest";
		let digest = null;
		try {
			let architecture = null;
			if (currentDigest && isDockerDigest(currentDigest)) architecture = await this.getImageArchitecture(registryHost, dockerRepository, currentDigest);
			let manifestResponse = null;
			if (!architecture) {
				if (registryHost === "https://index.docker.io") {
					const cachedDigest = (await DockerHubCache.init(dockerRepository)).getDigestForTag(newTag);
					if (cachedDigest) return cachedDigest;
				}
				manifestResponse = await this.getManifestResponse(registryHost, dockerRepository, newTag, "head");
				if (manifestResponse && hasKey("docker-content-digest", manifestResponse.headers)) digest = manifestResponse.headers["docker-content-digest"] || null;
			}
			if (isNonEmptyString(architecture) || manifestResponse && !hasKey("docker-content-digest", manifestResponse.headers)) {
				if (isNonEmptyString(architecture) && registryHost === "https://index.docker.io") {
					const cachedDigest = (await DockerHubCache.init(dockerRepository)).getArchDigestForTag(newTag, architecture);
					if (cachedDigest) return cachedDigest;
				}
				logger.debug({
					registryHost,
					dockerRepository
				}, "Architecture-specific digest or missing docker-content-digest header - pulling full manifest");
				manifestResponse = await this.getManifestResponse(registryHost, dockerRepository, newTag);
				if (architecture && manifestResponse) {
					const parsed = ManifestJson.safeParse(manifestResponse.body);
					/* istanbul ignore else: hard to test */
					if (parsed.success) {
						const manifestList = parsed.data;
						if (manifestList.mediaType === "application/vnd.docker.distribution.manifest.list.v2+json" || manifestList.mediaType === "application/vnd.oci.image.index.v1+json") {
							for (const manifest of manifestList.manifests) if (manifest.platform?.architecture === architecture) {
								digest = manifest.digest;
								break;
							}
						} else if (hasKey("docker-content-digest", manifestResponse.headers)) digest = manifestResponse.headers["docker-content-digest"];
					} else logger.debug({
						registryHost,
						dockerRepository,
						newTag,
						body: manifestResponse.body,
						headers: manifestResponse.headers,
						err: parsed.error
					}, "Failed to parse manifest response");
				}
				if (!digest) {
					logger.debug({
						registryHost,
						dockerRepository,
						newTag
					}, "Extraction digest from manifest response body is deprecated");
					digest = extractDigestFromResponseBody(manifestResponse);
				}
			}
			if (!manifestResponse && !dockerRepository.includes("/") && !packageName.includes("/")) {
				logger.debug(`Retrying Digest for ${registryHost}/${dockerRepository} using library/ prefix`);
				return this.getDigest({
					registryUrl,
					packageName: `library/${packageName}`,
					currentDigest
				}, newValue);
			}
			if (manifestResponse) logger.debug(`Got docker digest ${digest}`);
		} catch (err) /* istanbul ignore next */ {
			if (err instanceof ExternalHostError) throw err;
			logger.debug({
				err,
				packageName,
				newTag
			}, "Unknown Error looking up docker image digest");
		}
		return digest;
	}
	getDigest(config, newValue) {
		const newTag = newValue ?? "latest";
		const { registryHost, dockerRepository } = getRegistryRepository(config.packageName, config.registryUrl);
		const digest = config.currentDigest ? `@${config.currentDigest}` : "";
		return withCache({
			namespace: "datasource-docker-digest",
			key: `${registryHost}:${dockerRepository}:${newTag}${digest}`,
			fallback: true,
			shouldCacheResult: isNonEmptyString
		}, () => this._getDigest(config, newValue));
	}
	async _getDockerHubTags(dockerRepository) {
		let url = `https://hub.docker.com/v2/repositories/${dockerRepository}/tags?page_size=1000&ordering=last_updated`;
		const cache = await DockerHubCache.init(dockerRepository);
		const maxPages = GlobalConfig.get("dockerMaxPages");
		const allowCrossOrigin = isCrossOriginPaginationAllowed(dockerDatasourceId);
		let page = 0, needNextPage = true;
		while (needNextPage && page < maxPages) {
			const { val, err } = await this.http.getJsonSafe(url, DockerHubTagsPage).unwrap();
			if (err) {
				logger.debug({ err }, `Docker: error fetching data from DockerHub`);
				return null;
			}
			page++;
			const { results, next, count } = val;
			needNextPage = cache.reconcile(results, count);
			if (!next) break;
			const nextUrl = resolvePaginationUrl(url, next, allowCrossOrigin);
			if (!nextUrl) {
				logger.once.warn({
					dockerRepository,
					nextUrl: next
				}, "Ignoring cross-origin or invalid Docker Hub tags pagination link");
				break;
			}
			url = nextUrl;
		}
		await cache.save();
		return cache.getItems().map(({ name: version, tag_last_pushed }) => {
			const release = { version };
			const releaseTimestamp = asTimestamp(tag_last_pushed);
			if (releaseTimestamp) release.releaseTimestamp = releaseTimestamp;
			return release;
		});
	}
	getDockerHubTags(dockerRepository) {
		return withCache({
			namespace: "datasource-docker-hub-tags",
			key: `${dockerRepository}`
		}, () => this._getDockerHubTags(dockerRepository));
	}
	/**
	* docker.getReleases
	*
	* A docker image usually looks something like this: somehost.io/owner/repo:8.1.0-alpine
	* In the above:
	*  - 'somehost.io' is the registry
	*  - 'owner/repo' is the package name
	*  - '8.1.0-alpine' is the tag
	*
	* This function will filter only tags that contain a semver version
	*/
	async _getReleases({ packageName, registryUrl }) {
		const { registryHost, dockerRepository } = getRegistryRepository(packageName, registryUrl);
		const getTags = () => Result.wrapNullable(this.getTags(registryHost, dockerRepository), "tags-error").transform((tags) => tags.map((version) => ({ version })));
		const getDockerHubTags = () => Result.wrapNullable(this.getDockerHubTags(dockerRepository), "dockerhub-error").catch(getTags);
		const { val: releases, err } = await (registryHost === "https://index.docker.io" && !getEnv().RENOVATE_X_DOCKER_HUB_TAGS_DISABLE ? getDockerHubTags() : getTags()).unwrap();
		if (err instanceof Error) throw err;
		else if (err) return null;
		const ret = {
			registryUrl: registryHost,
			releases
		};
		if (dockerRepository !== packageName) ret.lookupName = dockerRepository;
		const tags = releases.map((release) => release.version);
		const latestTag = tags.includes("latest") ? "latest" : findLatestStable(tags) ?? tags.at(-1);
		/* v8 ignore next -- TODO: add test */
		if (!latestTag) return ret;
		const labels = await this.getLabels(registryHost, dockerRepository, latestTag);
		if (labels) {
			if (isNonEmptyString(labels["org.opencontainers.image.revision"])) ret.gitRef = labels[gitRefLabel];
			for (const label of sourceLabels) if (isNonEmptyString(labels[label])) {
				ret.sourceUrl = labels[label];
				break;
			}
			if (isNonEmptyString(labels["org.opencontainers.image.url"])) ret.homepage = labels[imageUrlLabel];
		}
		return ret;
	}
	getReleases(config) {
		const { registryHost, dockerRepository } = getRegistryRepository(config.packageName, config.registryUrl);
		return withCache({
			namespace: "datasource-docker-releases-v2",
			key: `${registryHost}:${dockerRepository}`,
			cacheable: registryHost === DOCKER_HUB,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { DockerDatasource };

//# sourceMappingURL=index.js.map