import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { TerraformProviderDatasource } from "../../datasource/terraform-provider/index.js";
import { isOCIRegistry } from "../helmv3/oci.js";
import { applyOciDependency, getLockedVersion, massageProviderLookupName } from "./util.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/base.ts
var DependencyExtractor = class {};
var TerraformProviderExtractor = class extends DependencyExtractor {
	sourceExtractionRegex = regEx(/^(?:(?<hostname>(?:[a-zA-Z0-9-_]+\.+)+[a-zA-Z0-9-_]+)\/)?(?:(?<namespace>[^/]+)\/)?(?<type>[^/]+)/);
	analyzeTerraformProvider(dep, locks, depType, config) {
		dep.depType = depType;
		dep.depName = dep.managerData?.moduleName;
		dep.datasource = TerraformProviderDatasource.id;
		if (isNonEmptyString(dep.managerData?.source)) {
			if (isOCIRegistry(dep.managerData.source)) {
				applyOciDependency(dep, dep.managerData.source, config.registryAliases);
				return dep;
			}
			const source = this.sourceExtractionRegex.exec(dep.managerData.source);
			if (!source?.groups) {
				dep.skipReason = "unsupported-url";
				return dep;
			}
			if (source.groups.namespace === "terraform-providers") dep.registryUrls = [TerraformProviderDatasource.hashicorpReleaseUrl];
			else if (source.groups.hostname) {
				dep.registryUrls = [`https://${source.groups.hostname}`];
				dep.packageName = `${source.groups.namespace}/${source.groups.type}`;
			} else {
				dep.packageName = dep.managerData?.source;
				const foundLocks = locks.filter((lock) => lock.packageName === dep.packageName);
				if (foundLocks.length === 1 && foundLocks[0].registryUrl !== TerraformProviderDatasource.terraformRegistryUrl) {
					logger.debug({
						dep,
						foundLocks
					}, "Terraform: Single lock found for provider with non-default registry URL");
					dep.registryUrls = [foundLocks[0].registryUrl];
				} else if (foundLocks.length > 1) logger.debug({
					dep,
					foundLocks
				}, "Terraform: Multiple locks found for provider unable to determine registry URL");
			}
		}
		massageProviderLookupName(dep);
		dep.lockedVersion = getLockedVersion(dep, locks);
		if (!dep.currentValue) dep.skipReason = "unspecified-version";
		return dep;
	}
};
//#endregion
export { DependencyExtractor, TerraformProviderExtractor };

//# sourceMappingURL=base.js.map