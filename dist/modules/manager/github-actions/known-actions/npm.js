import "../../../versioning/npm/index.js";
import { NpmDatasource } from "../../../datasource/npm/index.js";
import { valSchema } from "./utils.js";
//#region lib/modules/manager/github-actions/known-actions/npm.ts
const npmActions = {
	"biomejs/setup-biome": {
		datasource: NpmDatasource.id,
		packageName: "@biomejs/biome"
	},
	"cloudflare/wrangler-action": {
		datasource: NpmDatasource.id,
		packageName: "wrangler",
		withSchema: valSchema("wranglerVersion")
	},
	"cycjimmy/semantic-release-action": {
		datasource: NpmDatasource.id,
		packageName: "semantic-release",
		versioning: "npm",
		withSchema: valSchema("semantic_version")
	},
	"denoland/setup-deno": {
		datasource: NpmDatasource.id,
		packageName: "deno",
		withSchema: valSchema("deno-version")
	},
	"expo/expo-github-action": {
		datasource: NpmDatasource.id,
		packageName: "eas-cli",
		withSchema: valSchema("eas-version")
	},
	"jakebailey/pyright-action": {
		datasource: NpmDatasource.id,
		packageName: "pyright",
		withSchema: valSchema("version", (val) => val === "PATH")
	},
	"oven-sh/setup-bun": {
		datasource: NpmDatasource.id,
		packageName: "bun",
		withSchema: valSchema("bun-version")
	},
	"pnpm/action-setup": {
		datasource: NpmDatasource.id,
		packageName: "pnpm"
	},
	"supabase/setup-cli": {
		datasource: NpmDatasource.id,
		packageName: "supabase"
	}
};
//#endregion
export { npmActions };

//# sourceMappingURL=npm.js.map