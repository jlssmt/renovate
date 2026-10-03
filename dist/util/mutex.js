import { Mutex, withTimeout } from "async-mutex";
//#region lib/util/mutex.ts
const DEFAULT_NAMESPACE = "default";
const DEFAULT_TIMEOUT_MS = 12e4;
let mutexes = {};
function initMutexes() {
	mutexes = {};
}
function getMutex(key, namespace = DEFAULT_NAMESPACE) {
	mutexes[namespace] ??= {};
	mutexes[namespace][key] ??= new Mutex();
	return mutexes[namespace][key];
}
function acquireLock(key, namespace = DEFAULT_NAMESPACE, timeoutMs = DEFAULT_TIMEOUT_MS) {
	return withTimeout(getMutex(key, namespace), timeoutMs).acquire();
}
//#endregion
export { acquireLock, getMutex, initMutexes };

//# sourceMappingURL=mutex.js.map