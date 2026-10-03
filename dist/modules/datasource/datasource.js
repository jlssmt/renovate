import { ExternalHostError } from "../../types/errors/external-host-error.js";
import { withCache } from "../../util/cache/package/with-cache.js";
import { RequestError } from "../../util/http/got.js";
import { Http } from "../../util/http/index.js";
//#region lib/modules/datasource/datasource.ts
var Datasource = class {
	id;
	/**
	* The package cache namespace used by {@link Datasource.cached}.
	* Defaults to `datasource-<id>`, which must be registered in
	* `packageCacheNamespaces`.
	*/
	cacheNamespace;
	constructor(id) {
		this.id = id;
		this.http = new Http(id);
		this.cacheNamespace = `datasource-${id}`;
	}
	caching;
	defaultConfig;
	getDefaultRegistryUrls(_packageName) {}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	defaultVersioning;
	registryStrategy = "first";
	releaseTimestampSupport = false;
	releaseTimestampNote;
	sourceUrlSupport = "none";
	sourceUrlNote;
	http;
	handleHttpErrors(_err) {}
	/**
	* Caches the result of `fn` in the datasource cache namespace.
	*
	* Same as {@link withCache}, except that `namespace` defaults to
	* {@link Datasource.cacheNamespace}.
	*/
	cached(options, fn) {
		return withCache({
			...options,
			namespace: options.namespace ?? this.cacheNamespace
		}, fn);
	}
	handleGenericErrors(err) {
		if (err instanceof ExternalHostError) throw err;
		if (err instanceof RequestError) {
			this.handleHttpErrors(err);
			const statusCode = err.response?.statusCode;
			if (statusCode && (statusCode === 429 || statusCode >= 500 && statusCode < 600)) throw new ExternalHostError(err);
		}
		throw err;
	}
	// istanbul ignore next: no-op implementation, never called
	postprocessRelease(_config, release) {
		return Promise.resolve(release);
	}
};
//#endregion
export { Datasource };

//# sourceMappingURL=datasource.js.map