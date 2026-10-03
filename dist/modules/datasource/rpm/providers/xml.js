import { logger } from "../../../../logger/index.js";
import { createCacheReadStream } from "../../../../util/fs/index.js";
import { buildReleaseResult, formatRpmVersion, getCachedDecompressedFile } from "./common.js";
import sax from "sax";
//#region lib/modules/datasource/rpm/providers/xml.ts
var RpmXmlMetadataProvider = class {
	http;
	constructor(http) {
		this.http = http;
	}
	async getReleases(primaryUrl, packageName) {
		const primaryXmlFile = await getCachedDecompressedFile(this.http, primaryUrl, "xml");
		const releases = /* @__PURE__ */ new Set();
		let insidePackage = false;
		let isTargetPackage = false;
		let insideName = false;
		const saxParser = sax.createStream(true, {
			lowercase: true,
			trim: true
		});
		saxParser.on("opentag", (node) => {
			if (node.name === "package" && node.attributes.type === "rpm") {
				insidePackage = true;
				isTargetPackage = false;
			}
			if (insidePackage && node.name === "name") insideName = true;
			if (insidePackage && isTargetPackage && node.name === "version") {
				const version = formatRpmVersion(node.attributes.ver, node.attributes.rel);
				if (version) releases.add(version);
			}
		});
		saxParser.on("text", (text) => {
			if (insidePackage && insideName && text.trim() === packageName) isTargetPackage = true;
		});
		saxParser.on("closetag", (tag) => {
			if (tag === "name" && insidePackage) insideName = false;
			if (tag === "package") {
				insidePackage = false;
				isTargetPackage = false;
			}
		});
		await new Promise((resolve, reject) => {
			let settled = false;
			saxParser.on("error", (err) => {
				if (settled) return;
				settled = true;
				logger.debug(`SAX parsing error in ${primaryUrl}: ${err.message}`);
				setImmediate(() => saxParser.removeAllListeners());
				reject(err);
			});
			saxParser.on("end", () => {
				settled = true;
				setImmediate(() => saxParser.removeAllListeners());
				resolve();
			});
			createCacheReadStream(primaryXmlFile).pipe(saxParser);
		});
		const result = buildReleaseResult(releases);
		if (!result) logger.trace(`No releases found for package ${packageName} in ${primaryUrl}`);
		return result;
	}
};
//#endregion
export { RpmXmlMetadataProvider };

//# sourceMappingURL=xml.js.map