import { EXTERNAL_HOST_ERROR } from "../../constants/error-messages.js";
//#region lib/types/errors/external-host-error.ts
var ExternalHostError = class ExternalHostError extends Error {
	hostType;
	err;
	packageName;
	reason;
	constructor(err, hostType) {
		super(EXTERNAL_HOST_ERROR);
		Object.setPrototypeOf(this, ExternalHostError.prototype);
		this.hostType = hostType;
		this.err = err;
	}
};
//#endregion
export { ExternalHostError };

//# sourceMappingURL=external-host-error.js.map