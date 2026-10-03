import { coerceString } from "../../../util/string.js";
import { CustomCommitMessage } from "./custom-commit-message.js";
import { SemanticCommitMessage } from "./semantic-commit-message.js";
//#region lib/workers/repository/model/commit-message-factory.ts
var CommitMessageFactory = class {
	_config;
	constructor(config) {
		this._config = config;
	}
	create() {
		return this.areSemanticCommitsEnabled ? this.createSemanticCommitMessage() : this.createCustomCommitMessage();
	}
	createSemanticCommitMessage() {
		const message = new SemanticCommitMessage();
		message.type = coerceString(this._config.semanticCommitType);
		message.scope = coerceString(this._config.semanticCommitScope);
		return message;
	}
	createCustomCommitMessage() {
		const message = new CustomCommitMessage();
		message.prefix = this._config.commitMessagePrefix ?? "";
		return message;
	}
	get areSemanticCommitsEnabled() {
		return !this._config.commitMessagePrefix && this._config.semanticCommits === "enabled";
	}
};
//#endregion
export { CommitMessageFactory };

//# sourceMappingURL=commit-message-factory.js.map