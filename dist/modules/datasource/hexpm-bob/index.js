import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { id } from "../../versioning/semver/index.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { datasource, defaultRegistryUrl } from "./common.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/datasource/hexpm-bob/index.ts
var HexpmBobDatasource = class HexpmBobDatasource extends Datasource {
	static id = datasource;
	constructor() {
		super(datasource);
	}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	getDefaultRegistryUrls(_packageName) {
		return [defaultRegistryUrl];
	}
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `buildDate` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "We use the URL https://github.com/elixir-lang/elixir.git for the `elixir` package and the https://github.com/erlang/otp.git URL for the `erlang` package.";
	async fetchReleases({ registryUrl, packageName }) {
		const packageType = HexpmBobDatasource.getPackageType(packageName);
		if (!packageType) return null;
		logger.trace({
			registryUrl,
			packageName
		}, `fetching hex.pm bob ${packageName} release`);
		const url = `${registryUrl}/builds/${packageName}/builds.txt`;
		const result = {
			releases: [],
			...HexpmBobDatasource.getPackageDetails(packageType)
		};
		try {
			const { body } = await this.http.getText(url);
			result.releases = body.split("\n").map((line) => line.trim()).filter(isNonEmptyString).map((line) => {
				const [version, gitRef, buildDate] = line.split(" ");
				return {
					gitRef,
					isStable: HexpmBobDatasource.isStable(version, packageType),
					releaseTimestamp: asTimestamp(buildDate),
					version: HexpmBobDatasource.cleanVersion(version, packageType)
				};
			});
		} catch (err) {
			if (err instanceof RequestError && err.response?.statusCode !== 404) throw new ExternalHostError(err);
			this.handleGenericErrors(err);
		}
		return result.releases.length > 0 ? result : null;
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
	static getPackageType(packageName) {
		if (packageName === "elixir") return "elixir";
		if (regEx(/^otp\/\w+-\d+\.\d+$/).test(packageName)) return "erlang";
		return null;
	}
	static cleanVersion(version, packageType) {
		switch (packageType) {
			case "elixir": return version.replace(regEx(/^v/), "");
			case "erlang": return version.replace(regEx(/^OTP-/), "");
		}
	}
	static isStable(version, packageType) {
		switch (packageType) {
			case "elixir": return regEx(/^v\d+\.\d+\.\d+(?:$|-otp)/).test(version);
			case "erlang": return version.startsWith("OTP-");
		}
	}
	static getPackageDetails(packageType) {
		switch (packageType) {
			case "elixir": return {
				homepage: "https://elixir-lang.org/",
				sourceUrl: "https://github.com/elixir-lang/elixir.git"
			};
			case "erlang": return {
				homepage: "https://www.erlang.org/",
				sourceUrl: "https://github.com/erlang/otp.git"
			};
		}
	}
};
//#endregion
export { HexpmBobDatasource };

//# sourceMappingURL=index.js.map