import { getEnv } from "../env.js";
import { ExecError } from "./exec-error.js";
import { sanitize } from "../sanitize.js";
import { logger } from "../../logger/index.js";
import { instrument } from "../../instrumentation/index.js";
import { asRawCommand, isCommandWithOptions } from "./utils.js";
import { isNullOrUndefined } from "@sindresorhus/is";
import { join, split } from "shlex";
import { execa } from "execa";
//#region lib/util/exec/common.ts
const NONTERM = [
	"SIGCHLD",
	"SIGCLD",
	"SIGCONT",
	"SIGSTOP",
	"SIGTSTP",
	"SIGTTIN",
	"SIGTTOU",
	"SIGURG",
	"SIGWINCH"
];
const encoding = "utf8";
function stringify(list, writer) {
	return writer?.toString() ?? Buffer.concat(list).toString(encoding);
}
function initStreamListeners(cp, opts) {
	const stdout = [];
	const stderr = [];
	let stdoutLen = 0;
	let stderrLen = 0;
	registerDataListeners(cp.stdout, opts.outputListeners?.stdout);
	registerDataListeners(cp.stderr, opts.outputListeners?.stderr);
	cp.stdout?.on("data", (chunk) => {
		if (opts.outputWriters?.stdout) {
			opts.outputWriters.stdout.write(chunk);
			return;
		}
		const len = Buffer.byteLength(chunk, encoding);
		stdoutLen += len;
		if (stdoutLen > opts.maxBuffer) cp.emit("error", /* @__PURE__ */ new Error("stdout maxBuffer exceeded"));
		else stdout.push(chunk);
	});
	cp.stderr?.on("data", (chunk) => {
		if (opts.outputWriters?.stderr) {
			opts.outputWriters.stderr.write(chunk);
			return;
		}
		const len = Buffer.byteLength(chunk, encoding);
		stderrLen += len;
		if (stderrLen > opts.maxBuffer) cp.emit("error", /* @__PURE__ */ new Error("stderr maxBuffer exceeded"));
		else stderr.push(chunk);
	});
	return [stdout, stderr];
}
function registerDataListeners(readable, dataListeners) {
	if (isNullOrUndefined(readable) || isNullOrUndefined(dataListeners)) return;
	for (const listener of dataListeners) readable.on("data", listener);
}
function exec(commandArgument, opts) {
	let theCmd = commandArgument;
	let ignoreFailure = false;
	if (isCommandWithOptions(commandArgument)) {
		theCmd = join(commandArgument.command);
		if (commandArgument.ignoreFailure !== void 0) ignoreFailure = commandArgument.ignoreFailure;
	}
	return new Promise((resolve, reject) => {
		let cmd = asRawCommand(theCmd);
		let args = [];
		const maxBuffer = opts.maxBuffer ?? 10485760;
		let shell = opts.shell ?? false;
		if (isCommandWithOptions(commandArgument) && commandArgument.shell !== void 0) shell = commandArgument.shell;
		if (shell === false) {
			const parts = split(cmd);
			// v8 ignore else -- TODO: add test #40625
			if (parts) {
				cmd = parts[0];
				args = parts.slice(1);
			}
		}
		const cp = execa(cmd, args, {
			...opts,
			detached: process.platform !== "win32",
			shell,
			extendEnv: false,
			reject: false
		}).nodeChildProcess;
		const [stdout, stderr] = initStreamListeners(cp, {
			...opts,
			maxBuffer
		});
		cp.on("error", (error) => {
			kill(cp, "SIGTERM");
			reject(new ExecError(error.message, rejectInfo(), error));
		});
		cp.on("exit", (code, signal) => {
			if (NONTERM.includes(signal)) return;
			if (signal) {
				kill(cp, signal);
				reject(new ExecError(`Command failed: ${cp.spawnargs.join(" ")}\nInterrupted by ${signal}`, {
					...rejectInfo(),
					signal
				}));
				return;
			}
			if (code !== 0) {
				if (ignoreFailure === void 0 || ignoreFailure === false) {
					reject(new ExecError(`Command failed: ${cp.spawnargs.join(" ")}\n${stringify(stderr, opts.outputWriters?.stderr)}`, {
						...rejectInfo(),
						exitCode: code
					}));
					return;
				}
				logger.once.debug({
					command: cp.spawnargs.join(" "),
					stdout: stringify(stdout, opts.outputWriters?.stdout),
					stderr: stringify(stderr, opts.outputWriters?.stderr),
					exitCode: code
				}, `Ignoring failure to execute comamnd \`${cp.spawnargs.join(" ")}\`, as ignoreFailure=true is set`);
				resolve({
					stderr: stringify(stderr, opts.outputWriters?.stderr),
					stdout: stringify(stdout, opts.outputWriters?.stdout),
					exitCode: code
				});
				return;
			}
			resolve({
				stderr: stringify(stderr, opts.outputWriters?.stderr),
				stdout: stringify(stdout, opts.outputWriters?.stdout)
			});
		});
		function rejectInfo() {
			return {
				cmd: cp.spawnargs.join(" "),
				options: opts,
				stdout: stringify(stdout, opts.outputWriters?.stdout),
				stderr: stringify(stderr, opts.outputWriters?.stderr)
			};
		}
	});
}
function kill(cp, signal) {
	try {
		if (cp.pid && getEnv().RENOVATE_X_EXEC_GPID_HANDLE)
 /**
		* If `pid` is negative, but not `-1`, signal shall be sent to all processes
		* (excluding an unspecified set of system processes),
		* whose process group ID (pgid) is equal to the absolute value of pid,
		* and for which the process has permission to send a signal.
		*/
		return process.kill(-cp.pid, signal);
		cp.stderr?.destroy();
		cp.stdout?.destroy();
		cp.unref();
		return cp.kill(signal);
	} catch {
		return false;
	}
}
function rawExec(cmd, opts) {
	return instrument(`rawExec: ${sanitize(asRawCommand(cmd))}`, () => exec(cmd, opts));
}
//#endregion
export { exec, rawExec };

//# sourceMappingURL=common.js.map