import { prettier } from "../expose.js";
import { getProblems, logger } from "../logger/index.js";
import { writeSystemFile } from "../util/fs/index.js";
import { getS3Client, parseS3Url } from "../util/s3.js";
import { isNullOrUndefined, isUndefined } from "@sindresorhus/is";
import { PutObjectCommand } from "@aws-sdk/client-s3";
//#region lib/instrumentation/reporting.ts
const report = {
	problems: [],
	repositories: {}
};
function addBranchStats(config, branchesInformation) {
	if (isNullOrUndefined(config.reportType)) return;
	coerceRepo(config.repository);
	report.repositories[config.repository].branches = branchesInformation;
}
function addExtractionStats(config, extractResult) {
	if (isNullOrUndefined(config.reportType)) return;
	coerceRepo(config.repository);
	report.repositories[config.repository].packageFiles = extractResult.packageFiles;
}
function addLibYears(config, libYearsWithDepCount) {
	if (isNullOrUndefined(config.reportType)) return;
	coerceRepo(config.repository);
	report.repositories[config.repository].libYearsWithStatus = libYearsWithDepCount;
}
function finalizeReport() {
	const allProblems = structuredClone(getProblems());
	for (const problem of allProblems) {
		const repository = problem.repository;
		delete problem.repository;
		if (repository) {
			coerceRepo(repository);
			report.repositories[repository].problems.push(problem);
		} else report.problems.push(problem);
	}
}
async function getReportBody(config) {
	const json = JSON.stringify(report);
	if (!config.reportFormatting) return json;
	return prettier().format(json, { parser: "json" });
}
async function exportStats(config) {
	try {
		if (isNullOrUndefined(config.reportType)) return;
		if (config.reportType === "logging") {
			logger.info({ report }, "Printing report");
			return;
		}
		if (config.reportType === "file") {
			const path = config.reportPath;
			await writeSystemFile(path, await getReportBody(config));
			logger.debug({ path }, "Writing report");
			return;
		}
		// v8 ignore else -- TODO: add test #40625
		if (config.reportType === "s3") {
			const s3Url = parseS3Url(config.reportPath);
			if (isNullOrUndefined(s3Url)) {
				logger.warn({ reportPath: config.reportPath }, "Failed to parse s3 URL");
				return;
			}
			const s3Params = {
				Bucket: s3Url.Bucket,
				Key: s3Url.Key,
				Body: await getReportBody(config),
				ContentType: "application/json"
			};
			const client = getS3Client(config.s3Endpoint, config.s3PathStyle);
			const command = new PutObjectCommand(s3Params);
			await client.send(command);
		}
	} catch (err) {
		logger.warn({ err }, "Reporting.exportStats() - failure");
	}
}
function coerceRepo(repository) {
	if (!isUndefined(report.repositories[repository])) return;
	report.repositories[repository] = {
		problems: [],
		branches: [],
		packageFiles: {}
	};
}
//#endregion
export { addBranchStats, addExtractionStats, addLibYears, exportStats, finalizeReport };

//# sourceMappingURL=reporting.js.map