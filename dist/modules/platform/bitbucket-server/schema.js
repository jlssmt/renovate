import { EmailAddress } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/platform/bitbucket-server/schema.ts
const User = z.object({
	name: z.string(),
	displayName: z.string(),
	emailAddress: EmailAddress.catch(""),
	active: z.boolean()
});
const Users = z.array(User);
const Files = z.array(z.string());
const Comment = z.object({
	text: z.string(),
	id: z.number()
});
z.object({ autoMerge: z.boolean().optional() });
const PullRequestCommentActivity = z.object({
	action: z.literal("COMMENTED"),
	commentAction: z.string(),
	comment: Comment
});
z.union([z.object({ action: z.string() }), PullRequestCommentActivity]);
const ReviewerGroup = z.object({
	name: z.string(),
	users: z.array(User),
	scope: z.object({ type: z.union([z.literal("REPOSITORY"), z.literal("PROJECT")]) })
});
const ReviewerGroups = z.array(ReviewerGroup);
//#endregion
export { Comment, Files, PullRequestCommentActivity, ReviewerGroup, ReviewerGroups, User, Users };

//# sourceMappingURL=schema.js.map