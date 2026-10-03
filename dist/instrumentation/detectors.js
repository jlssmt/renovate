import { envDetector } from "@opentelemetry/resources";
import { awsBeanstalkDetector, awsEc2Detector, awsEcsDetector, awsEksDetector, awsLambdaDetector } from "@opentelemetry/resource-detector-aws";
import { azureAppServiceDetector, azureFunctionsDetector, azureVmDetector } from "@opentelemetry/resource-detector-azure";
import { gcpDetector } from "@opentelemetry/resource-detector-gcp";
import { gitHubDetector } from "@opentelemetry/resource-detector-github";
//#region lib/instrumentation/detectors.ts
function getResourceDetectors(env) {
	const detectors = {
		aws: [
			awsBeanstalkDetector,
			awsEc2Detector,
			awsEcsDetector,
			awsEksDetector,
			awsLambdaDetector
		],
		azure: [
			azureAppServiceDetector,
			azureFunctionsDetector,
			azureVmDetector
		],
		gcp: gcpDetector,
		github: gitHubDetector,
		env: envDetector
	};
	const resourceDetectorsFromEnv = new Set(env.OTEL_NODE_RESOURCE_DETECTORS?.split(",") ?? [env.RENOVATE_USE_CLOUD_METADATA_SERVICES?.toLocaleLowerCase() === "false" ? "env" : "all"]);
	if (resourceDetectorsFromEnv.has("none")) return [];
	if (resourceDetectorsFromEnv.has("all")) return Object.values(detectors).flat();
	return Object.entries(detectors).filter(([name]) => resourceDetectorsFromEnv.has(name)).map(([_, value]) => value).flat();
}
//#endregion
export { getResourceDetectors };

//# sourceMappingURL=detectors.js.map