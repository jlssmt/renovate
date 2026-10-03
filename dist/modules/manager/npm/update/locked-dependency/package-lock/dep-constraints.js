import { regEx } from "../../../../../../util/regex.js";
import { logger } from "../../../../../../logger/index.js";
import { api } from "../../../../../versioning/npm/index.js";
//#region lib/modules/manager/npm/update/locked-dependency/package-lock/dep-constraints.ts
function findDepConstraints(packageJson, lockEntry, depName, currentVersion, newVersion, parentDepName) {
	let parents = [];
	let packageJsonConstraint = packageJson.dependencies?.[depName];
	if (packageJsonConstraint && api.matches(currentVersion, packageJsonConstraint)) parents.push({
		depType: "dependencies",
		constraint: packageJsonConstraint
	});
	packageJsonConstraint = packageJson.devDependencies?.[depName];
	if (packageJsonConstraint && api.matches(currentVersion, packageJsonConstraint)) parents.push({
		depType: "devDependencies",
		constraint: packageJsonConstraint
	});
	const { dependencies, requires, version } = lockEntry;
	if (parentDepName && requires) {
		let constraint = requires[depName];
		if (constraint) {
			constraint = constraint.replace(regEx(/(?<digit>\d)rc$/), "$<digit>-rc");
			// v8 ignore else -- TODO: add test #40625
			if (api.isValid(constraint)) {
				if (api.matches(currentVersion, constraint)) {
					if (constraint === currentVersion) requires[depName] = newVersion;
					parents.push({
						parentDepName,
						parentVersion: version,
						constraint
					});
				}
			} else logger.warn({
				parentDepName,
				depName,
				currentVersion,
				constraint
			}, "Parent constraint is invalid");
		}
	}
	if (dependencies) for (const [packageName, dependency] of Object.entries(dependencies)) parents = parents.concat(findDepConstraints(packageJson, dependency, depName, currentVersion, newVersion, packageName));
	const res = [];
	for (const req of parents) {
		const reqStringified = JSON.stringify(req);
		if (!res.find((i) => JSON.stringify(i) === reqStringified)) res.push(req);
	}
	return res;
}
//#endregion
export { findDepConstraints };

//# sourceMappingURL=dep-constraints.js.map