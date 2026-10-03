import { LooseArray, LooseRecord } from "../../../../util/schema-utils/index.js";
import { asBoolean } from "./starlark.js";
import { isString } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/manager/bazel-module/parser/fragments.ts
const StringFragment = z.object({
	type: z.literal("string"),
	value: z.string(),
	isComplete: z.literal(true)
});
const BooleanFragment = z.object({
	type: z.literal("boolean"),
	value: z.boolean(),
	isComplete: z.literal(true)
});
const PrimitiveFragments = z.discriminatedUnion("type", [StringFragment, BooleanFragment]);
const ArrayFragment = z.object({
	type: z.literal("array"),
	items: LooseArray(PrimitiveFragments),
	isComplete: z.boolean()
});
const StringArrayFragment = z.object({
	type: z.literal("array"),
	items: LooseArray(StringFragment),
	isComplete: z.boolean()
});
const ValueFragments = z.discriminatedUnion("type", [
	StringFragment,
	BooleanFragment,
	ArrayFragment
]);
const RuleFragment = z.object({
	type: z.literal("rule"),
	rule: z.string(),
	children: LooseRecord(ValueFragments),
	isComplete: z.boolean()
});
const PreparedExtensionTagFragment = z.object({
	type: z.literal("preparedExtensionTag"),
	extension: z.string(),
	rawExtension: z.string(),
	offset: z.number(),
	isComplete: z.literal(false)
});
const ExtensionTagFragment = z.object({
	type: z.literal("extensionTag"),
	extension: z.string(),
	rawExtension: z.string(),
	tag: z.string(),
	children: LooseRecord(ValueFragments),
	isComplete: z.boolean(),
	offset: z.number(),
	rawString: z.string().optional()
});
const UseRepoRuleFragment = z.object({
	type: z.literal("useRepoRule"),
	variableName: z.string(),
	bzlFile: z.string(),
	ruleName: z.string(),
	isComplete: z.boolean()
});
const RepoRuleCallFragment = z.object({
	type: z.literal("repoRuleCall"),
	functionName: z.string(),
	children: LooseRecord(ValueFragments),
	isComplete: z.boolean(),
	offset: z.number(),
	rawString: z.string().optional()
});
const AttributeFragment = z.object({
	type: z.literal("attribute"),
	name: z.string(),
	value: ValueFragments.optional(),
	isComplete: z.boolean()
});
z.discriminatedUnion("type", [
	ArrayFragment,
	AttributeFragment,
	BooleanFragment,
	RuleFragment,
	PreparedExtensionTagFragment,
	ExtensionTagFragment,
	UseRepoRuleFragment,
	RepoRuleCallFragment,
	StringFragment
]);
function string(value) {
	return {
		type: "string",
		isComplete: true,
		value
	};
}
function boolean(value) {
	return {
		type: "boolean",
		isComplete: true,
		value: isString(value) ? asBoolean(value) : value
	};
}
function rule(rule, children = {}, isComplete = false) {
	return {
		type: "rule",
		rule,
		isComplete,
		children
	};
}
function preparedExtensionTag(extension, rawExtension, offset) {
	return {
		type: "preparedExtensionTag",
		extension,
		rawExtension,
		offset,
		isComplete: false
	};
}
function extensionTag(extension, rawExtension, tag, offset, children = {}, rawString, isComplete = false) {
	return {
		type: "extensionTag",
		extension,
		rawExtension,
		tag,
		offset,
		rawString,
		isComplete,
		children
	};
}
function useRepoRule(variableName, bzlFile, ruleName, isComplete = false) {
	return {
		type: "useRepoRule",
		variableName,
		bzlFile,
		ruleName,
		isComplete
	};
}
function repoRuleCall(functionName, offset, children = {}, rawString, isComplete = false) {
	return {
		type: "repoRuleCall",
		functionName,
		offset,
		rawString,
		isComplete,
		children
	};
}
function attribute(name, value, isComplete = false) {
	return {
		type: "attribute",
		name,
		value,
		isComplete
	};
}
function array(items = [], isComplete = false) {
	return {
		type: "array",
		items,
		isComplete
	};
}
function isValue(data) {
	return ValueFragments.safeParse(data).success;
}
function isPrimitive$1(data) {
	return PrimitiveFragments.safeParse(data).success;
}
//#endregion
export { ArrayFragment, AttributeFragment, BooleanFragment, ExtensionTagFragment, PreparedExtensionTagFragment, PrimitiveFragments, RepoRuleCallFragment, RuleFragment, StringArrayFragment, StringFragment, UseRepoRuleFragment, ValueFragments, array, attribute, boolean, extensionTag, isPrimitive$1 as isPrimitive, isValue, preparedExtensionTag, repoRuleCall, rule, string, useRepoRule };

//# sourceMappingURL=fragments.js.map