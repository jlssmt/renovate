import { regEx } from "../../../util/regex.js";
import { Unity3dDatasource } from "../../datasource/unity3d/index.js";
//#region lib/modules/manager/unity3d/extract.ts
const supportedKeys = ["m_EditorVersion", "m_EditorVersionWithRevision"];
const UnityVersionRegex = regEx(/^(?<depName>.+): (?<currentValue>.+)/);
function extractVersions(content) {
	const deps = [];
	for (const line of content.split("\n")) {
		const matches = UnityVersionRegex.exec(line);
		if (!matches?.groups) continue;
		const key = matches.groups.depName;
		const value = matches.groups.currentValue;
		if (!supportedKeys.includes(key)) continue;
		deps.push({
			currentValue: value,
			datasource: Unity3dDatasource.id,
			depName: "Unity Editor",
			packageName: key
		});
	}
	return deps;
}
function extractPackageFile(content) {
	const deps = [];
	deps.push(...extractVersions(content));
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map