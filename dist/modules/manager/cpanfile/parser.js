import { regEx } from "../../../util/regex.js";
import { id } from "../../versioning/perl/index.js";
import { CpanDatasource } from "../../datasource/cpan/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { cpanfile } from "./language.js";
import { query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/cpanfile/parser.ts
const perlVersionMatch = query.sym("requires").alt(query.sym("perl"), query.str("perl")).alt(query.op(","), query.op("=>")).alt(query.num((ctx, { value: perlVersion }) => ({
	...ctx,
	perlVersion
})), query.str((ctx, { value: perlVersion }) => ({
	...ctx,
	perlVersion
}))).op(";").handler((ctx) => {
	// v8 ignore else -- the matched alternatives above always set it
	if (ctx.perlVersion) ctx.deps.push({
		depName: "perl",
		packageName: "Perl/perl5",
		currentValue: ctx.perlVersion,
		datasource: GithubTagsDatasource.id,
		versioning: id,
		extractVersion: "^v(?<version>\\S+)"
	});
	return ctx;
});
const requirementMatch = query.sym(regEx(/^(?:requires|recommends|suggests)$/));
const phasedRequiresMatch = query.sym(regEx(/^(?:configure|build|test|author)_requires$/), (ctx, { value: phase }) => {
	ctx.tempPhase = phase.replace(regEx(/_requires/), "").replace(regEx(/author/), "develop");
	return ctx;
});
const moduleMatch = query.alt(requirementMatch, phasedRequiresMatch).str((ctx, { value: depName }) => ({
	...ctx,
	depName
})).opt(query.alt(query.op(","), query.op("=>")).alt(query.num((ctx, { value: currentValue }) => ({
	...ctx,
	currentValue
})), query.str((ctx, { value }) => {
	const currentValue = value.replace(regEx(/^(?:\s*(?:==|>=|>))?\s*v?/), "");
	return {
		...ctx,
		currentValue
	};
}))).op(";").handler((ctx) => {
	const { phase, tempPhase, depName, currentValue } = ctx;
	delete ctx.tempPhase;
	delete ctx.depName;
	delete ctx.currentValue;
	// v8 ignore else -- the handler only runs once a module name matched
	if (depName) {
		const dep = { depName };
		if (currentValue) dep.currentValue = currentValue;
		else dep.skipReason = "unspecified-version";
		if (phase) dep.depType = phase;
		else if (tempPhase) dep.depType = tempPhase;
		dep.datasource = CpanDatasource.id;
		ctx.deps.push(dep);
	}
	return ctx;
});
const phaseRegex = regEx(/^(?:configure|build|test|runtime|develop)/);
const phaseMatch = query.alt(query.sym(phaseRegex, (ctx, { value: phase }) => ({
	...ctx,
	phase
})), query.str(phaseRegex, (ctx, { value: phase }) => ({
	...ctx,
	phase
})));
const onMatch = query.sym("on").join(phaseMatch).op("=>").sym("sub").tree({
	type: "wrapped-tree",
	maxDepth: 1,
	search: moduleMatch
}).handler((ctx) => {
	delete ctx.phase;
	return ctx;
});
const query$1 = query.tree({
	type: "root-tree",
	maxDepth: 4,
	search: query.alt(perlVersionMatch, moduleMatch, onMatch)
});
function parse(content) {
	return cpanfile.query(content, query$1, { deps: [] });
}
//#endregion
export { parse };

//# sourceMappingURL=parser.js.map