import { ProblemStream } from "./problem-stream.js";
import { getEnv } from "./utils.js";
import { RenovateLogger } from "./renovate-logger.js";
import { randomUUID } from "node:crypto";
//#region lib/logger/index.ts
const problems = new ProblemStream();
let stdoutLevel = "info";
function logLevel() {
	return stdoutLevel;
}
const loggerInternal = new RenovateLogger(getEnv("LOG_CONTEXT") ?? randomUUID(), {});
const logger = loggerInternal;
async function init() {
	const { createLogger, validateLogLevel } = await import("./bunyan.js");
	stdoutLevel = validateLogLevel(getEnv("LOG_LEVEL"), "info");
	const bunyanLogger = createLogger(stdoutLevel, problems);
	loggerInternal.bunyan = bunyanLogger;
}
function setContext(value) {
	loggerInternal.logContext = value;
}
function getContext() {
	return loggerInternal.logContext;
}
function setMeta(obj) {
	loggerInternal.setMeta(obj);
}
function addMeta(obj) {
	loggerInternal.addMeta(obj);
}
function removeMeta(fields) {
	loggerInternal.removeMeta(fields);
}
function withMeta(obj, cb) {
	addMeta(obj);
	try {
		return cb();
	} finally {
		removeMeta(Object.keys(obj));
	}
}
function addStream(stream) {
	loggerInternal.addStream(stream);
}
/**
* For testing purposes only
* @param name stream name
* @param level log level
* @private
*/
function levels(name, level) {
	loggerInternal.levels(name, level);
	// v8 ignore else -- TODO: add test #40625
	if (name === "stdout") stdoutLevel = level;
}
function getProblems() {
	return problems.getProblems();
}
function clearProblems() {
	return problems.clearProblems();
}
//#endregion
export { addMeta, addStream, clearProblems, getContext, getProblems, init, levels, logLevel, logger, removeMeta, setContext, setMeta, withMeta };

//# sourceMappingURL=index.js.map