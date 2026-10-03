import "../../../constants/error-messages.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { refusedHostMessage } from "../../../util/http/util.js";
import { Datasource } from "../datasource.js";
import { GithubHttp } from "../../../util/http/github.js";
import { massageGithubUrl } from "../metadata.js";
import crypto from "node:crypto";
//#region lib/modules/datasource/pod/index.ts
function shardParts(packageName) {
	return crypto.createHash("md5").update(packageName).digest("hex").slice(0, 3).split("");
}
const githubRegex = regEx(/(?<hostURL>^https:\/\/[a-zA-Z0-9-.]+)\/(?<account>[^/]+)\/(?<repo>[^/]+?)(?:\.git|\/.*)?$/);
function releasesGithubUrl(packageName, opts) {
	const { hostURL, account, repo, useShard, useSpecs } = opts;
	const prefix = hostURL && hostURL !== "https://github.com" ? `${hostURL}/api/v3/repos` : "https://api.github.com/repos";
	const shard = shardParts(packageName).join("/");
	const packageNamePath = useSpecs ? `Specs/${packageName}` : packageName;
	const shardPath = useSpecs ? `Specs/${shard}/${packageName}` : `${shard}/${packageName}`;
	return `${prefix}/${account}/${repo}/contents/${useShard ? shardPath : packageNamePath}`;
}
function handleError(packageName, err) {
	const errorData = {
		packageName,
		err
	};
	const statusCode = err.response?.statusCode ?? 0;
	if (statusCode === 429 || statusCode >= 500 && statusCode < 600) {
		logger.warn({
			packageName,
			err
		}, `CocoaPods registry failure`);
		throw new ExternalHostError(err);
	}
	if (statusCode === 401) logger.debug(errorData, "Authorization error");
	else if (statusCode === 404) logger.debug(errorData, "Package lookup error");
	else if (["host-blocked", "host-disabled"].includes(err.message)) logger.trace(errorData, refusedHostMessage(err));
	else logger.warn(errorData, "CocoaPods lookup failure: Unknown error");
}
function isDefaultRepo(url) {
	const match = githubRegex.exec(url);
	if (match?.groups) {
		const { account, repo } = match.groups;
		return account.toLowerCase() === "cocoapods" && repo.toLowerCase() === "specs";
	}
	return false;
}
function releasesCDNUrl(packageName, registryUrl) {
	return `${registryUrl}/all_pods_versions_${shardParts(packageName).join("_")}.txt`;
}
var PodDatasource = class PodDatasource extends Datasource {
	static id = "pod";
	getDefaultRegistryUrls(_packageName) {
		return ["https://cdn.cocoapods.org"];
	}
	registryStrategy = "hunt";
	githubHttp;
	constructor() {
		super(PodDatasource.id);
		this.githubHttp = new GithubHttp(PodDatasource.id);
	}
	async requestCDN(url, packageName) {
		try {
			const resp = await this.http.getText(url);
			if (resp?.body) return resp.body;
		} catch (err) {
			handleError(packageName, err);
		}
		return null;
	}
	async requestGithub(url, packageName) {
		try {
			const resp = await this.githubHttp.getJsonUnchecked(url);
			// v8 ignore else -- an empty json body throws before it gets here
			if (resp?.body) return resp.body;
		} catch (err) {
			handleError(packageName, err);
		}
		return null;
	}
	async getReleasesFromGithub(packageName, opts, useShard = true, useSpecs = true, urlFormatOptions = "withShardWithSpec") {
		const url = releasesGithubUrl(packageName, {
			...opts,
			useShard,
			useSpecs
		});
		const resp = await this.requestGithub(url, packageName);
		if (resp) return { releases: resp.map(({ name }) => ({ version: name })) };
		switch (urlFormatOptions) {
			case "withShardWithSpec": return this.getReleasesFromGithub(packageName, opts, true, false, "withShardWithoutSpec");
			case "withShardWithoutSpec": return this.getReleasesFromGithub(packageName, opts, false, true, "withSpecsWithoutShard");
			case "withSpecsWithoutShard": return this.getReleasesFromGithub(packageName, opts, false, false, "withoutSpecsWithoutShard");
			default: return null;
		}
	}
	async getReleasesFromCDN(packageName, registryUrl) {
		const url = releasesCDNUrl(packageName, registryUrl);
		const resp = await this.requestCDN(url, packageName);
		if (resp) {
			const lines = resp.split(newlineRegex);
			for (const line of lines) {
				const [name, ...versions] = line.split("/");
				if (name === packageName.replace(regEx(/\/.*$/), "")) return { releases: versions.map((version) => ({ version })) };
			}
		}
		return null;
	}
	async _getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const podName = packageName.replace(regEx(/\/.*$/), "");
		let baseUrl = registryUrl.replace(regEx(/\/+$/), "");
		if (isDefaultRepo(baseUrl)) [baseUrl] = this.getDefaultRegistryUrls("");
		let result = null;
		const match = githubRegex.exec(baseUrl);
		if (match?.groups && !baseUrl.includes("/api/pods/")) {
			baseUrl = massageGithubUrl(baseUrl);
			const { hostURL, account, repo } = match.groups;
			const opts = {
				hostURL,
				account,
				repo
			};
			result = await this.getReleasesFromGithub(podName, opts);
		} else result = await this.getReleasesFromCDN(podName, baseUrl);
		return result;
	}
	getReleases(config) {
		return withCache({
			ttlMinutes: 30,
			namespace: `datasource-${PodDatasource.id}`,
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { PodDatasource };

//# sourceMappingURL=index.js.map