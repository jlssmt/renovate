//#region lib/modules/platform/gitlab/roles.ts
const roleAccessLevels = {
	no_access: 0,
	minimal_access: 5,
	guest: 10,
	planner: 15,
	reporter: 20,
	developer: 30,
	maintainer: 40,
	owner: 50
};
/**
* Parse a GitLab CODEOWNERS role handle (`@@developer`, `@@maintainer`,
* `@@owner`, etc) into its access level. Returns `null` when the handle is not a
* recognized role, so `getRoleAccessLevel(x) !== null` doubles as a role check.
*/
function getRoleAccessLevel(handle) {
	if (!handle.startsWith("@@")) return null;
	const role = handle.slice(2).toLowerCase();
	return roleAccessLevels[role] ?? null;
}
//#endregion
export { getRoleAccessLevel };

//# sourceMappingURL=roles.js.map