//#region lib/util/exec/exec-error.ts
var ExecError = class extends Error {
	cmd;
	stderr;
	stdout;
	options;
	exitCode;
	signal;
	err;
	constructor(message, data, err) {
		const { cmd, exitCode, stderr, stdout, options, signal } = data;
		super(message);
		this.name = this.constructor.name;
		this.cmd = cmd;
		this.stderr = stderr;
		this.stdout = stdout;
		this.options = options;
		if (exitCode) this.exitCode = exitCode;
		if (signal) this.signal = signal;
		if (err) this.err = err;
	}
};
//#endregion
export { ExecError };

//# sourceMappingURL=exec-error.js.map