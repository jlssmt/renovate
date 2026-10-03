import { logger } from "../logger/index.js";
import { ExternalHostError } from "../types/errors/external-host-error.js";
import pAll from "p-all";
import pMap from "p-map";
//#region lib/util/promises.ts
function isExternalHostError(err) {
	return err instanceof ExternalHostError;
}
function handleMultipleErrors(errors) {
	const hostError = errors.find(isExternalHostError);
	if (hostError) throw hostError;
	if (errors.length === 1 || new Set(errors.map(({ message }) => message)).size === 1) {
		const [error] = errors;
		throw error;
	}
	throw new AggregateError(errors);
}
function handleError(err) {
	if (!(err instanceof AggregateError)) throw err;
	logger.debug({ err }, "Aggregate error is thrown");
	handleMultipleErrors(err.errors);
}
async function all(tasks, options) {
	try {
		return await pAll(tasks, {
			concurrency: 5,
			stopOnError: false,
			...options
		});
	} catch (err) {
		return handleError(err);
	}
}
async function map(input, mapper, options) {
	try {
		return await pMap(input, mapper, {
			concurrency: 5,
			stopOnError: false,
			...options
		});
	} catch (err) {
		return handleError(err);
	}
}
//#endregion
export { all, map };

//# sourceMappingURL=promises.js.map