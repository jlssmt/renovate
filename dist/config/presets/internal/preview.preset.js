//#region lib/config/presets/internal/preview.preset.ts
const presets = {
	buildkite: {
		buildkite: { enabled: true },
		description: "Enable Buildkite functionality."
	},
	dockerCompose: {
		description: "Enable Docker Compose image updating.",
		"docker-compose": { enabled: true }
	},
	dockerVersions: {
		description: "Upgrade Docker tags to newer versions.",
		"docker-compose": {
			major: { enabled: true },
			minor: { enabled: true }
		},
		dockerfile: {
			major: { enabled: true },
			minor: { enabled: true }
		}
	}
};
//#endregion
export { presets };

//# sourceMappingURL=preview.preset.js.map