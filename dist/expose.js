import { createRequire } from "node:module";
//#region lib/expose.ts
const require = createRequire(import.meta.url);
const pkg = require("../package.json");
/**
* return's re2
*/
function re2() {
	return require("re2");
}
/**
* return's prettier
*/
function prettier() {
	return require("prettier");
}
/**
* return's openpgp
*/
async function openpgp() {
	return await import("openpgp");
}
/**
* return's bunyan
*/
function bunyan() {
	return require("bunyan");
}
//#endregion
export { bunyan, openpgp, pkg, prettier, re2 };

//# sourceMappingURL=expose.js.map