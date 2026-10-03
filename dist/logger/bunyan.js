import { bunyan } from "../expose.js";
import { getEnv } from "./utils.js";
import { withSanitizer } from "./with-sanitizer.js";
import errSerializer from "./err-serializer.js";
import cmdSerializer from "./cmd-serializer.js";
import configSerializer from "./config-serializer.js";
import { PrettyStdoutStream, formatRecord } from "./pretty-stdout.js";
import { isString, isTruthy, isUndefined } from "@sindresorhus/is";
import fs from "fs-extra";
import upath from "upath";
//#region lib/logger/bunyan.ts
function createDefaultStreams(stdoutLevel, problems, logFile) {
	const stdout = {
		name: "stdout",
		level: stdoutLevel,
		stream: process.stdout
	};
	// v8 ignore else -- TODO: add test #40625
	if (getEnv("LOG_FORMAT") !== "json") {
		stdout.stream = new PrettyStdoutStream();
		stdout.type = "raw";
	}
	return [
		stdout,
		{
			name: "problems",
			level: "warn",
			stream: problems,
			type: "raw"
		},
		isString(logFile) ? createLogFileStream(logFile) : void 0
	].filter(isTruthy);
}
function createLogFileStream(logFile) {
	const directoryName = upath.dirname(logFile);
	fs.ensureDirSync(directoryName);
	const logFileLevel = validateLogLevel(getEnv("LOG_FILE_LEVEL"), "debug");
	const fd = fs.openSync(logFile, "a");
	if (getEnv("LOG_FILE_FORMAT") === "pretty") return {
		name: "logfile",
		level: logFileLevel,
		type: "raw",
		stream: {
			writable: true,
			write: (rec) => {
				fs.writeSync(fd, formatRecord(rec, false));
			}
		}
	};
	return {
		name: "logfile",
		level: logFileLevel,
		stream: {
			writable: true,
			write: (data) => {
				fs.writeSync(fd, data);
			}
		}
	};
}
function serializedSanitizedLogger(streams) {
	return bunyan().createLogger({
		name: "renovate",
		serializers: {
			body: configSerializer,
			cmd: cmdSerializer,
			config: configSerializer,
			migratedConfig: configSerializer,
			originalConfig: configSerializer,
			presetConfig: configSerializer,
			oldConfig: configSerializer,
			newConfig: configSerializer,
			err: errSerializer
		},
		streams: streams.map(withSanitizer)
	});
}
function createLogger(stdoutLevel, problems) {
	return serializedSanitizedLogger(createDefaultStreams(stdoutLevel, problems, getEnv("LOG_FILE")));
}
/**
* A function that terminates execution if the log level that was entered is
*  not a valid value for the Bunyan logger.
* @param logLevelToCheck
* @returns returns the logLevel when the logLevelToCheck is valid or the defaultLevel passed as argument when it is undefined. Else it stops execution.
*/
function validateLogLevel(logLevelToCheck, defaultLevel) {
	if (isUndefined(logLevelToCheck) || isString(logLevelToCheck) && [
		"trace",
		"debug",
		"info",
		"warn",
		"error",
		"fatal"
	].includes(logLevelToCheck)) return logLevelToCheck ?? defaultLevel;
	bunyan().createLogger({
		name: "renovate",
		streams: [{
			level: "fatal",
			stream: process.stdout
		}]
	}).fatal({ logLevel: logLevelToCheck }, "Invalid log level");
	process.exit(1);
}
//#endregion
export { createDefaultStreams, createLogger, validateLogLevel };

//# sourceMappingURL=bunyan.js.map