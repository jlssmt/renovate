import { regEx } from "../../../util/regex.js";
import { isComment } from "./common.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/manager/conan/extract.ts
const regex = regEx(`(?:^|["'])(?<name>[-\\w]+)/(?<version>[^@#\n{*"']+)(?<userChannel>@[-\\w]+(?:/[^#\n.{*"' ]+|))?#?(?<revision>[-_a-f0-9]+[^\n{*"'])?`);
function setDepType(content, originalType) {
	let depType = originalType;
	if (content.includes("python_requires")) depType = "python_requires";
	else if (content.includes("build_require")) depType = "build_requires";
	else if (content.includes("requires")) depType = "requires";
	return depType;
}
function extractPackageFile(content) {
	const sections = content.split(regEx(/def |\n\[/)).filter((part) => part.includes("python_requires") || part.includes("build_require") || part.includes("require"));
	const deps = [];
	for (const section of sections) {
		let depType = setDepType(section, "requires");
		const rawLines = section.split("\n").filter(isNonEmptyString);
		for (const rawLine of rawLines) if (!isComment(rawLine)) {
			depType = setDepType(rawLine, depType);
			const lines = rawLine.split(regEx(/["'],/));
			for (const line of lines) {
				const matches = regex.exec(line.trim());
				if (matches?.groups) {
					let dep = {};
					const depName = matches.groups?.name;
					const currentValue = matches.groups?.version.trim();
					let replaceString = `${depName}/${currentValue}`;
					let userAndChannel = "@_/_";
					if (matches.groups.userChannel) {
						userAndChannel = matches.groups.userChannel;
						replaceString = `${depName}/${currentValue}${userAndChannel}`;
						if (!userAndChannel.includes("/")) userAndChannel = `${userAndChannel}/_`;
					}
					const packageName = `${depName}/${currentValue}${userAndChannel}`;
					dep = {
						...dep,
						depName,
						packageName,
						currentValue,
						replaceString,
						depType
					};
					if (matches.groups.revision) {
						dep.currentDigest = matches.groups.revision;
						dep.autoReplaceStringTemplate = `{{depName}}/{{newValue}}${userAndChannel}{{#if newDigest}}#{{newDigest}}{{/if}}`;
						dep.replaceString = `${replaceString}#${dep.currentDigest}`;
					}
					deps.push(dep);
				}
			}
		}
	}
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map