import { regEx } from "../regex.js";
//#region lib/util/http/www-authenticate.ts
/**
* Inspired by https://github.com/alexdutton/www-authenticate
*/
const BearerScheme = "bearer";
const tokenizer = [
	{
		type: "token",
		matcher: regEx(/^(?<value>[a-zA-Z0-9!#$%&'*+.^_`|~-]+)/)
	},
	{
		type: "token",
		matcher: regEx(/^"(?<value>(?:[^"\\]|\\\\|\\")*)"/)
	},
	{ matcher: regEx(/^\s+/) },
	{
		type: "equals",
		matcher: regEx(/^(?<value>=)/)
	},
	{
		type: "comma",
		matcher: regEx(/^(?<value>,)/)
	}
];
function tokenize(input) {
	const result = [];
	let remaining = input;
	while (remaining.length > 0) {
		let matched = false;
		for (const t of tokenizer) {
			const match = t.matcher.exec(remaining);
			if (match) {
				matched = true;
				remaining = remaining.slice(match[0].length);
				if (t.type) result.push({
					type: t.type,
					value: match[1]
				});
				break;
			}
		}
		if (!matched) throw new Error(`Failed to parse value`);
	}
	return result;
}
function groupPairs(tokens) {
	for (let i = 0; i < tokens.length - 2; i++) if (tokens[i].type === "token" && tokens[i + 1].type === "equals" && tokens[i + 2].type === "token") {
		tokens[i] = {
			type: "pair",
			key: tokens[i].value,
			value: tokens[i + 2].value
		};
		tokens.splice(i + 1, 2);
	}
	return tokens;
}
function groupChallenges(tokens) {
	const result = [];
	while (tokens.length > 0) {
		let j = 1;
		if (tokens.length === 1) {} else if (tokens[1].type === "comma") {} else if (tokens[1].type === "token") j = 2;
		else {
			while (j < tokens.length && tokens[j].type === "pair") j += 2;
			j--;
		}
		result.push({
			scheme: tokens[0].value,
			tokens: tokens.slice(1, j)
		});
		tokens.splice(0, j + 1);
	}
	return result;
}
function parse(header) {
	const result = [];
	for (const h of Array.isArray(header) ? header : [header]) {
		let tokens = tokenize(h);
		if (!tokens.length) continue;
		tokens = groupPairs(tokens);
		for (const c of groupChallenges(tokens)) {
			const args = [];
			const params = {};
			for (const t of c.tokens) switch (t.type) {
				case "token":
					args.push(t.value);
					break;
				case "pair": params[t.key] = t.value;
			}
			if (args.length) result.push({
				scheme: c.scheme.toLowerCase(),
				params: args[0]
			});
			else if (Object.keys(params).length) result.push({
				scheme: c.scheme.toLowerCase(),
				params
			});
			else result.push({ scheme: c.scheme.toLowerCase() });
		}
	}
	return result;
}
//#endregion
export { BearerScheme, parse };

//# sourceMappingURL=www-authenticate.js.map