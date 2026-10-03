import { logger } from "../../logger/index.js";
import { getExpression } from "../jsonata.js";
import { Matcher } from "./base.js";
//#region lib/util/package-rules/jsonata.ts
var JsonataMatcher = class extends Matcher {
	async matches(inputConfig, { matchJsonata }) {
		if (!matchJsonata) return null;
		for (const expressionStr of matchJsonata) {
			const expression = getExpression(expressionStr);
			if (expression instanceof Error) logger.warn({ errorMessage: expression.message }, "Invalid JSONata expression");
			else try {
				if (await expression.evaluate(inputConfig)) return true;
			} catch (err) {
				logger.warn({ err }, "Error evaluating JSONata expression");
			}
		}
		return false;
	}
};
//#endregion
export { JsonataMatcher };

//# sourceMappingURL=jsonata.js.map