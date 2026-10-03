import { logger } from "../../../../logger/index.js";
import { parseRanges, satisfiesRange, stringifyRanges } from "../range.js";
import { adapt, decrement, floor, increment } from "../version.js";
//#region lib/modules/versioning/ruby/strategies/replace.ts
function replacePart(part, to) {
	const { operator, version: ver, companion } = part;
	switch (operator) {
		case "<": return {
			...part,
			version: increment(ver, to)
		};
		case "<=": return {
			...part,
			version: to
		};
		case "~>":
			if (companion) return {
				...part,
				version: floor(adapt(to, ver)),
				companion: {
					...companion,
					version: to
				}
			};
			return {
				...part,
				version: floor(adapt(to, ver))
			};
		case ">": return {
			...part,
			version: decrement(to)
		};
		case ">=":
		case "=": return {
			...part,
			version: to
		};
		case "!=": return part;
		// istanbul ignore next
		default:
			logger.warn({ operator }, `Unsupported ruby versioning operator`);
			return {
				operator: "",
				delimiter: " ",
				version: ""
			};
	}
}
var replace_default = ({ range, to }) => {
	const parts = parseRanges(range).map((part) => {
		if (satisfiesRange(to, part)) return part;
		if (part.version.split(".").length > to.split(".").length) {
			const diff = part.version.split(".").length - to.split(".").length;
			const replacement = replacePart(part, [to, ...Array(diff).fill("0")].join("."));
			return {
				...replacement,
				version: replacement.version.split(".").slice(0, -diff).join(".")
			};
		}
		return replacePart(part, to);
	});
	return stringifyRanges(parts);
};
//#endregion
export { replace_default as default, replacePart };

//# sourceMappingURL=replace.js.map