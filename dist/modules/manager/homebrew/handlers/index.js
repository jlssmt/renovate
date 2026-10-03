import { GitHubUrlHandler } from "./github.js";
import { NpmUrlHandler } from "./npm.js";
//#region lib/modules/manager/homebrew/handlers/index.ts
const handlers = [new GitHubUrlHandler(), new NpmUrlHandler()];
function findHandler(url) {
	if (!url) return null;
	for (const handler of handlers) {
		const parsed = handler.parseUrl(url);
		if (parsed) return {
			handler,
			parsed
		};
	}
	return null;
}
function findHandlerByType(type) {
	return handlers.find((h) => h.type === type) ?? null;
}
//#endregion
export { findHandler, findHandlerByType };

//# sourceMappingURL=index.js.map