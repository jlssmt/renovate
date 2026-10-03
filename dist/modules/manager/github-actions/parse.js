import { regEx } from "../../../util/regex.js";
import is from "@sindresorhus/is";
//#region lib/modules/manager/github-actions/parse.ts
function splitFirstFrom(str, sep, start) {
	const idx = str.indexOf(sep, start);
	if (idx === -1) return null;
	return [str.slice(0, idx), str.slice(idx + sep.length)];
}
function splitFirst(str, sep) {
	return splitFirstFrom(str, sep, 0);
}
function parseQuote(input) {
	const trimmed = input.trim();
	const first = trimmed[0];
	const last = trimmed.at(-1);
	if (trimmed.length >= 2 && first === last && (first === "\"" || first === "'")) return {
		value: trimmed.slice(1, -1),
		quote: first
	};
	return {
		value: trimmed,
		quote: ""
	};
}
const shaRe = regEx(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
const shaShortRe = regEx(/^[a-f0-9]{6,7}$/);
function isSha(str) {
	return shaRe.test(str);
}
function isShortSha(str) {
	return shaShortRe.test(str);
}
const DOCKER_PREFIX = "docker://";
function parseDockerReference(input) {
	const originalRef = input.slice(9);
	if (!originalRef) return null;
	const digestParts = splitFirst(originalRef, "@");
	if (digestParts) {
		const [image, digest] = digestParts;
		return {
			kind: "docker",
			image,
			digest,
			originalRef
		};
	}
	const lastSlashIndex = originalRef.lastIndexOf("/");
	const tagParts = splitFirstFrom(originalRef, ":", lastSlashIndex === -1 ? 0 : lastSlashIndex + 1);
	if (tagParts) {
		const [image, tag] = tagParts;
		return {
			kind: "docker",
			image,
			tag,
			originalRef
		};
	}
	return {
		kind: "docker",
		image: originalRef,
		originalRef
	};
}
const repositoryActionRegex = regEx(/^(?:https:\/\/(?<hostname>[^/]+)\/)?(?<owner>[^/]+)\/(?<repo>[^/]+)(?:\/(?<path>.+?))?@(?<ref>.+)$/);
function parseRepositoryReference(input) {
	const match = repositoryActionRegex.exec(input);
	if (!match?.groups) return null;
	const { owner, repo, path, ref } = match.groups;
	let { hostname } = match.groups;
	let isExplicitHostname = true;
	if (is.undefined(hostname)) {
		hostname = "github.com";
		isExplicitHostname = false;
	}
	return {
		kind: "repository",
		hostname,
		isExplicitHostname,
		owner,
		repo,
		path,
		ref
	};
}
function parseActionReference(uses) {
	if (!uses) return null;
	if (uses.startsWith(DOCKER_PREFIX)) return parseDockerReference(uses);
	if (uses.startsWith("./") || uses.startsWith("../")) return {
		kind: "local",
		path: uses
	};
	return parseRepositoryReference(uses);
}
const pinTokenRe = regEx(/^\s*(?:(?:renovate\s*:\s*)?(?:pin\s+|tag\s*=\s*)?|(?:ratchet:[\w-]+\/[.\w-]+(?:\/[.\w-]+)*))?@?(?<version>(?:[\w-]*[-/])?v?\d+(?:\.\d+(?:\.\d+)?)?(?:-[a-zA-Z0-9.]+)?)/);
const versionLikeRe = regEx(/^v?\d+/);
const bareTokenRe = regEx(/^\s*(?<token>\S+)\s*$/);
function parseComment(commentBody) {
	if (commentBody.trim() === "ratchet:exclude") return { ratchetExclude: true };
	const match = pinTokenRe.exec(commentBody);
	if (match?.groups?.version) return {
		pinnedVersion: match.groups.version,
		matchedString: match[0],
		index: match.index
	};
	const bareMatch = bareTokenRe.exec(commentBody);
	if (bareMatch?.groups?.token) return {
		ref: bareMatch.groups.token,
		matchedString: bareMatch[0],
		index: bareMatch.index
	};
	return {};
}
const usesLineRegex = regEx(/^(?<prefix>\s+(?:-\s+)?uses\s*:\s*)(?<remainder>.+)$/);
/**
* Parses a GitHub Actions `uses:` line into its components.
*
* Expected line format:
* ```
* <indentation>[- ]uses: [quote]<action-reference>[quote][ # <comment>]
* ```
*
* Examples:
* - `      uses: actions/checkout@v4`
* - `      - uses: "owner/repo@abc123" # v1.0.0`
* - `      uses: docker://alpine:3.18`
*
* @returns Parsed components or `null` if the line doesn't match `uses:` pattern
*/
function parseUsesLine(line) {
	const match = usesLineRegex.exec(line);
	if (!match?.groups) return null;
	const { prefix, remainder } = match.groups;
	if (remainder.startsWith("#")) return null;
	const indentation = prefix.slice(0, prefix.indexOf("uses"));
	const commentIndex = remainder.indexOf(" #");
	if (commentIndex === -1) {
		const { value, quote } = parseQuote(remainder);
		return {
			indentation,
			usesPrefix: prefix,
			replaceString: remainder.trim(),
			commentPrecedingWhitespace: "",
			commentString: "",
			actionRef: parseActionReference(value),
			commentData: {},
			quote
		};
	}
	const rawValuePart = remainder.slice(0, commentIndex);
	const commentPart = remainder.slice(commentIndex + 1);
	const partBeforeHash = remainder.slice(0, commentIndex + 1);
	const commentPrecedingWhitespace = partBeforeHash.slice(partBeforeHash.trimEnd().length);
	const { value, quote } = parseQuote(rawValuePart);
	const cleanCommentBody = commentPart.slice(1);
	return {
		indentation,
		usesPrefix: prefix,
		replaceString: rawValuePart.trim(),
		commentPrecedingWhitespace,
		commentString: commentPart,
		actionRef: parseActionReference(value),
		commentData: parseComment(cleanCommentBody),
		quote
	};
}
//#endregion
export { isSha, isShortSha, parseActionReference, parseComment, parseQuote, parseUsesLine, versionLikeRe };

//# sourceMappingURL=parse.js.map