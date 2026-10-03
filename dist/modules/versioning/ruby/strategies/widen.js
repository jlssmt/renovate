import { parseRanges, satisfiesRange, stringifyRanges } from "../range.js";
import { increment, pgteUpperBound } from "../version.js";
import { replacePart } from "./replace.js";
//#region lib/modules/versioning/ruby/strategies/widen.ts
var widen_default = ({ range, to }) => {
	const parts = parseRanges(range).flatMap((part) => {
		if (satisfiesRange(to, part)) return [part];
		const { operator, version: ver, companion } = part;
		switch (operator) {
			case "~>": {
				const baseVersion = companion ? companion.version : ver;
				const limit = increment(pgteUpperBound(ver), to);
				return [{
					operator: ">=",
					delimiter: " ",
					version: baseVersion
				}, {
					operator: "<",
					delimiter: " ",
					version: limit
				}];
			}
			default: return [replacePart(part, to)];
		}
	});
	return stringifyRanges(parts);
};
//#endregion
export { widen_default as default };

//# sourceMappingURL=widen.js.map