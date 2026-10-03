import { PLATFORM_FAMILIES } from "../../constants/platforms.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/util/http/auth.ts
function applyAuthorization(inOptions) {
	const options = { ...inOptions };
	if (isNonEmptyString(options.headers?.authorization) || options.noAuth) return options;
	options.headers ??= {};
	if (options.token) {
		const authType = options.context?.authType;
		if (authType) {
			if (authType === "Token-Only") options.headers.authorization = options.token;
			else options.headers.authorization = `${authType} ${options.token}`;
		} else if (options.token.startsWith("x-access-token:")) {
			const appToken = options.token.replace("x-access-token:", "");
			options.headers.authorization = `Bearer ${appToken}`;
		} else if (options.hostType && PLATFORM_FAMILIES.forgejo.apiUsingHostTypes.includes(options.hostType)) options.headers.authorization = `Bearer ${options.token}`;
		else if (options.hostType && PLATFORM_FAMILIES.gitea.apiUsingHostTypes.includes(options.hostType)) options.headers.authorization = `Bearer ${options.token}`;
		else if (options.hostType && PLATFORM_FAMILIES.github.apiUsingHostTypes.includes(options.hostType)) options.headers.authorization = `token ${options.token}`;
		else if (options.hostType && PLATFORM_FAMILIES.gitlab.apiUsingHostTypes.includes(options.hostType)) {
			if (options.token.length === 20) options.headers["Private-token"] = options.token;
			else options.headers.authorization = `Bearer ${options.token}`;
		} else options.headers.authorization = `Bearer ${options.token}`;
		delete options.token;
	} else if (options.password !== void 0) {
		const auth = Buffer.from(`${options.username ?? ""}:${options.password}`).toString("base64");
		options.headers.authorization = `Basic ${auth}`;
		delete options.username;
		delete options.password;
	}
	return options;
}
//#endregion
export { applyAuthorization };

//# sourceMappingURL=auth.js.map