import { regEx } from "../util/regex.js";
import { isNonEmptyString } from "@sindresorhus/is";
import { braceExpand } from "minimatch";
//#region lib/config/app-strings.ts
const configFileNames = [
	"renovate.json{,c,5}",
	".github/renovate.json{,c,5}",
	".gitlab/renovate.json{,c,5}",
	".renovaterc",
	".renovaterc.json{,c,5}",
	"package.json"
].flatMap((p) => braceExpand(p));
let userAddedConfigFileNames = [];
function setUserConfigFileNames(fileNames) {
	userAddedConfigFileNames = fileNames;
}
function getConfigFileNames(platform) {
	let filteredConfigFileNames = [...configFileNames];
	if (isNonEmptyString(platform)) {
		const platfromRe = regEx("\\.(?<platform>.*)\\/renovate\\.json[c5]?$");
		filteredConfigFileNames = configFileNames.filter((filename) => {
			const matchResult = platfromRe.exec(filename);
			if (!matchResult) return true;
			if (matchResult?.groups?.platform === platform) return true;
			return false;
		});
		if (!["github", "gitlab"].includes(platform) && platform !== "local") {
			filteredConfigFileNames.push(`.${platform}/renovate.json`);
			filteredConfigFileNames.push(`.${platform}/renovate.jsonc`);
			filteredConfigFileNames.push(`.${platform}/renovate.json5`);
		}
	}
	return [...userAddedConfigFileNames, ...filteredConfigFileNames];
}
//#endregion
export { getConfigFileNames, setUserConfigFileNames };

//# sourceMappingURL=app-strings.js.map