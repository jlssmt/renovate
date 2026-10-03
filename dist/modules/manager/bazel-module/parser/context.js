import { array, attribute, boolean, extensionTag, isPrimitive, isValue, preparedExtensionTag, repoRuleCall, rule, string, useRepoRule } from "./fragments.js";
//#region lib/modules/manager/bazel-module/parser/context.ts
var CtxProcessingError = class extends Error {
	current;
	parent;
	constructor(current, parent) {
		const msg = `Invalid context state. current: ${current.type}, parent: ${parent?.type ?? "none"}`;
		super(msg);
		this.name = "CtxProcessingError";
		this.current = current;
		this.parent = parent;
	}
};
var Ctx = class {
	source;
	results;
	stack;
	_tempVariableName;
	_tempStrings;
	constructor(source) {
		this.source = source;
		this.results = [];
		this.stack = [];
	}
	get safeCurrent() {
		return this.stack.at(-1);
	}
	get current() {
		const c = this.safeCurrent;
		if (c === void 0) throw new Error("Requested current, but no value.");
		return c;
	}
	get currentRule() {
		const current = this.current;
		if (current.type === "rule") return current;
		throw new Error("Requested current rule, but does not exist.");
	}
	get currentExtensionTag() {
		const current = this.current;
		if (current.type === "extensionTag") return current;
		throw new Error("Requested current extension tag, but does not exist.");
	}
	get currentUseRepoRule() {
		const current = this.current;
		if (current.type === "useRepoRule") return current;
		throw new Error("Requested current use repo rule, but does not exist.");
	}
	get currentRepoRuleCall() {
		const current = this.current;
		if (current.type === "repoRuleCall") return current;
		throw new Error("Requested current repo rule call, but does not exist.");
	}
	get currentArray() {
		const current = this.current;
		if (current.type === "array") return current;
		throw new Error("Requested current array, but does not exist.");
	}
	popPreparedExtensionTag() {
		const c = this.stack.pop();
		if (c === void 0) throw new Error("Requested current, but no value.");
		if (c.type === "preparedExtensionTag") return c;
		throw new Error("Requested current prepared extension tag, but does not exist.");
	}
	popStack() {
		const current = this.stack.pop();
		if (!current) return false;
		if (!current.isComplete) {
			this.stack.push(current);
			return false;
		}
		const parent = this.safeCurrent;
		if (parent) {
			if (parent.type === "attribute" && isValue(current)) {
				parent.value = current;
				parent.isComplete = true;
				return true;
			}
			if (parent.type === "array" && isPrimitive(current)) {
				parent.items.push(current);
				return true;
			}
			// v8 ignore else -- TODO: add test #40625
			if ((parent.type === "rule" || parent.type === "extensionTag" || parent.type === "repoRuleCall") && current.type === "attribute" && current.value !== void 0) {
				parent.children[current.name] = current.value;
				return true;
			}
		} else if (current.type === "rule" || current.type === "extensionTag" || current.type === "useRepoRule" || current.type === "repoRuleCall") {
			this.results.push(current);
			return true;
		}
		throw new CtxProcessingError(current, parent);
	}
	processStack() {
		while (this.popStack());
		return this;
	}
	addString(value) {
		this.stack.push(string(value));
		return this.processStack();
	}
	addBoolean(value) {
		this.stack.push(boolean(value));
		return this.processStack();
	}
	startRule(name) {
		const rule$1 = rule(name);
		this.stack.push(rule$1);
		return this;
	}
	endRule() {
		const rule = this.currentRule;
		rule.isComplete = true;
		return this.processStack();
	}
	prepareExtensionTag(extension, rawExtension, offset) {
		const preppedTag = preparedExtensionTag(extension, rawExtension, offset);
		this.stack.push(preppedTag);
		return this;
	}
	startExtensionTag(tag) {
		const { extension, rawExtension, offset } = this.popPreparedExtensionTag();
		const extensionTag$1 = extensionTag(extension, rawExtension, tag, offset);
		this.stack.push(extensionTag$1);
		return this;
	}
	endExtensionTag(offset) {
		const tag = this.currentExtensionTag;
		tag.isComplete = true;
		tag.rawString = this.source.slice(tag.offset, offset);
		return this.processStack();
	}
	startUseRepoRule(variableName, bzlFile, ruleName) {
		const useRepoRule$1 = useRepoRule(variableName, bzlFile, ruleName);
		this.stack.push(useRepoRule$1);
		return this;
	}
	endUseRepoRule() {
		const useRepoRule = this.currentUseRepoRule;
		useRepoRule.isComplete = true;
		return this.processStack();
	}
	startRepoRuleCall(functionName, offset) {
		const repoRuleCall$1 = repoRuleCall(functionName, offset);
		this.stack.push(repoRuleCall$1);
		return this;
	}
	endRepoRuleCall(offset) {
		const repoRuleCall = this.currentRepoRuleCall;
		repoRuleCall.isComplete = true;
		repoRuleCall.rawString = this.source.slice(repoRuleCall.offset, offset);
		return this.processStack();
	}
	startAttribute(name) {
		this.stack.push(attribute(name));
		return this.processStack();
	}
	startArray() {
		this.stack.push(array());
		return this.processStack();
	}
	endArray() {
		const array = this.currentArray;
		array.isComplete = true;
		return this.processStack();
	}
};
//#endregion
export { Ctx, CtxProcessingError };

//# sourceMappingURL=context.js.map