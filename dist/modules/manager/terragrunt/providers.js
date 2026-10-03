import { newlineRegex, regEx } from "../../../util/regex.js";
import { keyValueExtractionRegex } from "./util.js";
regEx(/^(?:(?<hostname>(?:[a-zA-Z0-9]+\.+)+[a-zA-Z0-9]+)\/)?(?:(?<namespace>[^/]+)\/)?(?<type>[^/]+)/);
function extractBracesContent(content) {
	const stack = [];
	let i = 0;
	for (; i < content.length; i += 1) if (content[i] === "{") stack.push(content[i]);
	else if (content[i] === "}") {
		stack.pop();
		if (stack.length === 0) break;
	}
	return i;
}
function extractTerragruntProvider(startingLine, lines, moduleName) {
	const lineNumber = startingLine;
	let line;
	const deps = [];
	const managerData = {
		moduleName,
		terragruntDependencyType: "terraform"
	};
	const dep = { managerData };
	const teraformContent = lines.slice(lineNumber).join("\n").substring(0, extractBracesContent(lines.slice(lineNumber).join("\n"))).split(newlineRegex);
	for (let lineNo = 0; lineNo < teraformContent.length; lineNo += 1) {
		line = teraformContent[lineNo];
		const kvGroups = keyValueExtractionRegex.exec(line)?.groups;
		if (kvGroups) {
			managerData.source = kvGroups.value;
			managerData.sourceLine = lineNumber + lineNo;
		}
	}
	deps.push(dep);
	return {
		lineNumber,
		dependencies: deps
	};
}
//#endregion
export { extractTerragruntProvider };

//# sourceMappingURL=providers.js.map