import { ModuleExtractor } from "./extractors/others/modules.js";
import { ProvidersExtractor } from "./extractors/others/providers.js";
import { GenericDockerImageRefExtractor } from "./extractors/resources/generic-docker-image-ref.js";
import { HelmReleaseExtractor } from "./extractors/resources/helm-release.js";
import { TerraformVersionExtractor } from "./extractors/terraform-block/terraform-version.js";
import { TerraformWorkspaceExtractor } from "./extractors/resources/terraform-workspace.js";
import { RequiredProviderExtractor } from "./extractors/terraform-block/required-provider.js";
//#region lib/modules/manager/terraform/extractors.ts
const resourceExtractors = [
	new HelmReleaseExtractor(),
	new GenericDockerImageRefExtractor(),
	new TerraformWorkspaceExtractor(),
	new RequiredProviderExtractor(),
	new TerraformVersionExtractor(),
	new ProvidersExtractor(),
	new ModuleExtractor()
];
//#endregion
export { resourceExtractors };

//# sourceMappingURL=extractors.js.map