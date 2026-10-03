import { coerceArray } from "../../../util/array.js";
import { Datasource } from "../datasource.js";
import { Lazy } from "../../../util/lazy.js";
import { DescribeDBEngineVersionsCommand, RDSClient } from "@aws-sdk/client-rds";
//#region lib/modules/datasource/aws-rds/index.ts
var AwsRdsDatasource = class AwsRdsDatasource extends Datasource {
	static id = "aws-rds";
	rds;
	constructor() {
		super(AwsRdsDatasource.id);
		this.rds = new Lazy(() => new RDSClient({}));
	}
	async fetchReleases({ packageName: serializedFilter }) {
		const cmd = new DescribeDBEngineVersionsCommand({ Filters: JSON.parse(serializedFilter) });
		const response = await this.rds.getValue().send(cmd);
		return { releases: coerceArray(response.DBEngineVersions).filter((version) => version.EngineVersion).map((version) => ({
			version: version.EngineVersion,
			isDeprecated: version.Status === "deprecated"
		})) };
	}
	getReleases(config) {
		return this.cached({
			key: `getReleases:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { AwsRdsDatasource };

//# sourceMappingURL=index.js.map