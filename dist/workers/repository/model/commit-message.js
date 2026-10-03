import { regEx } from "../../../util/regex.js";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
//#region lib/workers/repository/model/commit-message.ts
/**
* @see https://git-scm.com/docs/git-commit#_discussion
*
* [optional prefix]: <suject>
* [optional body]
* [optional footer]
*/
var CommitMessage = class CommitMessage {
	static SEPARATOR = ":";
	static EXTRA_WHITESPACES = regEx(/\s+/g);
	_body = "";
	_footer = "";
	_subject = "";
	static formatPrefix(prefix) {
		if (!prefix) return "";
		if (prefix.endsWith(CommitMessage.SEPARATOR)) return prefix;
		return `${prefix}${CommitMessage.SEPARATOR}`;
	}
	toJSON() {
		return {
			body: this._body,
			footer: this._footer,
			subject: this._subject
		};
	}
	toString() {
		return [
			this.title,
			this._body,
			this._footer
		].filter(isNonEmptyStringAndNotWhitespace).join("\n\n");
	}
	get title() {
		return [CommitMessage.formatPrefix(this.prefix), this.formatSubject()].join(" ").trim();
	}
	set body(value) {
		this._body = this.normalizeInput(value);
	}
	set footer(value) {
		this._footer = this.normalizeInput(value);
	}
	set subject(value) {
		this._subject = this.normalizeInput(value);
		this._subject = this._subject?.replace(CommitMessage.EXTRA_WHITESPACES, " ");
	}
	formatSubject() {
		if (!this._subject) return "";
		if (this.prefix) return this._subject.charAt(0).toLowerCase() + this._subject.slice(1);
		return this._subject.charAt(0).toUpperCase() + this._subject.slice(1);
	}
	normalizeInput(value) {
		return value?.trim() ?? "";
	}
};
//#endregion
export { CommitMessage };

//# sourceMappingURL=commit-message.js.map