import { regEx } from "../../../util/regex.js";
//#region lib/modules/platform/utils/read-only-issue-body.ts
function readOnlyIssueBody(body) {
	return body.replace(regEx(/ To.*?, click on a checkbox below\./g), "").replace(regEx(/\[ ] <!-- \w*-branch.*-->/g), "").replace(regEx(/ - \[ ] <!-- create-config-migration-pr -->.*/g), "").replace(regEx(/ - \[ ] <!-- approve-all-[\w-]*-prs -->.*/g), "").replace(regEx(/ - \[ ] <!-- create-all-[\w-]*-prs -->.*/g), "").replace(regEx(/ - \[ ] <!-- rebase-all-[\w-]*-prs -->.*/g), "");
}
//#endregion
export { readOnlyIssueBody as default, readOnlyIssueBody };

//# sourceMappingURL=read-only-issue-body.js.map