//#region lib/modules/manager/ocb/dep-types.ts
const knownDepTypes = [
	{
		depType: "collector",
		description: "The OpenTelemetry Collector version itself"
	},
	{
		depType: "connectors",
		description: "Connector component module"
	},
	{
		depType: "exports",
		description: "Exporter component module"
	},
	{
		depType: "extensions",
		description: "Extension component module"
	},
	{
		depType: "processors",
		description: "Processor component module"
	},
	{
		depType: "providers",
		description: "Provider component module"
	},
	{
		depType: "receivers",
		description: "Receiver component module"
	}
];
//#endregion
export { knownDepTypes };

//# sourceMappingURL=dep-types.js.map