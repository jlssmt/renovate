//#region lib/util/cache/repository/impl/null.ts
var RepoCacheNull = class {
	data = {};
	// istanbul ignore next
	load() {
		return Promise.resolve();
	}
	// istanbul ignore next
	save() {
		return Promise.resolve();
	}
	getData() {
		return this.data;
	}
	isModified() {}
};
//#endregion
export { RepoCacheNull };

//# sourceMappingURL=null.js.map