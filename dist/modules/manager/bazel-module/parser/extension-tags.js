import { regEx } from "../../../../util/regex.js";
import { crateExtensionPrefix, crateExtensionTags } from "./crate.js";
import { kvParams } from "./common.js";
import { mavenExtensionPrefix, mavenExtensionTags } from "./maven.js";
import { ociExtensionTags } from "./oci.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/bazel-module/parser/extension-tags.ts
const supportedExtensionRegex = regEx(`^(${crateExtensionPrefix}|oci|${mavenExtensionPrefix}).*$`);
const supportedExtensionTags = [
	...crateExtensionTags,
	...mavenExtensionTags,
	...ociExtensionTags
];
const supportedExtensionTagsRegex = regEx(`^(${supportedExtensionTags.join("|")})$`);
const extensionTags = query.sym(supportedExtensionRegex, (ctx, token) => {
	const rawExtension = token.value;
	const extension = rawExtension.match(supportedExtensionRegex)[1];
	return ctx.prepareExtensionTag(extension, rawExtension, token.offset);
}).op(".").sym(supportedExtensionTagsRegex, (ctx, token) => {
	return ctx.startExtensionTag(token.value);
}).join(query.tree({
	type: "wrapped-tree",
	maxDepth: 1,
	search: kvParams,
	postHandler: (ctx, tree) => {
		// v8 ignore else -- TODO: add test #40625
		if (tree.type === "wrapped-tree") {
			const { endsWith } = tree;
			const endOffset = endsWith.offset + endsWith.value.length;
			return ctx.endExtensionTag(endOffset);
		}
		// istanbul ignore next
		throw new Error(`Unexpected tree in postHandler: ${tree.type}`);
	}
}));
//#endregion
export { extensionTags };

//# sourceMappingURL=extension-tags.js.map