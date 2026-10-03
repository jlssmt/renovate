import { BitriseDatasource } from "../../datasource/bitrise/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { isEmptyString, isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/bitrise/utils.ts
function parseStep(stepRef, defaultRegistry) {
	if (isEmptyString(stepRef)) return null;
	const dep = {
		datasource: BitriseDatasource.id,
		replaceString: stepRef
	};
	const [ref, currentValue] = stepRef.split("@", 2);
	const refDep = parseStepRef(ref, defaultRegistry);
	if (isNullOrUndefined(currentValue)) return {
		...dep,
		packageName: stepRef,
		skipReason: "unspecified-version"
	};
	return {
		...dep,
		...refDep,
		currentValue
	};
}
function parseStepRef(ref, defaultRegistry) {
	if (ref.startsWith("path::")) return {
		depName: ref.split("::", 2)[1],
		skipReason: "local-dependency"
	};
	if (ref.startsWith("git::")) {
		const [, packageName] = ref.split("::");
		return {
			packageName,
			datasource: GitTagsDatasource.id
		};
	}
	const splitted = ref.split("::", 2);
	if (splitted.length === 1) {
		const [packageName] = splitted;
		return {
			packageName,
			datasource: BitriseDatasource.id,
			registryUrls: defaultRegistry ? [defaultRegistry] : void 0
		};
	}
	const [registryUrl, packageName] = splitted;
	return {
		packageName,
		datasource: BitriseDatasource.id,
		registryUrls: [registryUrl]
	};
}
//#endregion
export { parseStep, parseStepRef };

//# sourceMappingURL=utils.js.map