import { regEx } from "../util/regex.js";
import * as util$1 from "node:util";
import { isNonEmptyObject, isPlainObject, isString } from "@sindresorhus/is";
import { Writable } from "node:stream";
import stringify from "json-stringify-pretty-compact";
//#region lib/logger/pretty-stdout.ts
const bunyanFields = [
	"name",
	"hostname",
	"pid",
	"level",
	"v",
	"time",
	"msg",
	"start_time"
];
/**
* If a log contains any of these meta fields in the meta, promote them up to the log line, rather than rendering them with other meta fields.
*
* This only applies when these fields have a string value, otherwise they are treated as a regular meta field.
*/
const metaFields = [
	"repository",
	"baseBranch",
	"packageFile",
	"depType",
	"dependency",
	"branch"
];
const levels = {
	10: "TRACE",
	20: "DEBUG",
	30: " INFO",
	40: " WARN",
	50: "ERROR",
	60: "FATAL"
};
const colorizedLevels = {
	10: util$1.styleText("gray", "TRACE"),
	20: util$1.styleText("blue", "DEBUG"),
	30: util$1.styleText("green", " INFO"),
	40: util$1.styleText("magenta", " WARN"),
	50: util$1.styleText("red", "ERROR"),
	60: util$1.styleText("bgRed", "FATAL")
};
function indent(str, leading = false) {
	return (leading ? "       " : "") + str.split(regEx(/\r?\n/)).join("\n       ");
}
function getMeta(rec, colorize = true) {
	if (!rec) return "";
	let res = rec.module ? ` [${rec.module}]` : ``;
	const filteredMeta = metaFields.filter((elem) => isString(rec[elem]));
	if (!filteredMeta.length) return res;
	res = ` (${filteredMeta.map((field) => `${field}=${String(rec[field])}`).join(", ")})${res}`;
	return colorize ? util$1.styleText("gray", res) : res;
}
function getDetails(rec) {
	if (!rec) return "";
	const recFiltered = { ...rec };
	delete recFiltered.module;
	Object.keys(recFiltered).forEach((key) => {
		if (key === "logContext" || bunyanFields.includes(key) || metaFields.includes(key) && isString(recFiltered[key])) delete recFiltered[key];
	});
	const remainingKeys = Object.keys(recFiltered);
	if (remainingKeys.length === 0) return "";
	const err = recFiltered.err;
	if (isPlainObject(err) && isString(err.stack)) {
		const { stack, ...errRest } = err;
		recFiltered.err = isNonEmptyObject(errRest) ? errRest : void 0;
		const parts = [];
		for (const key of remainingKeys) {
			if (key === "err" && recFiltered.err === void 0) continue;
			parts.push(indent(`"${key}": ${stringify(recFiltered[key])}`, true));
		}
		const jsonPart = parts.join(",\n");
		const stackPart = indent(stack, true);
		return jsonPart ? `${jsonPart}\n${stackPart}\n` : `${stackPart}\n`;
	}
	return `${remainingKeys.map((key) => `${indent(`"${key}": ${stringify(recFiltered[key])}`, true)}`).join(",\n")}\n`;
}
function formatRecord(rec, colorize = true) {
	const level = colorize ? colorizedLevels[rec.level] : levels[rec.level];
	const msg = `${indent(rec.msg)}`;
	const meta = getMeta(rec, colorize);
	const details = getDetails(rec);
	return util$1.format("%s: %s%s\n%s", level, msg, meta, details);
}
var PrettyStdoutStream = class extends Writable {
	constructor() {
		super({ objectMode: true });
	}
	_write(data, _encoding, callback) {
		process.stdout.write(formatRecord(data));
		callback();
	}
};
//#endregion
export { PrettyStdoutStream, formatRecord, getDetails, getMeta, indent };

//# sourceMappingURL=pretty-stdout.js.map