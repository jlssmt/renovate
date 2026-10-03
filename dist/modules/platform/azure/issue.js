import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { sanitize } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { Lazy } from "../../../util/lazy.js";
import { isHosted, workItemTrackingApi } from "./azure-got-wrapper.js";
import { getWorkItemTitle } from "./util.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/platform/azure/issue.ts
const defaultOpenState = "New";
const defaultClosedState = "Closed";
const openCategories = ["Proposed", "InProgress"];
const closedCategories = [
	"Completed",
	"Resolved",
	"Removed"
];
/**
* Return the names of the states whose category is one of `categories`,
* preserving the order Azure DevOps returns them in (workflow order).
*/
function namesByCategory(stateColors, categories) {
	return stateColors.filter((s) => s.category && categories.includes(s.category) && s.name).map((s) => s.name);
}
/**
* Op that renders the issue body as Markdown. Only Azure DevOps Services
* (cloud) supports the `multilineFieldsFormat` field; Azure DevOps Server
* (on-premises) rejects it with a 400, so this is only included when the
* instance is hosted (see discussion #45068).
*/
function markdownFormatOp(op) {
	return {
		op,
		path: "/multilineFieldsFormat/System.Description",
		value: "Markdown"
	};
}
var IssueService = class {
	config;
	workItemStates;
	hosted;
	constructor(config) {
		this.config = config;
		this.workItemStates = new Lazy(() => this.resolveWorkItemStates());
		this.hosted = new Lazy(() => isHosted());
	}
	/**
	* Resolve the concrete open/closed state names for the `Issue` work item type
	* from its process, so Renovate does not depend on hardcoded state names that
	* only exist in some Azure DevOps processes. Falls back to the historical
	* `New`/`Closed` values if the states cannot be fetched.
	*/
	async resolveWorkItemStates() {
		const states = {
			open: defaultOpenState,
			closed: defaultClosedState,
			closedNames: /* @__PURE__ */ new Set([defaultClosedState])
		};
		try {
			const stateColors = await (await workItemTrackingApi()).getWorkItemTypeStates(this.config.project, this.config.workItemType);
			if (stateColors?.length) {
				const openNames = namesByCategory(stateColors, openCategories);
				const completed = stateColors.find((s) => s.category === "Completed" && s.name);
				const closedNames = namesByCategory(stateColors, closedCategories);
				states.open = openNames[0] ?? stateColors[0].name ?? states.open;
				if (closedNames.length) {
					states.closed = completed?.name ?? closedNames[0];
					states.closedNames = new Set(closedNames);
				}
			}
		} catch (err) {
			logger.debug({ err }, "Azure: could not resolve work item states, using default state names");
		}
		return states;
	}
	async findIssue(title) {
		logger.debug(`findIssue(${title})`);
		try {
			const finalTitle = getWorkItemTitle(title, this.config.repository);
			return (await this.getIssueList(finalTitle))[0] ?? null;
		} catch (err) {
			logger.error({ err }, "Error finding issue");
			return null;
		}
	}
	/**
	* The work item type names the project's process defines. Some processes
	* (e.g. Scrum) do not define `Issue`, in which case creating one fails;
	* checking up front lets us log an actionable message (including the types
	* that *are* available) instead of a cryptic error.
	*/
	async getWorkItemTypeNames(azureApiWit) {
		return (await azureApiWit.getWorkItemTypes(this.config.project)).map((t) => t.name).filter(isNonEmptyString);
	}
	async getIssueList(titleFilter) {
		logger.debug("getIssueList()");
		try {
			const azureApiWit = await workItemTrackingApi();
			let wiql = `
        SELECT [System.Id]
        FROM WorkItems
        WHERE [System.TeamProject] = '${this.config.project}'
      `;
			if (titleFilter) {
				const escapedTitle = titleFilter.replace(regEx(/'/g), "''");
				wiql += ` AND [System.Title] = '${escapedTitle}'`;
			}
			const result = await azureApiWit.queryByWiql({ query: wiql });
			if (!result.workItems?.length) {
				logger.debug("getIssueList() no work items found");
				return [];
			}
			const workItemIds = result.workItems.map((wi) => wi.id);
			const workItems = await azureApiWit.getWorkItems(workItemIds, [
				"System.Id",
				"System.Title",
				"System.State",
				"System.Description",
				"System.CreatedDate",
				"System.ChangedDate"
			]);
			const { closedNames } = await this.workItemStates.getValue();
			return workItems.map((wi) => ({
				number: wi.id,
				title: wi.fields["System.Title"],
				state: closedNames.has(wi.fields["System.State"]) ? "closed" : "open",
				body: wi.fields["System.Description"],
				createdAt: wi.fields["System.CreatedDate"],
				lastModified: wi.fields["System.ChangedDate"]
			}));
		} catch (err) {
			logger.warn({ err }, "Error fetching issue list");
			return [];
		}
	}
	async ensureIssueClosing(title) {
		logger.debug(`ensureIssueClosing(${title})`);
		try {
			const issue = await this.findIssue(title);
			if (issue?.state === "open" && issue.number) {
				const azureApiWit = await workItemTrackingApi();
				const { closed } = await this.workItemStates.getValue();
				await azureApiWit.updateWorkItem(void 0, [{
					op: "replace",
					path: "/fields/System.State",
					value: closed
				}], issue.number, this.config.project);
				logger.debug(`Closed issue #${issue.number}: ${title}`);
			}
		} catch (err) {
			logger.error({ err }, "Error closing issue");
		}
	}
	async ensureIssue({ title, body, once = false, shouldReOpen = true }) {
		logger.debug(`ensureIssue()`);
		try {
			const azureApiWit = await workItemTrackingApi();
			const finalTitle = getWorkItemTitle(title, this.config.repository);
			const issues = await this.getIssueList(finalTitle);
			const { open, closed } = await this.workItemStates.getValue();
			const hosted = await this.hosted.getValue();
			const openIssues = issues.filter((issue) => issue.state === "open");
			if (openIssues.length > 1) for (let i = 1; i < openIssues.length; i++) {
				const issueNumber = openIssues[i].number;
				if (issueNumber) {
					await azureApiWit.updateWorkItem(void 0, [{
						op: "replace",
						path: "/fields/System.State",
						value: closed
					}], issueNumber, this.config.project);
					logger.info(`Closed duplicate issue #${issueNumber}`);
				}
			}
			const existingIssue = openIssues[0] ?? issues.find((issue) => issue.state === "closed");
			if (existingIssue) {
				if (existingIssue.state === "closed" && once) {
					logger.debug("Issue already closed - skipping update");
					return null;
				}
				if (existingIssue.state === "closed" && shouldReOpen) {
					if (!existingIssue.number) {
						logger.warn("Cannot reopen issue without number");
						return null;
					}
					await azureApiWit.updateWorkItem(void 0, [
						{
							op: "replace",
							path: "/fields/System.State",
							value: open
						},
						{
							op: "replace",
							path: "/fields/System.Title",
							value: finalTitle
						},
						{
							op: "replace",
							path: "/fields/System.Description",
							value: sanitize(body)
						},
						...hosted ? [markdownFormatOp("replace")] : []
					], existingIssue.number, this.config.project);
					logger.debug(`Reopened issue #${existingIssue.number}`);
					return "updated";
				}
				if (existingIssue.state === "open") {
					if (existingIssue.title !== finalTitle || existingIssue.body !== body) {
						if (!existingIssue.number) {
							logger.warn("Cannot update issue without number");
							return null;
						}
						await azureApiWit.updateWorkItem(void 0, [
							{
								op: "replace",
								path: "/fields/System.Title",
								value: finalTitle
							},
							{
								op: "replace",
								path: "/fields/System.Description",
								value: sanitize(body)
							},
							...hosted ? [markdownFormatOp("replace")] : []
						], existingIssue.number, this.config.project);
						logger.debug(`Updated issue #${existingIssue.number}`);
						return "updated";
					}
					logger.debug(`Issue #${existingIssue.number} is already up-to-date`);
					return "updated";
				}
			}
			const availableTypes = await this.getWorkItemTypeNames(azureApiWit);
			if (!availableTypes.includes(this.config.workItemType)) {
				logger.warn({
					workItemType: this.config.workItemType,
					availableTypes,
					project: this.config.project,
					documentationUrl: `${GlobalConfig.get("productLinks").documentation}configuration-options/#azureworkitemtype`
				}, "Azure: work item type does not exist in project (or the token lacks permission to it); skipping issue. The Dependency Dashboard needs a process that defines this work item type. Set one your project defines via the `azureWorkItemType` repo config option.");
				return null;
			}
			const newWorkItem = await azureApiWit.createWorkItem(void 0, [
				{
					op: "add",
					path: "/fields/System.WorkItemType",
					value: this.config.workItemType
				},
				{
					op: "add",
					path: "/fields/System.Title",
					value: finalTitle
				},
				{
					op: "add",
					path: "/fields/System.Description",
					value: sanitize(body)
				},
				...hosted ? [markdownFormatOp("add")] : []
			], this.config.project, this.config.workItemType);
			if (!newWorkItem?.id) {
				logger.warn("Azure: work item creation returned no result; skipping issue");
				return null;
			}
			logger.debug(`Created new issue #${newWorkItem.id}`);
			return "created";
		} catch (err) {
			logger.warn({ err }, "Error ensuring issue");
			return null;
		}
	}
};
//#endregion
export { IssueService };

//# sourceMappingURL=issue.js.map