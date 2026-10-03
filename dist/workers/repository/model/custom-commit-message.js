import { CommitMessage } from "./commit-message.js";
//#region lib/workers/repository/model/custom-commit-message.ts
var CustomCommitMessage = class extends CommitMessage {
	_prefix = "";
	get prefix() {
		return this._prefix;
	}
	set prefix(value) {
		this._prefix = this.normalizeInput(value);
	}
	toJSON() {
		return {
			...super.toJSON(),
			prefix: this._prefix
		};
	}
};
//#endregion
export { CustomCommitMessage };

//# sourceMappingURL=custom-commit-message.js.map