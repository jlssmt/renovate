import { getInheritedOrGlobal } from "../../../../util/common.js";
import { CommitMessageFactory } from "../../model/commit-message-factory.js";
//#region lib/workers/repository/onboarding/branch/commit-message.ts
var OnboardingCommitMessageFactory = class {
	config;
	configFile;
	constructor(config, configFile) {
		this.config = config;
		this.configFile = configFile;
	}
	create() {
		const onboardingCommitMessage = getInheritedOrGlobal("onboardingCommitMessage");
		const commitMessage = new CommitMessageFactory(this.config).create();
		if (onboardingCommitMessage) commitMessage.subject = onboardingCommitMessage;
		else commitMessage.subject = `add ${this.configFile}`;
		return commitMessage;
	}
};
//#endregion
export { OnboardingCommitMessageFactory };

//# sourceMappingURL=commit-message.js.map