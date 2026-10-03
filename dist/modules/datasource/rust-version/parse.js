import { regEx } from "../../../util/regex.js";
//#region lib/modules/datasource/rust-version/parse.ts
/**
* Parse a Rust manifest URL to extract the release date and version identifier.
*
* Supports the format: .../YYYY-MM-DD/channel-rust-{identifier}.toml
*
* @param url - The manifest URL to parse
* @returns Parsed manifest data, or null if the URL is invalid
*
* @example
* parseManifestUrl('static.rust-lang.org/dist/2025-11-24/channel-rust-nightly.toml')
* // { date: '2025-11-24', version: 'nightly' }
*
* parseManifestUrl('static.rust-lang.org/dist/2024-10-17/channel-rust-1.82.0.toml')
* // { date: '2024-10-17', version: '1.82.0' }
*
* parseManifestUrl('invalid-url')
* // null
*/
function parseManifestUrl(url) {
	const match = regEx(/(?<date>\d{4}-\d{2}-\d{2})\/channel-rust-(?<version>.+?)\.toml$/).exec(url);
	if (!match?.groups) return null;
	const { date, version } = match.groups;
	return {
		date,
		version
	};
}
//#endregion
export { parseManifestUrl };

//# sourceMappingURL=parse.js.map