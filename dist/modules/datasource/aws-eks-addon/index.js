import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { find } from "../../../util/host-rules.js";
import { id } from "../../versioning/aws-eks-addon/index.js";
import { Datasource } from "../datasource.js";
import { EksAddonsFilter } from "./schema.js";
import { isTruthy } from "@sindresorhus/is";
import { DescribeAddonVersionsCommand, EKSClient } from "@aws-sdk/client-eks";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
//#region lib/modules/datasource/aws-eks-addon/index.ts
var AwsEKSAddonDataSource = class AwsEKSAddonDataSource extends Datasource {
	static id = "aws-eks-addon";
	defaultVersioning = id;
	clients = {};
	constructor() {
		super(AwsEKSAddonDataSource.id);
	}
	async fetchReleases({ packageName: serializedFilter }) {
		const res = EksAddonsFilter.safeParse(serializedFilter);
		if (!res.success) {
			logger.warn({
				err: res.error,
				serializedFilter
			}, "Error parsing eks-addons config.");
			return null;
		}
		const filter = res.data;
		const cmd = new DescribeAddonVersionsCommand({
			kubernetesVersion: filter.kubernetesVersion,
			addonName: filter.addonName,
			maxResults: 1
		});
		const response = await this.getClient(filter).send(cmd);
		return { releases: coerceArray(response.addons).flatMap((addon) => {
			return addon.addonVersions;
		}).filter(isTruthy).map((versionInfo) => ({
			version: versionInfo.addonVersion ?? "",
			default: versionInfo.compatibilities?.some((comp) => comp.defaultVersion) ?? false,
			compatibleWith: versionInfo.compatibilities?.flatMap((comp) => comp.clusterVersion)
		})).filter((release) => release.version && release.version !== "").filter((release) => {
			if (filter.default) return release.default && release.default === filter.default;
			return true;
		}) };
	}
	getReleases(config) {
		return this.cached({
			key: `getReleases:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
	getClient({ region, profile }) {
		const cacheKey = `${region ?? "default"}#${profile ?? "default"}`;
		if (!(cacheKey in this.clients)) {
			const { password, token, username } = find({ hostType: AwsEKSAddonDataSource.id });
			this.clients[cacheKey] = new EKSClient({
				...region && { region },
				credentials: username && password ? {
					accessKeyId: username,
					secretAccessKey: password,
					sessionToken: token
				} : fromNodeProviderChain(profile ? { profile } : void 0)
			});
		}
		return this.clients[cacheKey];
	}
};
//#endregion
export { AwsEKSAddonDataSource };

//# sourceMappingURL=index.js.map