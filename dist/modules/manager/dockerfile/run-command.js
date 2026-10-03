import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { split } from "shlex";
//#region lib/modules/manager/dockerfile/run-command.ts
/** Shell operators which start a new command */
const commandSeparators = [
	"&&",
	"||",
	";",
	"|",
	"&",
	"(",
	")",
	"{",
	"}"
];
/**
* The `RUN` keyword and its flags, e.g. `RUN --mount=type=cache,target=/x `.
*
* Stripping these leaves the shell command that the instruction runs.
*/
const runPrefixRegex = regEx(/^[ \t]*(?:ONBUILD[ \t]+)?RUN[ \t]+(?:--[a-z]\S*[ \t]+)*/i);
function matchesCommand(token, name) {
	return token === name || !!token?.endsWith(`/${name}`);
}
/**
* Returns the arguments of the command, or `null` if none of the given
* commands were run.
*
* The command is found by its name alone, wherever it sits in the tokens -
* so it's found whether it's prefixed by a shell keyword (`do`/`then`/...),
* a variable assignment (`DEBUG=1 apk add ...`), or a wrapper program
* (`sudo`/`chroot /mnt`/`timeout 30`/...).
*/
function matchCommand(tokens, names) {
	const index = tokens.findIndex((token) => names.some((name) => matchesCommand(token, name)));
	if (index === -1) return null;
	return tokens.slice(index + 1);
}
/**
* Finds the invocations of the given commands in a `RUN` instruction, e.g. the
* `add --no-cache bash=5.2.37-r2` of
*
* ```dockerfile
* RUN apk update && apk add --no-cache bash=5.2.37-r2
* ```
*
* @param instruction the full `RUN` instruction, including any line continuations
* @param escapeChar the Dockerfile escape character, already regex-escaped
* @param names the commands to look for, e.g. `['apt', 'apt-get']`
* @returns the arguments of each invocation, in the order they were run
*/
function parseRunCommands(instruction, escapeChar, names) {
	const joined = instruction.split(newlineRegex).filter((line) => !regEx(/^[ \t]*#/).test(line)).join("\n").replace(regEx(`${escapeChar}[ \\t]*\\r?\\n`, "g"), " ");
	const runPrefix = runPrefixRegex.exec(joined)?.[0];
	if (!runPrefix) return [];
	const command = joined.slice(runPrefix.length);
	if (!names.some((name) => command.includes(name))) return [];
	let tokens;
	try {
		tokens = split(command);
	} catch (err) {
		logger.debug({
			err,
			command
		}, "Failed to tokenize Dockerfile RUN command");
		return [];
	}
	const commands = [];
	let current = [];
	for (const token of tokens) {
		if (token.startsWith("#")) break;
		if (commandSeparators.includes(token)) {
			commands.push(current);
			current = [];
			continue;
		}
		if (token.endsWith(";")) {
			current.push(token.slice(0, -1));
			commands.push(current);
			current = [];
			continue;
		}
		current.push(token);
	}
	commands.push(current);
	return commands.map((command) => matchCommand(command, names)).filter((args) => args !== null);
}
//#endregion
export { parseRunCommands };

//# sourceMappingURL=run-command.js.map