import { newlineRegex, regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
//#region lib/modules/manager/puppet/puppetfile-parser.ts
const forgeRegex = regEx(/^forge\s+['"](?<forge>[^'"]+)['"]/);
const commentRegex = regEx(/#.*$/);
/**
* For us a Puppetfile is build up of forges that have Modules.
*
* Modules are the updatable parts.
*
*/
var Puppetfile = class {
	forgeModules = /* @__PURE__ */ new Map();
	add(currentForge, module) {
		if (Object.keys(module).length === 0) return;
		if (!this.forgeModules.has(currentForge)) this.forgeModules.set(currentForge, []);
		this.forgeModules.get(currentForge)?.push(module);
	}
	getForges() {
		return Array.from(this.forgeModules.keys());
	}
	getModulesOfForge(forgeUrl) {
		const modules = this.forgeModules.get(forgeUrl ?? null);
		return coerceArray(modules);
	}
};
function parsePuppetfile(content) {
	const puppetfile = new Puppetfile();
	let currentForge = null;
	let currentPuppetfileModule = {};
	for (const rawLine of content.split(newlineRegex)) {
		const line = rawLine.replace(commentRegex, "");
		const forgeResult = forgeRegex.exec(line);
		if (forgeResult) {
			puppetfile.add(currentForge, currentPuppetfileModule);
			currentPuppetfileModule = {};
			currentForge = forgeResult.groups.forge;
			continue;
		}
		if (line.startsWith("mod")) {
			puppetfile.add(currentForge, currentPuppetfileModule);
			currentPuppetfileModule = {};
		}
		const moduleValueRegex = regEx(/(?:\s*:(?<key>\w+)\s+=>\s+)?['"](?<value>[^'"]+)['"]/g);
		let moduleValue;
		while ((moduleValue = moduleValueRegex.exec(line)) !== null) {
			const key = moduleValue.groups.key;
			const value = moduleValue.groups.value;
			if (key) {
				currentPuppetfileModule.tags = currentPuppetfileModule.tags ?? /* @__PURE__ */ new Map();
				currentPuppetfileModule.tags.set(key, value);
			} else fillPuppetfileModule(currentPuppetfileModule, value);
		}
	}
	puppetfile.add(currentForge, currentPuppetfileModule);
	return puppetfile;
}
function fillPuppetfileModule(currentPuppetfileModule, value) {
	if (currentPuppetfileModule.name === void 0) currentPuppetfileModule.name = value;
	else if (currentPuppetfileModule.version === void 0) currentPuppetfileModule.version = value;
	else currentPuppetfileModule.skipReason = "invalid-config";
}
//#endregion
export { Puppetfile, parsePuppetfile };

//# sourceMappingURL=puppetfile-parser.js.map