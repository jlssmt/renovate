//#region lib/util/lazy.ts
var Lazy = class {
	_result;
	executor;
	constructor(executor) {
		this.executor = executor;
	}
	hasValue() {
		return !!this._result;
	}
	getValue() {
		const result = this._result;
		if (result) {
			if (result.type === "success") return result.value;
			throw result.err;
		}
		return this.realizeValue();
	}
	realizeValue() {
		try {
			const value = this.executor();
			this._result = {
				type: "success",
				value
			};
			return value;
		} catch (err) {
			this._result = {
				type: "error",
				err
			};
			throw err;
		}
	}
};
//#endregion
export { Lazy };

//# sourceMappingURL=lazy.js.map