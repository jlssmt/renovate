import replacements_default from "../../../data/replacements.js";
import { addPresets } from "./auto-generate-replacements.js";
//#region lib/config/presets/internal/replacements.preset.ts
const { $schema: _, ...replacementPresets } = replacements_default;
const presets = replacementPresets;
addPresets(presets, {
	description: "The `messageformat` monorepo package naming scheme changed from `messageFormat-{{package}}` to `@messageformat/{{package}}`.",
	packageRules: [
		{
			matchCurrentVersion: ">=2.0.0 <3.0.0",
			matchDatasources: ["npm"],
			replacements: [[["messageformat-cli"], "@messageformat/cli"], [["messageformat"], "@messageformat/core"]],
			replacementVersion: "3.0.0"
		},
		{
			matchCurrentVersion: ">=0.4.0 <1.0.0",
			matchDatasources: ["npm"],
			replacements: [[["messageformat-convert"], "@messageformat/convert"], [["react-message-context"], "@messageformat/react"]],
			replacementVersion: "1.0.0"
		},
		{
			matchCurrentVersion: ">=4.0.0 <5.0.0",
			matchDatasources: ["npm"],
			replacements: [[["messageformat-parser"], "@messageformat/parser"]],
			replacementVersion: "5.0.0"
		}
	],
	title: "messageFormat-to-scoped"
}, {
	description: "The `material-ui` monorepo org was renamed from `@material-ui` to `@mui`.",
	packageRules: [{
		matchCurrentVersion: ">=4.0.0 <5.0.0",
		matchDatasources: ["npm"],
		replacements: [
			[["@material-ui/codemod"], "@mui/codemod"],
			[["@material-ui/core"], "@mui/material"],
			[["@material-ui/icons"], "@mui/icons-material"],
			[["@material-ui/lab"], "@mui/lab"],
			[["@material-ui/private-theming"], "@mui/private-theming"],
			[["@material-ui/styled-engine"], "@mui/styled-engine"],
			[["@material-ui/styled-engine-sc"], "@mui/styled-engine-sc"],
			[["@material-ui/styles"], "@mui/styles"],
			[["@material-ui/system"], "@mui/system"],
			[["@material-ui/types"], "@mui/types"],
			[["@material-ui/unstyled"], "@mui/core"]
		],
		replacementVersion: "5.0.0"
	}],
	title: "material-ui-to-mui"
});
//#endregion
export { presets };

//# sourceMappingURL=replacements.preset.js.map