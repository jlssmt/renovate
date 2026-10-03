import { Stream } from "node:stream";
//#region lib/logger/problem-stream.ts
const excludeProps = [
	"pid",
	"time",
	"v",
	"hostname"
];
var ProblemStream = class extends Stream {
	_problems = [];
	readable;
	writable;
	constructor() {
		super();
		this.readable = false;
		this.writable = true;
	}
	write(data) {
		const problem = { ...data };
		for (const prop of excludeProps) delete problem[prop];
		this._problems.push(problem);
		return true;
	}
	getProblems() {
		return this._problems;
	}
	clearProblems() {
		this._problems = [];
	}
};
//#endregion
export { ProblemStream, excludeProps };

//# sourceMappingURL=problem-stream.js.map