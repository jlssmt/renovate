import { PypiDatasource } from "../../../datasource/pypi/index.js";
import { valSchema } from "./utils.js";
//#region lib/modules/manager/github-actions/known-actions/pypi.ts
const pypiActions = {
	"abatilo/actions-poetry": {
		datasource: PypiDatasource.id,
		packageName: "poetry",
		withSchema: valSchema("poetry-version")
	},
	"pdm-project/setup-pdm": {
		datasource: PypiDatasource.id,
		packageName: "pdm"
	},
	"PyO3/maturin-action": {
		datasource: PypiDatasource.id,
		packageName: "maturin",
		withSchema: valSchema("maturin-version")
	},
	"snok/install-poetry": {
		datasource: PypiDatasource.id,
		packageName: "poetry"
	}
};
//#endregion
export { pypiActions };

//# sourceMappingURL=pypi.js.map