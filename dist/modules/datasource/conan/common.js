import { regEx } from "../../../util/regex.js";
//#region lib/modules/datasource/conan/common.ts
const defaultRegistryUrl = "https://center2.conan.io/";
const datasource = "conan";
const conanDatasourceRegex = regEx(/^(?<name>[a-zA-Z\-_0-9]+)\/(?<version>[^@/\n]+)(?<userChannel>@\S+\/\S+)$/im);
function getConanPackage(packageName) {
	return {
		conanName: packageName.split("/")[0],
		userAndChannel: packageName.split("@")[1]
	};
}
//#endregion
export { conanDatasourceRegex, datasource, defaultRegistryUrl, getConanPackage };

//# sourceMappingURL=common.js.map