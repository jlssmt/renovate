import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { id } from "../../versioning/devbox/index.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { Datasource } from "../datasource.js";
import { datasource, defaultRegistryUrl } from "./common.js";
import { DevboxResponse } from "./schema.js";
//#region lib/modules/datasource/devbox/index.ts
var DevboxDatasource = class extends Datasource {
	static id = datasource;
	constructor() {
		super(datasource);
	}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	releaseTimestampSupport = true;
	registryStrategy = "first";
	defaultVersioning = id;
	getDefaultRegistryUrls(_packageName) {
		return [defaultRegistryUrl];
	}
	async getReleases({ registryUrl, packageName }) {
		const res = { releases: [] };
		logger.trace({
			registryUrl,
			packageName
		}, "fetching devbox release");
		const devboxPkgUrl = joinUrlParts(registryUrl, `/pkg?name=${encodeURIComponent(packageName)}`);
		try {
			const response = await this.http.getJson(devboxPkgUrl, DevboxResponse);
			res.releases = response.body.releases;
			res.homepage = response.body.homepage;
		} catch (err) {
			if (err instanceof RequestError && err.response?.statusCode !== 404) throw new ExternalHostError(err);
			this.handleGenericErrors(err);
		}
		return res.releases.length ? res : null;
	}
};
//#endregion
export { DevboxDatasource };

//# sourceMappingURL=index.js.map