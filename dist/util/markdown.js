import { regEx } from "./regex.js";
import { remark } from "remark";
import gfm from "remark-gfm";
import github from "remark-github";
//#region lib/util/markdown.ts
function sanitizeMarkdown(markdown) {
	let res = markdown;
	res = res.replace(regEx(/(?<pre>\W)#(?<digit>\d)/gi), "$<pre>#&#8203;$<digit>");
	res = res.split(regEx(/(?<skip>```[\s\S]*?```|`[^`\n]*?`|https?:\/\/[^\s<]+)/gi)).map((part) => part.startsWith("`") || regEx(/^https?:\/\//i).test(part) ? part : part.replace(regEx(/@/g), "@&#8203;")).join("");
	res = res.replace(regEx(/(?<pre>[a-z]@)&#8203;/gi), "$<pre>");
	res = res.replace(regEx(/\/compare\/@&#8203;/g), "/compare/@");
	res = res.replace(regEx(/(?<pre>\(https:\/\/[^)]*?)\.\.\.@&#8203;/g), "$<pre>...@");
	res = res.replace(regEx(/(?<pre>[\s(])#(?<digits>\d+)(?<post>[)\s]?)/g), "$<pre>#&#8203;$<digits>$<post>");
	const backTickRe = regEx(/&#x60;(?<content>[^/]*?)&#x60;/g);
	res = res.replace(backTickRe, "`$<content>`");
	res = res.replace(regEx(/`#&#8203;(?<digits>\d+)`/g), "`#$<digits>`");
	res = res.replace(regEx(/(?<before>[^\n]\n)(?<title>#.*)/g), "$<before>\n$<title>");
	return res;
}
/**
*
* @param content content to process
* @param options github options
* @returns linkified content
*/
async function linkify(content, options) {
	return (await remark().use({ settings: { bullet: "-" } }).use(gfm).use(github, {
		mentionStrong: false,
		...options
	}).process(content)).toString();
}
//#endregion
export { linkify, sanitizeMarkdown };

//# sourceMappingURL=markdown.js.map