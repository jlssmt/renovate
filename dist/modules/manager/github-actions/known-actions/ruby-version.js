import { RubyVersionDatasource } from "../../../datasource/ruby-version/index.js";
import { partialValSchema } from "./utils.js";
//#region lib/modules/manager/github-actions/known-actions/ruby-version.ts
const rubyVersionActions = { "ruby/setup-ruby": {
	datasource: RubyVersionDatasource.id,
	packageName: "ruby",
	withSchema: partialValSchema("ruby-version")
} };
//#endregion
export { rubyVersionActions };

//# sourceMappingURL=ruby-version.js.map