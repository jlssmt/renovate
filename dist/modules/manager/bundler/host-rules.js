import { findAll } from "../../../util/host-rules.js";
//#region lib/modules/manager/bundler/host-rules.ts
function isAuthenticatable(rule) {
	return !!rule.resolvedHost && (!!rule.username && !!rule.password || !!rule.token);
}
function findAllAuthenticatable({ hostType }) {
	return findAll({ hostType }).filter(isAuthenticatable);
}
function getAuthenticationHeaderValue(hostRule) {
	if (hostRule.username) return `${encodeURIComponent(hostRule.username)}:${hostRule.password}`;
	return `${hostRule.token}`;
}
//#endregion
export { findAllAuthenticatable, getAuthenticationHeaderValue };

//# sourceMappingURL=host-rules.js.map