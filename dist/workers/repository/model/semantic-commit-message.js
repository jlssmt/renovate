import { regEx } from "../../../util/regex.js";
import { CommitMessage } from "./commit-message.js";
//#region lib/workers/repository/model/semantic-commit-message.ts
/**
* @see https://www.conventionalcommits.org/en/v1.0.0/#summary
*
* <type>[optional scope]: <description>
* [optional body]
* [optional footer]
*/
var SemanticCommitMessage = class SemanticCommitMessage extends CommitMessage {
	static REGEXP = regEx(/^(?<type>[\w]+)(?:\((?<scope>[\w-]+)\))?(?<breaking>!)?: (?:(?<issue>(?:[A-Z]+-|#)[\d]+) )?(?<description>.*)/);
	_scope = "";
	_type = "";
	static is(value) {
		return value instanceof SemanticCommitMessage;
	}
	static fromString(value) {
		const match = value.match(SemanticCommitMessage.REGEXP);
		if (!match?.groups) return;
		const { groups } = match;
		const message = new SemanticCommitMessage();
		message.type = groups.type;
		message.scope = groups.scope;
		message.subject = groups.description;
		return message;
	}
	toJSON() {
		return {
			...super.toJSON(),
			scope: this._scope,
			type: this._type
		};
	}
	set scope(value) {
		this._scope = this.normalizeInput(value);
	}
	set type(value) {
		this._type = this.normalizeInput(value);
	}
	get prefix() {
		if (this._type && !this._scope) return this._type;
		if (this._scope) return `${this._type}(${this._scope})`;
		return "";
	}
};
//#endregion
export { SemanticCommitMessage };

//# sourceMappingURL=semantic-commit-message.js.map