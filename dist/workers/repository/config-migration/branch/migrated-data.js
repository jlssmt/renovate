import { prettier } from "../../../../expose.js";
import { logger } from "../../../../logger/index.js";
import { migrateConfig } from "../../../../config/migration.js";
import { readLocalFile } from "../../../../util/fs/index.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
import { EditorConfig } from "../../../../util/json-writer/editor-config.js";
import "../../../../util/json-writer/index.js";
import { detectRepoFileConfig } from "../../init/merge.js";
import { isNumber } from "@sindresorhus/is";
import JSON5 from "json5";
import { weave } from "jsonc-weaver";
import upath from "upath";
import detectIndent from "detect-indent";
//#region lib/workers/repository/config-migration/branch/migrated-data.ts
const prettierConfigFilenames = /* @__PURE__ */ new Set([
	".prettierrc",
	".prettierrc.json",
	".prettierrc.yml",
	".prettierrc.yaml",
	".prettierrc.json5",
	".prettierrc.js",
	".prettierrc.cjs",
	".prettierrc.mjs",
	"prettier.config.js",
	"prettier.config.cjs",
	"prettier.config.mjs",
	".prettierrc.toml"
]);
async function applyPrettierFormatting(filename, content, parser, indent) {
	try {
		logger.trace("applyPrettierFormatting - START");
		const fileList = await scm.getFileList();
		let prettierExists = fileList.some((file) => prettierConfigFilenames.has(file));
		const editorconfigExists = fileList.some((file) => file === ".editorconfig");
		if (!prettierExists) try {
			const packageJsonContent = await readLocalFile("package.json", "utf8");
			prettierExists = packageJsonContent && JSON.parse(packageJsonContent).prettier;
		} catch {
			logger.warn("applyPrettierFormatting - Error processing package.json file");
		}
		if (!prettierExists || !parser) return content;
		const options = {
			parser,
			tabWidth: indent?.amount === 0 ? 2 : indent?.amount,
			useTabs: indent?.type === "tab"
		};
		if (editorconfigExists) {
			const editorconf = await EditorConfig.getCodeFormat(filename);
			if (editorconf.maxLineLength) options.printWidth = isNumber(editorconf.maxLineLength) ? editorconf.maxLineLength : Number.POSITIVE_INFINITY;
		}
		return prettier().format(content, options);
	} finally {
		logger.trace("applyPrettierFormatting - END");
	}
}
var MigratedDataFactory = class {
	static data;
	static async getAsync() {
		if (this.data) return this.data;
		const migrated = await this.build();
		if (!migrated) return null;
		this.data = migrated;
		return this.data;
	}
	static reset() {
		this.data = null;
	}
	static applyPrettierFormatting({ content, filename, indent }) {
		return applyPrettierFormatting(filename, content, upath.extname(filename).replace(".", ""), indent);
	}
	static async build() {
		let res = null;
		try {
			const { configFileName, configFileParsed = {} } = await detectRepoFileConfig();
			const { isMigrated, migratedConfig } = migrateConfig(configFileParsed);
			if (!isMigrated) return null;
			delete migratedConfig.errors;
			delete migratedConfig.warnings;
			const raw = await platform.getRawFile(configFileName);
			const indent = detectIndent(raw ?? "");
			const indentSpace = indent.indent ?? "  ";
			const filename = configFileName;
			let content;
			if (filename.endsWith(".json5")) content = JSON5.stringify(migratedConfig, void 0, indentSpace);
			else if (raw) try {
				content = weave(raw, migratedConfig);
			} catch (err) {
				logger.warn({ err }, "Error weaving JSONC to preserve comments, falling back to JSON.stringify");
				content = JSON.stringify(migratedConfig, void 0, indentSpace);
			}
			else content = JSON.stringify(migratedConfig, void 0, indentSpace);
			if (!content.endsWith("\n")) content += "\n";
			res = {
				content,
				filename,
				indent
			};
		} catch (err) {
			logger.debug({ err }, "MigratedDataFactory.getAsync() Error initializing renovate MigratedData");
		}
		return res;
	}
};
//#endregion
export { MigratedDataFactory, applyPrettierFormatting };

//# sourceMappingURL=migrated-data.js.map