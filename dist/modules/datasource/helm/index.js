import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { id } from "../../versioning/helm/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { getS3Client, parseS3Url } from "../../../util/s3.js";
import { streamToString } from "../../../util/streams.js";
import { HelmRepository } from "./schema.js";
import { Readable } from "node:stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
//#region lib/modules/datasource/helm/index.ts
var HelmDatasource = class HelmDatasource extends Datasource {
	static id = "helm";
	constructor() {
		super(HelmDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://charts.helm.sh/stable"];
	}
	defaultConfig = { commitMessageTopic: "Helm release {{depName}}" };
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timstamp is determined from the `created` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `home` field or the `sources` field in the results.";
	async _getRepositoryData(helmRepository) {
		const baseUrl = ensureTrailingSlash(helmRepository);
		const indexUrl = `${baseUrl}index.yaml`;
		const s3Url = parseS3Url(indexUrl);
		if (s3Url) return await getS3RepositoryData(s3Url, indexUrl);
		const { val, err } = await this.http.getYamlSafe("index.yaml", { baseUrl }, HelmRepository).unwrap();
		if (err) this.handleGenericErrors(err);
		return val;
	}
	getRepositoryData(helmRepository) {
		return withCache({
			namespace: `datasource-${HelmDatasource.id}`,
			key: `repository-data:${helmRepository}`
		}, () => this._getRepositoryData(helmRepository));
	}
	async getReleases({ packageName, registryUrl: helmRepository }) {
		/* v8 ignore next -- should never happen */
		if (!helmRepository) return null;
		const releases = (await this.getRepositoryData(helmRepository))[packageName];
		if (!releases) {
			logger.debug({ dependency: packageName }, `Entry ${packageName} doesn't exist in index.yaml from ${helmRepository}`);
			return null;
		}
		return releases;
	}
};
async function getS3RepositoryData(s3Url, indexUrl) {
	const client = getS3Client(void 0, void 0, getS3Credentials(indexUrl));
	let res;
	try {
		res = await client.send(new GetObjectCommand(s3Url));
	} catch (err) {
		throw classifyS3Error(err, indexUrl);
	}
	if (res.DeleteMarker) {
		logger.debug({ indexUrl }, "Helm S3 lookup error: DeleteMarker encountered");
		throw new Error(`No index.yaml found at ${indexUrl}`);
	}
	if (!(res.Body instanceof Readable)) {
		logger.debug({ indexUrl }, "Helm S3 lookup error: unsupported Body type");
		throw new Error(`Unsupported S3 response body for ${indexUrl}`);
	}
	return parseSingleYaml(await streamToString(res.Body), { customSchema: HelmRepository });
}
/**
* Only a missing object means "this chart repository has no releases", so that
* error is rethrown as-is and the lookup resolves to `null`.
* Everything else becomes an `ExternalHostError` to abort the run, otherwise a
* transient S3 failure looks like a deleted chart and closes open PRs.
*/
function classifyS3Error(err, indexUrl) {
	if (err.name === "NotFound" || err.name === "NoSuchKey") {
		logger.debug({ indexUrl }, "Helm S3 lookup error: object not found");
		return err;
	}
	if (err.name === "CredentialsProviderError" || err.$metadata?.httpStatusCode === 403) logger.debug({
		indexUrl,
		err
	}, "Helm S3 lookup error: credentials error, check \"AWS_ACCESS_KEY_ID\" and \"AWS_SECRET_ACCESS_KEY\" variables or the matching `hostRules` entry");
	else if (err.message === "Region is missing") logger.debug({ indexUrl }, "Helm S3 lookup error: missing region, check \"AWS_REGION\" variable");
	else logger.debug({
		indexUrl,
		err
	}, "Helm S3 lookup error: unknown error");
	return new ExternalHostError(err, HelmDatasource.id);
}
function getS3Credentials(indexUrl) {
	const { username, password, token } = find({
		hostType: HelmDatasource.id,
		url: indexUrl
	});
	if (!username || !password) return;
	return {
		accessKeyId: username,
		secretAccessKey: password,
		sessionToken: token
	};
}
//#endregion
export { HelmDatasource };

//# sourceMappingURL=index.js.map