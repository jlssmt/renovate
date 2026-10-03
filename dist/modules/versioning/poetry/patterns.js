import { regEx } from "../../../util/regex.js";
//#region lib/modules/versioning/poetry/patterns.ts
/**
* regex used by poetry.core.version.Version to parse union of SemVer
* (with a subset of pre/post/dev tags) and PEP440
* see: https://github.com/python-poetry/poetry-core/blob/01c0472d9cef3e1a4958364122dd10358a9bd719/poetry/core/version/version.py
*/
const VERSION_PATTERN = regEx([
	"^",
	"v?",
	"(?:",
	"(?:(?<epoch>[0-9]+)!)?",
	"(?<release>[0-9]+(?:\\.[0-9]+){0,2})",
	"(?<pre>",
	"[-_.]?",
	"(?<pre_l>(a|b|c|rc|alpha|beta|pre|preview))",
	"[-_.]?",
	"(?<pre_n>[0-9]+)?",
	")?",
	"(?<post>",
	"(?:-(?<post_n1>[0-9]+))",
	"|",
	"(?:",
	"[-_.]?",
	"(?<post_l>post|rev|r)",
	"[-_.]?",
	"(?<post_n2>[0-9]+)?",
	")",
	")?",
	"(?<dev>",
	"[-_.]?",
	"(?<dev_l>dev)",
	"[-_.]?",
	"(?<dev_n>[0-9]+)?",
	")?",
	")",
	"(?:\\+(?<local>[a-z0-9]+(?:[-_.][a-z0-9]+)*))?",
	"$"
].join(""));
const RANGE_COMPARATOR_PATTERN = regEx(/(?<comparator>\s*(?:\^|~|[><!]?=|[><]|\|\|)\s*)/);
//#endregion
export { RANGE_COMPARATOR_PATTERN, VERSION_PATTERN };

//# sourceMappingURL=patterns.js.map