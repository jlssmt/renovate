import { parse } from "./parser.js";
//#region lib/modules/manager/cpanfile/extract.ts
function extractPackageFile(content, _packageFile) {
	const result = parse(content);
	if (!result?.deps.length) return null;
	const { deps, perlVersion } = result;
	const extractedConstraints = perlVersion ? { perl: perlVersion } : void 0;
	return {
		deps,
		...extractedConstraints && { extractedConstraints }
	};
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map