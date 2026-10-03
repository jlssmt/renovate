import { compile } from "../../../../util/template/index.js";
import { CommitMessageFactory } from "../../model/commit-message-factory.js";
//#region lib/workers/repository/config-migration/branch/commit-message.ts
var ConfigMigrationCommitMessageFactory = class {
	config;
	configFile;
	constructor(config, configFile) {
		this.config = config;
		this.configFile = configFile;
	}
	create(commitMessageTopic) {
		const { commitMessage } = this.config;
		const config = {
			...this.config,
			semanticCommitScope: "config",
			commitMessageExtra: "",
			commitMessageAction: "",
			commitMessageSuffix: "",
			commitMessageTopic
		};
		const commit = new CommitMessageFactory(config).create();
		if (commitMessage) {
			config.commitMessagePrefix = "";
			commit.subject = compile(commitMessage, config);
		} else commit.subject = commitMessageTopic;
		return commit;
	}
	getCommitMessage() {
		return this.create(`Migrate config ${this.configFile}`).toString();
	}
	getPrTitle() {
		return this.create(`Migrate Renovate config`).toString();
	}
};
//#endregion
export { ConfigMigrationCommitMessageFactory };

//# sourceMappingURL=commit-message.js.map