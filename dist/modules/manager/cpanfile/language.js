import { lang } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/cpanfile/language.ts
/**
* @see https://perldoc.perl.org/perldata#Scalar-value-constructors
*/
const bindigit = "[01]";
const octdigit = "[0-7]";
const digit = "[0-9]";
const nonzerodigit = "[1-9]";
const hexdigit = `(?:${digit}|[a-fA-F])`;
const bininteger = `(?:0[bB](?:_?${bindigit})+)`;
const octinteger = `(?:0(?:_?${octdigit})+)`;
const hexinteger = `(?:0[xX](?:_?${hexdigit})+)`;
const integer = `(?:${`(?:${nonzerodigit}(?:_?${digit})*|0+(?:_?0)*)`}|${bininteger}|${octinteger}|${hexinteger})`;
const digitpart = `(?:${digit}(?:_?${digit})*)`;
const fraction = `(?:\\.${digitpart})`;
const exponent = `(?:[eE][-+]?${digitpart})`;
const pointfloat = `(?:${digitpart}?${fraction}|${digitpart}\\.)`;
const floatnumber = `(?:${pointfloat}|${`(?:(?:${digitpart}|${pointfloat})${exponent})`})`;
const lexer = {
	joinLines: null,
	comments: [{
		type: "line-comment",
		startsWith: "#"
	}],
	symbols: /[_a-zA-Z][_a-zA-Z0-9]*/,
	numbers: new RegExp(`(?:${floatnumber}|${integer})`),
	operators: [
		"==",
		">=",
		">",
		"=>",
		",",
		";"
	],
	brackets: [{
		startsWith: "{",
		endsWith: "}"
	}, {
		startsWith: "(",
		endsWith: ")"
	}],
	strings: [{ startsWith: "'" }, { startsWith: "\"" }]
};
const cpanfile = lang.createLang({
	lexer,
	parser: { useIndentBlocks: false }
});
//#endregion
export { cpanfile };

//# sourceMappingURL=language.js.map