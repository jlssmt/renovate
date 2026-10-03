import { regEx } from "../../../util/regex.js";
//#region lib/modules/manager/ansible-galaxy/util.ts
const newBlockRegEx = regEx(/^\s*-\s*(?:(?<key>\w+):\s*(?<value>.*))$/);
const blockLineRegEx = regEx(/^\s*(?:(?<key>\w+):\s*(?<value>\S+))\s*$/);
const galaxyDepRegex = regEx(/[\w-]+\.[\w-]+/);
const dependencyRegex = regEx(/^dependencies:/);
const galaxyRegEx = regEx(/^\s+["']?(?<packageName>[\w.]+)["']?:\s*["']?(?<version>.+?)["']?\s*(?:\s#.*)?$/);
const nameMatchRegex = regEx(/(?<source>(?:(?:git\+)?(?:(?:git|ssh|https?):\/\/)?(?:.*@)?(?<hostname>[\w.-]+)(?:(?::\d+)?\/|:))(?<depName>[\w./-]+)(?:\.git)?)(?:,(?<version>[\w.]*))?/);
//#endregion
export { blockLineRegEx, dependencyRegex, galaxyDepRegex, galaxyRegEx, nameMatchRegex, newBlockRegEx };

//# sourceMappingURL=util.js.map