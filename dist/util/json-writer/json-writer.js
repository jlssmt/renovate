//#region lib/util/json-writer/json-writer.ts
var JSONWriter = class {
	indentationType;
	indentationSize;
	constructor(codeFormat = {}) {
		this.indentationSize = codeFormat.indentationSize ?? 2;
		this.indentationType = codeFormat.indentationType ?? "space";
	}
	write(json, newLineAtTheEnd = true) {
		let content = JSON.stringify(json, null, this.indentation);
		if (newLineAtTheEnd) content = content.concat("\n");
		return content;
	}
	get indentation() {
		if (this.indentationType === "tab") return "	";
		return this.indentationSize;
	}
};
//#endregion
export { JSONWriter };

//# sourceMappingURL=json-writer.js.map