import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
//#region lib/modules/platform/scm-manager/utils.ts
function mapPrState(state) {
	switch (state) {
		case "open": return "OPEN";
		case "closed": return "REJECTED";
		default: return;
	}
}
function matchPrState(pr, state) {
	if (state === "all") return true;
	if (state === "!open" && (pr.state === "closed" || pr.state === "merged")) return true;
	return state === pr.state;
}
function smartLinks(body) {
	return body.replace(regEx(/]\(\.\.\/pull\//g), "](pulls/");
}
function getRepoUrl(repo, gitUrl, endpoint) {
	const protocolLinks = repo._links.protocol;
	if (!protocolLinks) throw new Error("Missing protocol links.");
	if (!Array.isArray(protocolLinks)) throw new Error("Expected protocol links to be an array of links.");
	if (gitUrl === "ssh") {
		const sshUrl = protocolLinks.find((l) => l.name === "ssh")?.href;
		if (!sshUrl) throw new Error("MISSING_SSH_LINKS");
		logger.debug(`Using SSH URL: ${sshUrl}`);
		return sshUrl;
	}
	const httpUrl = protocolLinks.find((l) => l.name === "http")?.href;
	if (!httpUrl) throw new Error("MISSING_HTTP_LINK");
	logger.debug(`Using HTTP URL: ${httpUrl}`);
	const repoUrl = parseUrl(httpUrl);
	if (!repoUrl) throw new Error("MALFORMED_HTTP_LINK");
	const hostOptions = find({
		hostType: "scm-manager",
		url: endpoint
	});
	repoUrl.username = hostOptions.username ?? "";
	repoUrl.password = hostOptions.token ?? "";
	return repoUrl.toString();
}
//#endregion
export { getRepoUrl, mapPrState, matchPrState, smartLinks };

//# sourceMappingURL=utils.js.map