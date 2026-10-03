import { GlobalConfig } from "../../../config/global.js";
import { find } from "../../../util/host-rules.js";
import { id } from "../../versioning/loose/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { AzurePipelinesFallbackTasks, AzurePipelinesJSON, AzurePipelinesTaskVersion } from "./schema.js";
//#region lib/modules/datasource/azure-pipelines-tasks/index.ts
const TASKS_URL_BASE = "https://raw.githubusercontent.com/renovatebot/azure-devops-marketplace/main";
const BUILT_IN_TASKS_URL = `${TASKS_URL_BASE}/azure-pipelines-builtin-tasks.json`;
const MARKETPLACE_TASKS_URL = `${TASKS_URL_BASE}/azure-pipelines-marketplace-tasks.json`;
const BUILT_IN_TASKS_CHANGELOG_URL = "https://github.com/microsoft/azure-pipelines-tasks/releases";
var AzurePipelinesTasksDatasource = class AzurePipelinesTasksDatasource extends Datasource {
	static id = "azure-pipelines-tasks";
	constructor() {
		super(AzurePipelinesTasksDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	defaultVersioning = id;
	async getReleases({ packageName }) {
		const platform = GlobalConfig.get("platform");
		const endpoint = GlobalConfig.get("endpoint");
		const { token } = find({
			hostType: AzurePipelinesTasksDatasource.id,
			url: endpoint
		});
		if (platform === "azure" && endpoint && token) {
			const opts = { headers: { authorization: `Basic ${Buffer.from(`renovate:${token}`).toString("base64")}` } };
			const results = await this.getTasks(`${endpoint}/_apis/distributedtask/tasks/`, opts, AzurePipelinesJSON);
			const result = { releases: [] };
			results.value.filter((task) => {
				return [
					task.id === packageName,
					task.name === packageName,
					task.contributionIdentifier !== null && `${task.contributionIdentifier}.${task.id}` === packageName,
					task.contributionIdentifier !== null && `${task.contributionIdentifier}.${task.name}` === packageName
				].some((match) => match);
			}).sort(AzurePipelinesTasksDatasource.compareSemanticVersions("version")).forEach((task) => {
				const release = {
					version: `${task.version.major}.${task.version.minor}.${task.version.patch}`,
					changelogContent: task.releaseNotes,
					isDeprecated: task.deprecated
				};
				if (task.serverOwned) release.changelogUrl = BUILT_IN_TASKS_CHANGELOG_URL;
				result.releases.push(release);
			});
			return result;
		}
		const versions = (await this.getTasks(BUILT_IN_TASKS_URL, {}, AzurePipelinesFallbackTasks))[packageName.toLowerCase()] ?? (await this.getTasks(MARKETPLACE_TASKS_URL, {}, AzurePipelinesFallbackTasks))[packageName.toLowerCase()];
		if (versions) return { releases: versions.map((version) => ({ version })) };
		return null;
	}
	async _getTasks(url, opts, schema) {
		const { body } = await this.http.getJson(url, opts, schema);
		return body;
	}
	getTasks(url, opts, schema) {
		return withCache({
			namespace: `datasource-${AzurePipelinesTasksDatasource.id}`,
			key: url,
			ttlMinutes: 1440
		}, () => this._getTasks(url, opts, schema));
	}
	static compareSemanticVersions = (key) => (a, b) => {
		const a1Version = AzurePipelinesTaskVersion.safeParse(a[key]).data;
		const b1Version = AzurePipelinesTaskVersion.safeParse(b[key]).data;
		const a1 = a1Version === void 0 ? "" : `${a1Version.major}.${a1Version.minor}.${a1Version.patch}`;
		const b1 = b1Version === void 0 ? "" : `${b1Version.major}.${b1Version.minor}.${b1Version.patch}`;
		const len = Math.min(a1.length, b1.length);
		for (let i = 0; i < len; i++) {
			const a2 = +a1[i] || 0;
			const b2 = +b1[i] || 0;
			if (a2 !== b2) return a2 > b2 ? 1 : -1;
		}
		return b1.length - a1.length;
	};
};
//#endregion
export { AzurePipelinesTasksDatasource };

//# sourceMappingURL=index.js.map