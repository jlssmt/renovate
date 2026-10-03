import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { repomdXmlFileName } from "./common.js";
import { XmlDocument } from "xmldoc";
//#region lib/modules/datasource/rpm/repomd.ts
function getPrimaryRepodataUrl(xml, registryUrl, repomdUrl) {
	const primaryData = xml.childWithAttribute("type", "primary");
	if (!primaryData) throw new Error(`No primary data found in ${repomdUrl}`);
	const locationElement = primaryData.childNamed("location");
	if (!locationElement) throw new Error(`No location element found in ${repomdUrl}`);
	const href = locationElement.attr.href;
	if (!href) throw new Error(`No href found in ${repomdUrl}`);
	const registryUrlWithoutRepodata = registryUrl.replace(regEx(/\/repodata\/?$/), "/");
	return joinUrlParts(registryUrlWithoutRepodata, href);
}
async function fetchPrimaryUrl(http, registryUrl) {
	const repomdUrl = joinUrlParts(registryUrl, repomdXmlFileName);
	const response = await http.getText(repomdUrl.toString());
	const repomdBody = response.body.trimStart();
	if (!(repomdBody.startsWith("<?xml") || repomdBody.startsWith("<repomd"))) {
		logger.debug({
			datasource: "rpm",
			url: repomdUrl
		}, "Invalid response format");
		throw new Error(`${repomdUrl} is not in XML format. Response body: ${response.body}`);
	}
	const xml = new XmlDocument(repomdBody);
	try {
		return getPrimaryRepodataUrl(xml, registryUrl, repomdUrl.toString());
	} catch (err) {
		if (err instanceof Error && err.message.startsWith("No primary data found")) logger.debug(`No primary data found in ${repomdUrl}, xml contents: ${response.body}`);
		throw err;
	}
}
//#endregion
export { fetchPrimaryUrl };

//# sourceMappingURL=repomd.js.map