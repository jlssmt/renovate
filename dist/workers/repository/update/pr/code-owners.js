import { newlineRegex, regEx } from "../../../../util/regex.js";
import { logger } from "../../../../logger/index.js";
import { readLocalFile } from "../../../../util/fs/index.js";
import { getBranchFiles, getBranchFilesFromCommit } from "../../../../util/git/index.js";
import { platform } from "../../../../modules/platform/index.js";
import { isNonEmptyString } from "@sindresorhus/is";
import ignore from "ignore";
//#region lib/workers/repository/update/pr/code-owners.ts
function extractOwnersFromLine(line) {
	const [pattern, ...usernames] = line.split(regEx(/\s+/));
	const matchPattern = ignore().add(pattern);
	return {
		usernames,
		pattern,
		score: pattern.length,
		match: (path) => matchPattern.ignores(path)
	};
}
function matchFileToOwners(file, rules) {
	const usernames = /* @__PURE__ */ new Map();
	for (const rule of rules) {
		if (!rule.match(file)) continue;
		for (const user of rule.usernames) usernames.set(user, rule.score);
	}
	return {
		file,
		userScoreMap: usernames
	};
}
function getOwnerList(filesWithOwners) {
	const userFileMap = /* @__PURE__ */ new Map();
	for (const fileName of filesWithOwners) for (const [username, score] of fileName.userScoreMap.entries()) {
		const fileMap = userFileMap.get(username) ?? /* @__PURE__ */ new Map();
		if (!userFileMap.has(username)) userFileMap.set(username, fileMap);
		fileMap.set(fileName.file, (fileMap.get(fileName.file) ?? 0) + score);
	}
	return Array.from(userFileMap.entries()).map(([key, value]) => ({
		username: key,
		fileScoreMap: value
	}));
}
function parseCodeOwnersContent(codeOwnersFile) {
	return codeOwnersFile.split(newlineRegex).map((line) => line.split("#")[0]).map((line) => line.trim()).filter(isNonEmptyString);
}
async function codeOwnersForPr(pr) {
	logger.debug("Searching for CODEOWNERS file");
	try {
		const codeOwnersFile = await readLocalFile("CODEOWNERS", "utf8") ?? await readLocalFile(".bitbucket/CODEOWNERS", "utf8") ?? await readLocalFile(".github/CODEOWNERS", "utf8") ?? await readLocalFile(".gitlab/CODEOWNERS", "utf8") ?? await readLocalFile("docs/CODEOWNERS", "utf8");
		if (!codeOwnersFile) {
			logger.debug("No CODEOWNERS file found");
			return [];
		}
		logger.debug(`Found CODEOWNERS file: ${codeOwnersFile}`);
		const prFiles = pr.sha ? await getBranchFilesFromCommit(pr.sha) : await getBranchFiles(pr.sourceBranch);
		if (!prFiles?.length) {
			logger.debug("PR includes no files");
			return [];
		}
		const cleanedLines = parseCodeOwnersContent(codeOwnersFile);
		const fileOwnerRules = platform.extractRulesFromCodeOwnersLines?.(cleanedLines) ?? cleanedLines.map(extractOwnersFromLine);
		logger.debug({
			prFiles,
			fileOwnerRules
		}, "PR files and rules to match for CODEOWNERS");
		const emptyRules = fileOwnerRules.filter((rule) => rule.usernames.length === 0);
		const fileOwners = prFiles.map((file) => matchFileToOwners(file, fileOwnerRules)).map((matchedFile) => {
			if (emptyRules.find((rule) => rule.match(matchedFile.file))) return {
				...matchedFile,
				userScoreMap: /* @__PURE__ */ new Map()
			};
			return matchedFile;
		});
		logger.debug(`CODEOWNERS matched the following files: ${fileOwners.map((f) => f.file).join(", ")}`);
		const userScore = getOwnerList(fileOwners).map((userMatch) => ({
			user: userMatch.username,
			score: Array.from(userMatch.fileScoreMap.values()).reduce((acc, score) => acc + score, 0)
		})).sort((a, b) => b.score - a.score);
		logger.debug(`CODEOWNERS matched the following users: ${JSON.stringify(userScore)}`);
		return userScore.map((u) => u.user);
	} catch (err) {
		logger.warn({
			err,
			pr
		}, "Failed to determine CODEOWNERS for PR.");
		return [];
	}
}
//#endregion
export { codeOwnersForPr };

//# sourceMappingURL=code-owners.js.map