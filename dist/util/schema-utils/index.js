import { logger } from "../../logger/index.js";
import { parseJsonc } from "../common.js";
import { parse } from "../toml.js";
import { parseSingleYaml, parseYaml } from "../yaml.js";
import { DateTime } from "luxon";
import { z } from "zod/v4";
import JSON5 from "json5";
import ini from "ini";
//#region lib/util/schema-utils/index.ts
/**
* Works like `z.array()`, but drops wrong elements instead of invalidating the whole array.
*
* **Important**: non-array inputs are still invalid.
* Use `LooseArray(...).catch([])` to handle it.
*
* @param Elem Schema for array elements
* @param onError Callback for errors
* @returns Schema for array
*/
function LooseArray(Elem, { onError } = {}) {
	if (!onError) return z.array(z.any()).transform((input) => {
		const output = [];
		for (const x of input) {
			const parsed = Elem.safeParse(x);
			if (parsed.success) output.push(parsed.data);
		}
		return output;
	});
	return z.array(z.any()).transform((input) => {
		const output = [];
		const issues = [];
		for (let idx = 0; idx < input.length; idx += 1) {
			const x = input[idx];
			const parsed = Elem.safeParse(x);
			if (parsed.success) {
				output.push(parsed.data);
				continue;
			}
			for (const issue of parsed.error.issues) issues.push({
				...issue,
				path: [idx, ...issue.path]
			});
		}
		if (issues.length) onError({
			error: new z.ZodError(issues),
			input
		});
		return output;
	});
}
function LooseRecord(arg1, arg2, arg3) {
	let Key = z.any();
	let Value;
	let opts = {};
	if (arg2 && arg3) {
		Key = arg1;
		Value = arg2;
		opts = arg3;
	} else if (arg2) {
		if (arg2 instanceof z.ZodType) {
			Key = arg1;
			Value = arg2;
		} else {
			Value = arg1;
			opts = arg2;
		}
	} else Value = arg1;
	const { onError } = opts;
	if (!onError) return z.record(z.string(), z.any()).transform((input) => {
		const output = {};
		for (const [inputKey, inputVal] of Object.entries(input)) {
			const parsedKey = Key.safeParse(inputKey);
			const parsedValue = Value.safeParse(inputVal);
			if (parsedKey.success && parsedValue.success) output[parsedKey.data] = parsedValue.data;
		}
		return output;
	});
	return z.record(z.string(), z.any()).transform((input) => {
		const output = {};
		const issues = [];
		for (const [inputKey, inputVal] of Object.entries(input)) {
			const parsedKey = Key.safeParse(inputKey);
			if (!parsedKey.success) {
				for (const issue of parsedKey.error.issues) issues.push({
					...issue,
					path: [inputKey, ...issue.path]
				});
				continue;
			}
			const parsedValue = Value.safeParse(inputVal);
			if (!parsedValue.success) {
				for (const issue of parsedValue.error.issues) issues.push({
					...issue,
					path: [inputKey, ...issue.path]
				});
				continue;
			}
			output[parsedKey.data] = parsedValue.data;
		}
		if (issues.length) {
			const error = new z.ZodError(issues);
			onError({
				error,
				input
			});
		}
		return output;
	});
}
/**
* Accepts `null`, `undefined`, or an absent key and normalizes all to
* `undefined`. Keeps the output type as `T | undefined` (never `null`), so
* assignment into non-nullable targets needs no `?? undefined` coalescing.
*/
function Nullish(schema) {
	return schema.nullable().transform((value) => value ?? void 0).optional();
}
function deepNullishRewrite(node) {
	if (node instanceof z.ZodOptional) return Nullish(deepNullishRewrite(node.unwrap()));
	if (node instanceof z.ZodObject) {
		const shape = {};
		for (const [key, value] of Object.entries(node.shape)) shape[key] = deepNullishRewrite(value);
		return z.object(shape);
	}
	if (node instanceof z.ZodArray) return z.array(deepNullishRewrite(node.element));
	if (node instanceof z.ZodRecord) return z.record(node.keyType, deepNullishRewrite(node.valueType));
	if (node instanceof z.ZodUnion) {
		const options = node.options;
		return z.union(options.map(deepNullishRewrite));
	}
	if (node instanceof z.ZodDefault) return deepNullishRewrite(node.unwrap()).default(node.def.defaultValue);
	if (node instanceof z.ZodNullable) return z.nullable(deepNullishRewrite(node.unwrap()));
	if (node instanceof z.ZodPipe) return z.pipe(node.def.in, deepNullishRewrite(node.def.out));
	return node;
}
/**
* Walks `schema` at build time and replaces every `.optional()` position with
* `Nullish` semantics — accepting `null`/`undefined`/absent and normalizing all
* to `undefined`. Recurses through `object`, `array`, `record`, `union`,
* `default`, `nullable`, and the **output side** of `pipe`/transform nodes
* (e.g. `Json.pipe(…)`).
*
* Intentional `.nullable()` fields are preserved (null kept), distinguishing
* this from a blunt null-stripping preprocessor.
*
* The pipe **input** side (the decoder, e.g. `Json`) is left untouched.
* **`LooseArray`/`LooseRecord` remain opaque** because their element schema is
* captured in a closure — wrap the inner schema directly for those
* (e.g. `LooseArray(DeepNullish(Inner))`).
*
* Object modifiers (`.strict()`/`.catchall()`/`.passthrough()`/object-level
* `.refine()`) are dropped by the `z.object(shape)` rebuild.
*/
function DeepNullish(schema) {
	return deepNullishRewrite(schema);
}
const Json = z.string().transform((str, ctx) => {
	try {
		return JSON.parse(str);
	} catch {
		ctx.addIssue({
			code: "custom",
			message: "Invalid JSON"
		});
		return z.NEVER;
	}
});
const Json5 = z.string().transform((str, ctx) => {
	try {
		return JSON5.parse(str);
	} catch {
		ctx.addIssue({
			code: "custom",
			message: "Invalid JSON5"
		});
		return z.NEVER;
	}
});
const Jsonc = z.string().transform((str, ctx) => {
	try {
		return parseJsonc(str);
	} catch {
		ctx.addIssue({
			code: "custom",
			message: "Invalid JSONC"
		});
		return z.NEVER;
	}
});
const UtcDate = z.string().describe("ISO 8601 string").transform((str, ctx) => {
	const date = DateTime.fromISO(str, { zone: "utc" });
	if (!date.isValid) {
		ctx.addIssue({
			code: "custom",
			message: "Invalid date"
		});
		return z.NEVER;
	}
	return date;
});
const Yaml = z.string().transform((str, ctx) => {
	try {
		return parseSingleYaml(str);
	} catch {
		ctx.addIssue({
			code: "custom",
			message: "Invalid YAML"
		});
		return z.NEVER;
	}
});
z.string().transform((str, ctx) => {
	try {
		return parseYaml(str);
	} catch {
		ctx.addIssue({
			code: "custom",
			message: "Invalid YAML"
		});
		return z.NEVER;
	}
});
function multidocYaml(opts) {
	return z.string().transform((str, ctx) => {
		try {
			return parseYaml(str, opts);
		} catch {
			ctx.addIssue({
				code: "custom",
				message: "Invalid YAML"
			});
			return z.NEVER;
		}
	});
}
const Toml = z.string().transform((str, ctx) => {
	try {
		return parse(str);
	} catch {
		ctx.addIssue({
			code: "custom",
			message: "Invalid TOML"
		});
		return z.NEVER;
	}
});
const Ini = z.string().transform((str, ctx) => {
	try {
		return ini.parse(str);
	} catch /* v8 ignore next -- TODO: add test #40625 */ {
		ctx.addIssue({
			code: "custom",
			message: "Invalid INI"
		});
		return z.NEVER;
	}
});
function withDepType(schema, depType, force = true) {
	return schema.transform((deps) => {
		for (const dep of deps) if (!dep.depType || force) dep.depType = depType;
		return deps;
	});
}
function withDebugMessage(value, msg) {
	return ({ error: err }) => {
		logger.debug({ err }, msg);
		return value;
	};
}
function isCircular(value, visited = /* @__PURE__ */ new Set()) {
	if (value === null || typeof value !== "object") return false;
	if (visited.has(value)) return true;
	const downstreamVisited = new Set(visited);
	downstreamVisited.add(value);
	if (Array.isArray(value)) {
		for (const childValue of value) if (isCircular(childValue, downstreamVisited)) return true;
		return false;
	}
	const values = Object.values(value);
	for (const ov of values) if (isCircular(ov, downstreamVisited)) return true;
	return false;
}
const NotCircular = z.unknown().superRefine((val, ctx) => {
	if (isCircular(val)) {
		ctx.addIssue({
			code: "custom",
			message: "values cannot be circular data structures",
			fatal: true
		});
		return z.NEVER;
	}
});
const StandardEmail = z.email();
const EmailAddress = z.string().refine((value) => StandardEmail.safeParse(value.replace("[bot]@", "@")).success, "Invalid email address");
function isEmailAdress(value) {
	return EmailAddress.safeParse(value).success;
}
//#endregion
export { DeepNullish, EmailAddress, Ini, Json, Json5, Jsonc, LooseArray, LooseRecord, NotCircular, Nullish, Toml, UtcDate, Yaml, isEmailAdress, multidocYaml, withDebugMessage, withDepType };

//# sourceMappingURL=index.js.map