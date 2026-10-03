//#region lib/util/split.ts
let startTime = 0;
let lastTime = 0;
let splits = {
	init: 0,
	onboarding: 0,
	extract: 0,
	lookup: 0,
	update: 0
};
function splitInit() {
	splits = {
		init: 0,
		onboarding: 0,
		extract: 0,
		lookup: 0,
		update: 0
	};
	startTime = Date.now();
	lastTime = startTime;
}
function addSplit(name) {
	const now = Date.now();
	splits[name] = now - lastTime;
	lastTime = now;
}
function getSplits() {
	return {
		splits,
		total: Date.now() - startTime
	};
}
//#endregion
export { addSplit, getSplits, splitInit };

//# sourceMappingURL=split.js.map