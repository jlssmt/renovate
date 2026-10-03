import { ensureTrailingSlash } from "../../../util/url.js";
import "../../versioning/npm/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { DartResult } from "./schema.js";
import { isEmptyObject, isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/datasource/dart/index.ts
var DartDatasource = class DartDatasource extends Datasource {
	static id = "dart";
	constructor() {
		super(DartDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://pub.dartlang.org/"];
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `published` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `repository` field of the latest release object in the results.";
	defaultVersioning = "npm";
	async getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		let result = null;
		const pkgUrl = `${ensureTrailingSlash(registryUrl)}api/packages/${packageName}`;
		let body = null;
		try {
			body = (await this.http.getJson(pkgUrl, DartResult)).body;
		} catch (err) {
			this.handleGenericErrors(err);
		}
		// v8 ignore else -- unreachable
		if (body) {
			const { versions, latest } = body;
			const releases = versions?.filter(({ retracted }) => !retracted)?.map(({ version, published, pubspec }) => {
				const release = {
					version,
					releaseTimestamp: asTimestamp(published)
				};
				const constraints = {};
				if (isNonEmptyString(pubspec?.environment?.sdk)) constraints.dart = [pubspec.environment.sdk];
				if (isNonEmptyString(pubspec?.environment?.flutter)) constraints.flutter = [pubspec.environment.flutter];
				if (!isEmptyObject(constraints)) release.constraints = constraints;
				return release;
			});
			if (releases && latest) {
				result = { releases };
				const pubspec = latest.pubspec;
				if (pubspec) {
					if (pubspec.homepage) result.homepage = pubspec.homepage;
					if (pubspec.repository) result.sourceUrl = pubspec.repository;
				}
			}
		}
		return result;
	}
};
//#endregion
export { DartDatasource };

//# sourceMappingURL=index.js.map