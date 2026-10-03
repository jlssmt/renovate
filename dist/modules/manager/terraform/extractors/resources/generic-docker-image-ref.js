import { getDep } from "../../../dockerfile/extract.js";
import { DependencyExtractor } from "../../base.js";
import { generic_image_datasource, generic_image_resource } from "./utils.js";
import { isArray, isNonEmptyObject, isNonEmptyString, isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/extractors/resources/generic-docker-image-ref.ts
var GenericDockerImageRefExtractor = class extends DependencyExtractor {
	getCheckList() {
		return [...generic_image_resource, ...generic_image_datasource].map((value) => `"${value.type}"`);
	}
	extract(hclMap, _locks, config) {
		const dependencies = [];
		dependencies.push(...this.extractResources(hclMap.resource, generic_image_resource, config));
		dependencies.push(...this.extractResources(hclMap.data, generic_image_datasource, config));
		return dependencies;
	}
	extractResources(typeMap, image_definitions, config) {
		if (isNullOrUndefined(typeMap)) return [];
		const dependencies = [];
		for (const image_resource_def of image_definitions) {
			const { type, path } = image_resource_def;
			const resourceInstancesMap = typeMap[type];
			if (!isNonEmptyObject(resourceInstancesMap)) continue;
			for (const instance of Object.values(resourceInstancesMap).flat()) dependencies.push(...this.walkPath({ depType: type }, instance, path, config));
		}
		return dependencies;
	}
	/**
	* Recursively follow the path to find elements on the path.
	* If a path element is '*' the parentElement will be interpreted as a list
	* and each element will be followed
	* @param abstractDep dependency which will used as basis for adding attributes
	* @param parentElement element from which the next element will be extracted
	* @param leftPath path elements left to walk down
	*/
	walkPath(abstractDep, parentElement, leftPath, config) {
		const dependencies = [];
		if (leftPath.length === 0) {
			/* v8 ignore next -- needs test */
			if (!isNonEmptyString(parentElement)) return [{
				...abstractDep,
				skipReason: "invalid-dependency-specification"
			}];
			const test = getDep(parentElement, true, config.registryAliases);
			return [{
				...abstractDep,
				...test
			}];
		}
		const pathElement = leftPath[0];
		const element = isNonEmptyObject(parentElement) ? parentElement[pathElement] : null;
		if (isNullOrUndefined(element)) return leftPath.length === 1 ? [{
			...abstractDep,
			skipReason: "invalid-dependency-specification"
		}] : [];
		if (isArray(element)) {
			for (const arrayElement of element) dependencies.push(...this.walkPath(abstractDep, arrayElement, leftPath.slice(1), config));
			return dependencies;
		}
		return this.walkPath(abstractDep, element, leftPath.slice(1), config);
	}
};
//#endregion
export { GenericDockerImageRefExtractor };

//# sourceMappingURL=generic-docker-image-ref.js.map