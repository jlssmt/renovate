//#region lib/config/presets/internal/global.preset.ts
const presets = { safeEnv: {
	allowedEnv: [
		"BUN_CONFIG_MAX_HTTP_REQUESTS",
		"GO*",
		"GRADLE_OPTS",
		"RUSTC_BOOTSTRAP",
		"PNPM_WORKERS",
		"PNPM_MAX_WORKERS"
	],
	description: "Hopefully safe environment variables to allow users to configure."
} };
//#endregion
export { presets };

//# sourceMappingURL=global.preset.js.map