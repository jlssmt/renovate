import { get, set } from "../../../util/cache/memory/index.js";
import { logger } from "../../../logger/index.js";
import { hash } from "../../../util/hash.js";
import { supportedRulesRegex } from "./rules/index.js";
import { lang, query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/bazel/parser.ts
function emptyCtx(source) {
	return {
		source,
		results: [],
		stack: []
	};
}
function currentFragment(ctx) {
	return ctx.stack.at(-1);
}
function extractTreeValue(source, tree, offset) {
	// v8 ignore else -- type narrowing only
	if (tree.type === "wrapped-tree") {
		const { endsWith } = tree;
		const to = endsWith.offset + endsWith.value.length;
		return source.slice(offset, to);
	}
	// istanbul ignore next
	return "";
}
/**
* Matches key-value pairs:
* - `tag = "1.2.3"`
* - `name = "foobar"`
* - `deps = ["foo", "bar"]`
* - `
*     artifacts = [
maven.artifact(
group = "com.example1",
artifact = "foobar",
version = "1.2.3",
)
]
`
**/
const kwParams = query.sym((ctx, { value: recordKey }) => {
	return {
		...ctx,
		recordKey
	};
}).op("=").alt(query.str((ctx, { offset, value }) => {
	const frag = currentFragment(ctx);
	// v8 ignore else -- type narrowing only
	if (frag.type === "record" && ctx.recordKey) {
		const key = ctx.recordKey;
		frag.children[key] = {
			type: "string",
			value,
			offset
		};
	}
	return ctx;
}), query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	startsWith: "[",
	endsWith: "]",
	preHandler: (ctx, tree) => {
		const parentRecord = currentFragment(ctx);
		// v8 ignore else -- type narrowing only
		if (parentRecord.type === "record" && ctx.recordKey && tree.type === "wrapped-tree") {
			const key = ctx.recordKey;
			parentRecord.children[key] = {
				type: "array",
				value: "",
				offset: tree.startsWith.offset,
				children: []
			};
		}
		return ctx;
	},
	search: query.alt(query.str((ctx, { value, offset }) => {
		const parentRecord = currentFragment(ctx);
		// v8 ignore else -- type narrowing only
		if (parentRecord.type === "record" && ctx.recordKey) {
			const key = ctx.recordKey;
			const array = parentRecord.children[key];
			// v8 ignore else -- type narrowing only
			if (array.type === "array") array.children.push({
				type: "string",
				value,
				offset
			});
		}
		return ctx;
	}), query.sym().handler(recordStartHandler).handler((ctx, { value, offset }) => {
		const ruleFragment = currentFragment(ctx);
		// v8 ignore else -- type narrowing only
		if (ruleFragment.type === "record") ruleFragment.children._function = {
			type: "string",
			value,
			offset
		};
		return ctx;
	}).many(query.op(".").sym((ctx, { value }) => {
		const ruleFragment = currentFragment(ctx);
		// v8 ignore else -- type narrowing only
		if (ruleFragment.type === "record" && ruleFragment.children._function) ruleFragment.children._function.value += `.${value}`;
		return ctx;
	}), 0, 3).tree({
		type: "wrapped-tree",
		maxDepth: 1,
		startsWith: "(",
		endsWith: ")",
		search: query.opt(query.sym((ctx, { value: subRecordKey }) => ({
			...ctx,
			subRecordKey
		})).op("=")).str((ctx, { value: subRecordValue, offset }) => {
			const argIndex = ctx.argIndex ?? 0;
			const subRecordKey = ctx.subRecordKey ?? argIndex.toString();
			const ruleFragment = currentFragment(ctx);
			// v8 ignore else -- type narrowing only
			if (ruleFragment.type === "record") ruleFragment.children[subRecordKey] = {
				type: "string",
				value: subRecordValue,
				offset
			};
			delete ctx.subRecordKey;
			ctx.argIndex = argIndex + 1;
			return ctx;
		}),
		postHandler: (ctx, tree) => {
			delete ctx.argIndex;
			const callFrag = currentFragment(ctx);
			ctx.stack.pop();
			// v8 ignore else -- type narrowing only
			if (callFrag.type === "record" && tree.type === "wrapped-tree") {
				callFrag.value = extractTreeValue(ctx.source, tree, callFrag.offset);
				const parentRecord = currentFragment(ctx);
				// v8 ignore else -- type narrowing only
				if (parentRecord.type === "record" && ctx.recordKey) {
					const key = ctx.recordKey;
					const array = parentRecord.children[key];
					// v8 ignore else -- type narrowing only
					if (array.type === "array") array.children.push(callFrag);
				}
			}
			return ctx;
		}
	})),
	postHandler: (ctx, tree) => {
		const parentRecord = currentFragment(ctx);
		// v8 ignore else -- type narrowing only
		if (parentRecord.type === "record" && ctx.recordKey && tree.type === "wrapped-tree") {
			const key = ctx.recordKey;
			const array = parentRecord.children[key];
			// v8 ignore else -- type narrowing only
			if (array.type === "array") array.value = extractTreeValue(ctx.source, tree, array.offset);
		}
		return ctx;
	}
})).handler((ctx) => {
	delete ctx.recordKey;
	return ctx;
});
/**
* Matches rule signature:
*   `git_repository(......)`
*                  ^^^^^^^^
*
* @param search something to match inside parens
*/
function ruleCall(search) {
	return query.tree({
		type: "wrapped-tree",
		maxDepth: 1,
		search,
		postHandler: (ctx, tree) => {
			const frag = currentFragment(ctx);
			// v8 ignore else -- type narrowing only
			if (frag.type === "record" && tree.type === "wrapped-tree") {
				frag.value = extractTreeValue(ctx.source, tree, frag.offset);
				ctx.stack.pop();
				ctx.results.push(frag);
			}
			return ctx;
		}
	});
}
function recordStartHandler(ctx, { offset }) {
	ctx.stack.push({
		type: "record",
		value: "",
		offset,
		children: {}
	});
	return ctx;
}
function ruleNameHandler(ctx, { value, offset }) {
	const ruleFragment = currentFragment(ctx);
	// v8 ignore else -- type narrowing only
	if (ruleFragment.type === "record") ruleFragment.children.rule = {
		type: "string",
		value,
		offset
	};
	return ctx;
}
/**
* Matches regular rules:
* - `git_repository(...)`
* - `_go_repository(...)`
*/
const regularRule = query.sym(supportedRulesRegex, (ctx, token) => ruleNameHandler(recordStartHandler(ctx, token), token)).join(ruleCall(kwParams));
/**
* Matches "maybe"-form rules:
* - `maybe(git_repository, ...)`
* - `maybe(_go_repository, ...)`
*/
const maybeRule = query.sym("maybe", recordStartHandler).join(ruleCall(query.alt(query.begin().sym(supportedRulesRegex, ruleNameHandler).op(","), kwParams)));
const rule = query.alt(maybeRule, regularRule);
const query$1 = query.tree({
	type: "root-tree",
	maxDepth: 16,
	search: rule
});
function getCacheKey(input) {
	return `bazel-parser-${hash(input)}`;
}
const starlark = lang.createLang("starlark");
function parse(input, packageFile) {
	const cacheKey = getCacheKey(input);
	const cachedResult = get(cacheKey);
	// istanbul ignore if
	if (cachedResult === null || cachedResult) return cachedResult;
	let result = null;
	try {
		const parsedResult = starlark.query(input, query$1, emptyCtx(input));
		if (parsedResult) result = parsedResult.results;
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Bazel parsing error");
	}
	set(cacheKey, result);
	return result;
}
//#endregion
export { parse };

//# sourceMappingURL=parser.js.map