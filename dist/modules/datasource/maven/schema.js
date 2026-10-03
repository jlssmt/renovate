import { coerceArray } from "../../../util/array.js";
import { z } from "zod/v4";
import { XmlDocument } from "xmldoc";
//#region lib/modules/datasource/maven/schema.ts
const xmlHeader = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
function escapeXml(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
var XmlWriter = class {
	lines = [];
	level;
	constructor(level = 0) {
		this.level = level;
	}
	value(name, value) {
		if (value === void 0) return;
		this.lines.push(`${this.indent()}<${name}>${escapeXml(value)}</${name}>`);
	}
	node(name, renderChildren) {
		this.renderNode(name, renderChildren, false);
	}
	nodeOrEmpty(name, renderChildren) {
		this.renderNode(name, renderChildren, true);
	}
	hasContent() {
		return this.lines.length > 0;
	}
	toString() {
		return this.lines.join("\n");
	}
	renderNode(name, renderChildren, preserveEmpty) {
		const contentStart = this.lines.length;
		this.level += 1;
		renderChildren(this);
		this.level -= 1;
		const content = this.lines.splice(contentStart);
		if (!content.length) {
			if (preserveEmpty) this.lines.push(`${this.indent()}<${name} />`);
			return;
		}
		this.lines.push(`${this.indent()}<${name}>`, ...content, `${this.indent()}</${name}>`);
	}
	indent() {
		return "  ".repeat(this.level);
	}
};
function shrinkToUsefulSize(original, trimmed) {
	if (trimmed.length >= original.length) return original;
	return trimmed;
}
function renderRelocationNode(xml, relocation) {
	if (!relocation) return;
	xml.nodeOrEmpty("relocation", () => {
		xml.value("groupId", relocation.valueWithPath("groupId"));
		xml.value("artifactId", relocation.valueWithPath("artifactId"));
		xml.value("version", relocation.valueWithPath("version"));
		xml.value("message", relocation.valueWithPath("message"));
	});
}
function trimMetadataXml(metadata, input) {
	const version = metadata.descendantWithPath("version")?.val;
	const latest = metadata.descendantWithPath("versioning.latest")?.val;
	const release = metadata.descendantWithPath("versioning.release")?.val;
	const versions = coerceArray(metadata.descendantWithPath("versioning.versions")?.childrenNamed("version").map((child) => child.val));
	const snapshot = metadata.descendantWithPath("versioning.snapshot");
	const timestamp = snapshot?.childNamed("timestamp")?.val;
	const buildNumber = snapshot?.childNamed("buildNumber")?.val;
	const xml = new XmlWriter();
	xml.node("metadata", () => {
		xml.value("version", version);
		xml.node("versioning", () => {
			xml.value("latest", latest);
			xml.value("release", release);
			xml.node("versions", () => {
				for (const trimmedVersion of versions) xml.value("version", trimmedVersion);
			});
			xml.node("snapshot", () => {
				xml.value("timestamp", timestamp);
				xml.value("buildNumber", buildNumber);
			});
		});
	});
	if (!xml.hasContent()) return input;
	return shrinkToUsefulSize(input, [xmlHeader, xml.toString()].join("\n"));
}
function trimPomXml(project, input) {
	const homepage = project.valueWithPath("url");
	const sourceUrl = project.valueWithPath("scm.url");
	const groupId = project.valueWithPath("groupId");
	const relocation = project.descendantWithPath("distributionManagement.relocation");
	const parent = project.childNamed("parent");
	const xml = new XmlWriter();
	xml.node("project", () => {
		xml.value("groupId", groupId);
		xml.value("url", homepage);
		xml.node("scm", () => {
			xml.value("url", sourceUrl);
		});
		xml.node("distributionManagement", () => {
			renderRelocationNode(xml, relocation);
		});
		xml.node("parent", () => {
			xml.value("groupId", parent?.valueWithPath("groupId"));
			xml.value("artifactId", parent?.valueWithPath("artifactId"));
			xml.value("version", parent?.valueWithPath("version"));
		});
	});
	if (!xml.hasContent()) return input;
	return shrinkToUsefulSize(input, [xmlHeader, xml.toString()].join("\n"));
}
function trimMavenXml(input) {
	let parsed;
	try {
		parsed = new XmlDocument(input);
	} catch {
		return input;
	}
	if (parsed.name.includes(":")) return input;
	switch (parsed.name) {
		case "metadata": return trimMetadataXml(parsed, input);
		case "project": return trimPomXml(parsed, input);
		default: return input;
	}
}
const CachedMavenXml = z.string().transform(trimMavenXml);
//#endregion
export { CachedMavenXml, trimMavenXml };

//# sourceMappingURL=schema.js.map