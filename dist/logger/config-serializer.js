import { map } from "neotraverse";
//#region lib/logger/config-serializer.ts
function configSerializer(config) {
	const templateFields = ["prBody"];
	const contentFields = [
		"content",
		"contents",
		"packageLockParsed",
		"yarnLockParsed"
	];
	const arrayFields = ["packageFiles", "upgrades"];
	return map(config, (ctx, val) => {
		if (ctx.key && val) {
			const key = ctx.key.toString();
			if (templateFields.includes(key)) ctx.update("[Template]");
			if (contentFields.includes(key)) ctx.update("[content]");
			if (arrayFields.includes(key)) ctx.update("[Array]");
		}
	});
}
//#endregion
export { configSerializer as default };

//# sourceMappingURL=config-serializer.js.map