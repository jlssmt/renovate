import { RegExpVersioningApi } from "../regex/index.js";
//#region lib/modules/versioning/aws-eks-addon/index.ts
const id = "aws-eks-addon";
var AwsEKSAddonVersioningApi = class AwsEKSAddonVersioningApi extends RegExpVersioningApi {
	static versionRegex = "^v?(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)(?<compatibility>-eksbuild\\.)(?<build>\\d+)$";
	constructor() {
		super(AwsEKSAddonVersioningApi.versionRegex);
	}
};
const api = new AwsEKSAddonVersioningApi();
//#endregion
export { AwsEKSAddonVersioningApi, api, api as default, id };

//# sourceMappingURL=index.js.map