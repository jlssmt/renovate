import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { parseUrl, trimLeadingSlash, trimTrailingSlash } from "../../../util/url.js";
import { hostType } from "../../../util/host-rules.js";
import { detectPlatform } from "../../../util/common.js";
import { Http } from "../../../util/http/index.js";
import { BitbucketTagsDatasource } from "../bitbucket-tags/index.js";
import { GiteaTagsDatasource } from "../gitea-tags/index.js";
import { ForgejoTagsDatasource } from "../forgejo-tags/index.js";
import { GitTagsDatasource } from "../git-tags/index.js";
import { GithubTagsDatasource } from "../github-tags/index.js";
import { GitlabTagsDatasource } from "../gitlab-tags/index.js";
//#region lib/modules/datasource/go/base.ts
var BaseGoDatasource = class BaseGoDatasource {
	static gitlabHttpsRegExp = regEx(/^(?<httpsRegExpUrl>https:\/\/[^/]*gitlab\.[^/]*)\/(?<httpsRegExpName>.+?)(?:\/v\d+)?[/]?$/);
	static gitlabRegExp = regEx(/^(?<regExpUrl>gitlab\.[^/]*)\/(?<regExpPath>.+?)(?:\/v\d+)?[/]?$/);
	static gitVcsRegexp = regEx(/^(?:[^/]+)\/(?<module>.*)\.git(?:$|\/)/);
	static id = "go";
	static http = new Http(BaseGoDatasource.id);
	static async getDatasource(goModule) {
		if (goModule.startsWith("gopkg.in/")) {
			const [pkg] = goModule.replace("gopkg.in/", "").split(".");
			const packageName = pkg.includes("/") ? pkg : `go-${pkg}/${pkg}`;
			return {
				datasource: GithubTagsDatasource.id,
				packageName,
				registryUrl: "https://github.com"
			};
		}
		if (goModule.startsWith("github.com/")) {
			const split = goModule.split("/");
			const packageName = `${split[1]}/${split[2]}`;
			return {
				datasource: GithubTagsDatasource.id,
				packageName,
				registryUrl: "https://github.com"
			};
		}
		if (goModule.startsWith("bitbucket.org/")) {
			const split = goModule.split("/");
			const packageName = `${split[1]}/${split[2]}`;
			return {
				datasource: BitbucketTagsDatasource.id,
				packageName,
				registryUrl: "https://bitbucket.org"
			};
		}
		if (goModule.startsWith("code.cloudfoundry.org/")) {
			const packageName = goModule.replace("code.cloudfoundry.org", "cloudfoundry");
			return {
				datasource: GithubTagsDatasource.id,
				packageName,
				registryUrl: "https://github.com"
			};
		}
		if (goModule.startsWith("dev.azure.com/")) {
			const split = goModule.split("/");
			if (split.length > 4 && split[3] === "_git" || split.length > 3) {
				const packageName = `https://dev.azure.com/${split[1]}/${split[2]}/_git/${(split[3] === "_git" ? split[4] : split[3]).replace(regEx(/\.git$/), "")}`;
				return {
					datasource: GitTagsDatasource.id,
					packageName
				};
			}
		}
		if (goModule.startsWith("gitea.com/")) {
			const split = goModule.split("/");
			const packageName = `${split[1]}/${split[2]}`;
			return {
				datasource: GiteaTagsDatasource.id,
				packageName,
				registryUrl: "https://gitea.com"
			};
		}
		if (goModule.startsWith("code.forgejo.org/")) {
			const split = goModule.split("/");
			const packageName = `${split[1]}/${split[2]}`;
			return {
				datasource: ForgejoTagsDatasource.id,
				packageName,
				registryUrl: "https://code.forgejo.org"
			};
		}
		if (goModule.startsWith("codeberg.org/")) {
			const split = goModule.split("/");
			const packageName = `${split[1]}/${split[2]}`;
			return {
				datasource: ForgejoTagsDatasource.id,
				packageName,
				registryUrl: "https://codeberg.org"
			};
		}
		return await BaseGoDatasource.goGetDatasource(goModule);
	}
	static async goGetDatasource(goModule) {
		const pkgUrl = `https://${goModule.replace(regEx(/\.git(?:\/[a-z0-9/]*)?$/), "")}?go-get=1`;
		const { body: html } = await BaseGoDatasource.http.getText(pkgUrl);
		const goSourceHeader = BaseGoDatasource.goSourceHeader(html, goModule);
		if (goSourceHeader) return goSourceHeader;
		const goImport = BaseGoDatasource.goImportHeader(html, goModule);
		if (goImport) return goImport;
		logger.trace({ goModule }, "No go-source or go-import header found");
		/* istanbul ignore next */
		return null;
	}
	static goSourceHeader(html, goModule) {
		const sourceMatchGroups = regEx(/<meta\s+name="?go-source"?\s+content="(?<prefix>[^"\s]+)\s+(?<goSourceUrl>[^"\s]+)/).exec(html)?.groups;
		if (!sourceMatchGroups) return null;
		const { prefix, goSourceUrl } = sourceMatchGroups;
		if (!goModule.startsWith(prefix)) {
			logger.trace({ goModule }, "go-source header prefix not match");
			return null;
		}
		logger.debug(`Go lookup source url ${goSourceUrl} for module ${goModule}`);
		return this.detectDatasource(goSourceUrl, goModule);
	}
	static detectDatasource(metadataUrl, goModule) {
		if (metadataUrl.startsWith("https://github.com/")) return {
			datasource: GithubTagsDatasource.id,
			packageName: metadataUrl.replace("https://github.com/", "").replace(regEx(/\/$/), ""),
			registryUrl: "https://github.com"
		};
		const gitlabModuleName = BaseGoDatasource.gitlabRegExp.exec(goModule)?.groups?.regExpPath;
		const vcsIndicatedModule = BaseGoDatasource.gitVcsRegexp.exec(goModule)?.groups?.module;
		const metadataUrlMatchGroups = BaseGoDatasource.gitlabHttpsRegExp.exec(metadataUrl)?.groups;
		if (metadataUrlMatchGroups) {
			const { httpsRegExpUrl, httpsRegExpName } = metadataUrlMatchGroups;
			let packageName = vcsIndicatedModule ?? gitlabModuleName;
			if (!vcsIndicatedModule && httpsRegExpName && gitlabModuleName) {
				const metadataPath = httpsRegExpName;
				if (gitlabModuleName.startsWith(`${metadataPath}/`)) packageName = metadataPath;
			}
			packageName = packageName ?? httpsRegExpName;
			return {
				datasource: GitlabTagsDatasource.id,
				registryUrl: httpsRegExpUrl,
				packageName
			};
		}
		if (hostType({ url: metadataUrl }) === "gitlab") {
			const parsedUrl = parseUrl(metadataUrl);
			if (!parsedUrl) {
				logger.trace({ goModule }, "Could not parse go-source URL");
				return null;
			}
			const endpoint = GlobalConfig.get("endpoint");
			const endpointPrefix = regEx(/https:\/\/[^/]+\/(?<prefix>.*?\/)(?:api\/v4\/?)?/).exec(endpoint)?.groups?.prefix;
			let packageName = vcsIndicatedModule ?? trimLeadingSlash(parsedUrl.pathname);
			if (endpointPrefix && endpointPrefix !== "api/") packageName = packageName.replace(endpointPrefix, "");
			const registryUrl = endpointPrefix ? endpoint.replace(regEx(/\/api\/v4\/?$/), "/") : `${parsedUrl.protocol}//${parsedUrl.host}`;
			return {
				datasource: GitlabTagsDatasource.id,
				registryUrl,
				packageName
			};
		}
		return null;
	}
	static goImportHeader(html, goModule) {
		const importMatchGroups = regEx(/<meta\s+name="?go-import"?\s+content="(?<prefix>[^"\s]+)\s+(?<proto>[^"\s]+)\s+(?<goImportURL>[^"\s]+)/).exec(html)?.groups;
		if (!importMatchGroups) {
			logger.trace({ goModule }, "No go-source or go-import header found");
			return null;
		}
		const { prefix, proto, goImportURL } = importMatchGroups;
		if (!goModule.startsWith(prefix)) {
			logger.trace({ goModule }, "go-import header prefix not match");
			return null;
		}
		if (proto !== "git") {
			logger.trace({ goModule }, "go-import header proto not git");
			return null;
		}
		const parsedUrl = parseUrl(goImportURL);
		if (!parsedUrl) {
			logger.trace({ goModule }, "Could not parse go-import URL");
			return null;
		}
		logger.debug(`Go module: ${goModule} lookup import url ${goImportURL}`);
		const datasource = this.detectDatasource(goImportURL.replace(regEx(/\.git$/), ""), goModule);
		if (datasource !== null) return datasource;
		switch (detectPlatform(goImportURL)) {
			case "github": {
				const packageName = trimTrailingSlash(`${parsedUrl.pathname}`).replace(regEx(/\.git$/), "").split("/").slice(-2).join("/");
				return {
					datasource: GithubTagsDatasource.id,
					registryUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
					packageName
				};
			}
			case "azure": return {
				datasource: GitTagsDatasource.id,
				packageName: goImportURL.replace(regEx(/\.git$/), "")
			};
			default: return {
				datasource: GitTagsDatasource.id,
				packageName: goImportURL
			};
		}
	}
};
//#endregion
export { BaseGoDatasource };

//# sourceMappingURL=base.js.map