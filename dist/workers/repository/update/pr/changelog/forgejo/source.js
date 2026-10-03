import { ForgejoHttp } from "../../../../../../util/http/forgejo.js";
import { GiteaChangeLogSource } from "../gitea/source.js";
//#region lib/workers/repository/update/pr/changelog/forgejo/source.ts
const id = "forgejo-changelog";
/**
* Forgejo is a fork of Gitea and shares its URL layout and API, so only the
* platform id and the Http client differ.
*/
var ForgejoChangeLogSource = class extends GiteaChangeLogSource {
	http = new ForgejoHttp(id);
	constructor() {
		super("forgejo");
	}
};
//#endregion
export { ForgejoChangeLogSource, id };

//# sourceMappingURL=source.js.map