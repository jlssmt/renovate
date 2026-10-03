import { logger } from "../../../logger/index.js";
import { DeepNullish, LooseArray, Nullish } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/platform/github/schema.ts
const Ecosystem = z.enum([
	"actions",
	"composer",
	"go",
	"maven",
	"npm",
	"nuget",
	"pip",
	"rubygems",
	"rust"
]);
const Package = z.object({
	ecosystem: Ecosystem.catch((ctx) => {
		logger.debug({ ecosystem: ctx.input }, "Skipping vulnerability alert with unsupported ecosystem");
	}),
	name: z.string()
});
const Severity = z.enum([
	"low",
	"medium",
	"high",
	"critical"
]);
const SecurityVulnerability = z.object({
	first_patched_version: Nullish(z.object({ identifier: z.string() })),
	package: Package,
	severity: Severity,
	vulnerable_version_range: z.string()
}).nullable();
const CvssSeverity = z.object({
	vector_string: z.string().nullable(),
	score: z.number().nullable()
});
const SecurityAdvisory = z.object({
	ghsa_id: z.string(),
	summary: z.string(),
	description: z.string(),
	identifiers: z.array(z.object({
		type: z.string(),
		value: z.string()
	})),
	references: z.array(z.object({ url: z.string() })).optional(),
	severity: Severity,
	cvss_severities: Nullish(DeepNullish(z.object({
		cvss_v3: CvssSeverity.optional(),
		cvss_v4: CvssSeverity.optional()
	})))
});
const GithubVulnerabilityAlerts = LooseArray(z.object({
	dismissed_reason: Nullish(z.string()),
	security_advisory: SecurityAdvisory,
	security_vulnerability: SecurityVulnerability,
	dependency: z.object({ manifest_path: z.string() })
}), { onError: ({ error }) => {
	logger.debug({ err: error }, "Vulnerability Alert: Failed to parse some alerts");
} }).transform((alerts) => alerts.filter((alert) => alert.security_vulnerability?.package?.ecosystem));
const GithubResponseMetadata = z.object({
	name: z.string(),
	path: z.string()
});
const GithubFileMeta = GithubResponseMetadata.extend({ type: z.literal("file") });
const GithubFile = GithubFileMeta.extend({
	content: z.string(),
	encoding: z.string()
});
const GithubDirectory = GithubResponseMetadata.extend({ type: z.literal("dir") });
const GithubOtherContent = GithubResponseMetadata.extend({ type: z.literal("symlink").or(z.literal("submodule")) });
const GithubElement = GithubFile.or(GithubFileMeta).or(GithubDirectory).or(GithubOtherContent);
const GithubContentResponse = z.array(GithubElement).or(GithubElement);
const GithubBranchProtection = z.object({ required_status_checks: Nullish(z.object({ strict: z.boolean() })) });
const GithubRulesetRule = z.discriminatedUnion("type", [
	z.object({ type: z.literal("non_fast_forward") }),
	z.object({
		type: z.literal("required_status_checks"),
		parameters: z.object({ strict_required_status_checks_policy: z.boolean().optional() })
	}),
	z.object({ type: z.literal("deletion") })
]);
const GithubBranchRulesets = LooseArray(GithubRulesetRule);
const GithubIssueBase = z.object({
	number: z.number(),
	state: z.string().transform((val) => val.toLowerCase()),
	title: z.string(),
	body: z.string()
});
const GithubGraphqlIssue = GithubIssueBase.extend({ updatedAt: z.string() }).transform((issue) => {
	const lastModified = issue.updatedAt;
	const { number, state, title, body } = issue;
	return {
		number,
		state,
		title,
		body,
		lastModified
	};
});
const GithubRestIssue = GithubIssueBase.extend({ updated_at: z.string() }).transform((issue) => {
	const lastModified = issue.updated_at;
	const { number, state, title, body } = issue;
	return {
		number,
		state,
		title,
		body,
		lastModified
	};
});
const GithubIssue = z.union([GithubGraphqlIssue, GithubRestIssue]);
//#endregion
export { GithubBranchProtection, GithubBranchRulesets, GithubContentResponse, GithubDirectory, GithubElement, GithubFile, GithubFileMeta, GithubIssue, GithubOtherContent, GithubVulnerabilityAlerts };

//# sourceMappingURL=schema.js.map