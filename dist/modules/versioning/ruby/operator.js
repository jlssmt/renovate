const SINGLE = ["="];
const ALL = [
	"=",
	"!=",
	">",
	"<",
	">=",
	"<=",
	"~>"
];
function isValidOperator(operator) {
	return ALL.includes(operator);
}
function isSingleOperator(operator) {
	return SINGLE.includes(operator);
}
//#endregion
export { isSingleOperator, isValidOperator };

//# sourceMappingURL=operator.js.map