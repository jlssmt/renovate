import { RemovePropertyMigration } from "./base/remove-property-migration.js";
import { RenamePropertyMigration } from "./base/rename-property-migration.js";
import { AutomergeMajorMigration } from "./custom/automerge-major-migration.js";
import { AutomergeMigration } from "./custom/automerge-migration.js";
import { AutomergeMinorMigration } from "./custom/automerge-minor-migration.js";
import { AutomergePatchMigration } from "./custom/automerge-patch-migration.js";
import { AutomergeTypeMigration } from "./custom/automerge-type-migration.js";
import { AzureGitLabAutomergeMigration } from "./custom/azure-gitlab-automerge-migration.js";
import { BaseBranchMigration } from "./custom/base-branch-migration.js";
import { BinarySourceMigration } from "./custom/binary-source-migration.js";
import { BranchNameMigration } from "./custom/branch-name-migration.js";
import { BranchPrefixMigration } from "./custom/branch-prefix-migration.js";
import { CompatibilityMigration } from "./custom/compatibility-migration.js";
import { ComposerIgnorePlatformReqsMigration } from "./custom/composer-ignore-platform-reqs-migration.js";
import { CustomManagersMigration } from "./custom/custom-managers-migration.js";
import { DatasourceMigration } from "./custom/datasource-migration.js";
import { DepTypesMigration } from "./custom/dep-types-migration.js";
import { DryRunMigration } from "./custom/dry-run-migration.js";
import { EnabledManagersMigration } from "./custom/enabled-managers-migration.js";
import { ExtendsMigration } from "./custom/extends-migration.js";
import { FetchReleaseNotesMigration } from "./custom/fetch-release-notes-migration.js";
import { FileMatchMigration } from "./custom/file-match-migration.js";
import { GoModTidyMigration } from "./custom/go-mod-tidy-migration.js";
import { HostRulesMigration } from "./custom/host-rules-migration.js";
import { IgnoreNodeModulesMigration } from "./custom/ignore-node-modules-migration.js";
import { IgnoreNpmrcFileMigration } from "./custom/ignore-npmrc-file-migration.js";
import { IncludeForksMigration } from "./custom/include-forks-migration.js";
import { MatchDatasourcesMigration } from "./custom/match-datasources-migration.js";
import { MatchManagersMigration } from "./custom/match-managers-migration.js";
import { MatchStringsMigration } from "./custom/match-strings-migration.js";
import { NodeMigration } from "./custom/node-migration.js";
import { PackageFilesMigration } from "./custom/package-files-migration.js";
import { PackageNameMigration } from "./custom/package-name-migration.js";
import { PackagePatternMigration } from "./custom/package-pattern-migration.js";
import { PackageRulesMigration } from "./custom/package-rules-migration.js";
import { PackagesMigration } from "./custom/packages-migration.js";
import { PathRulesMigration } from "./custom/path-rules-migration.js";
import { PinVersionsMigration } from "./custom/pin-versions-migration.js";
import { PlatformCommitMigration } from "./custom/platform-commit-migration.js";
import { PostUpdateOptionsMigration } from "./custom/post-update-options-migration.js";
import { RebaseConflictedPrs } from "./custom/rebase-conflicted-prs-migration.js";
import { RebaseStalePrsMigration } from "./custom/rebase-stale-prs-migration.js";
import { RecreateClosedMigration } from "./custom/recreate-closed-migration.js";
import { RenovateForkMigration } from "./custom/renovate-fork-migration.js";
import { RequireConfigMigration } from "./custom/require-config-migration.js";
import { RequiredStatusChecksMigration } from "./custom/required-status-checks-migration.js";
import { ScheduleMigration } from "./custom/schedule-migration.js";
import { SemanticCommitsMigration } from "./custom/semantic-commits-migration.js";
import { SemanticPrefixMigration } from "./custom/semantic-prefix-migration.js";
import { SeparateMajorReleasesMigration } from "./custom/separate-major-release-migration.js";
import { SeparateMultipleMajorMigration } from "./custom/separate-multiple-major-migration.js";
import { StabilityDaysMigration } from "./custom/stability-days-migration.js";
import { SuppressNotificationsMigration } from "./custom/suppress-notifications-migration.js";
import { TrustLevelMigration } from "./custom/trust-level-migration.js";
import { UnpublishSafeMigration } from "./custom/unpublish-safe-migration.js";
import { UpdateLockFilesMigration } from "./custom/update-lock-files-migration.js";
import { UpgradeInRangeMigration } from "./custom/upgrade-in-range-migration.js";
import { VersionStrategyMigration } from "./custom/version-strategy-migration.js";
import { isRegExp } from "@sindresorhus/is";
import { dequal } from "dequal";
//#region lib/config/migrations/migrations-service.ts
var MigrationsService = class MigrationsService {
	static removedProperties = /* @__PURE__ */ new Set([
		"allowCommandTemplating",
		"allowPostUpgradeCommandTemplating",
		"deepExtract",
		"gitFs",
		"groupBranchName",
		"groupCommitMessage",
		"groupPrBody",
		"groupPrTitle",
		"lazyGrouping",
		"maintainYarnLock",
		"raiseDeprecationWarnings",
		"statusCheckVerify",
		"supportPolicy",
		"transitiveRemediation",
		"yarnCacheFolder",
		"yarnMaintenanceBranchName",
		"yarnMaintenanceCommitMessage",
		"yarnMaintenancePrBody",
		"yarnMaintenancePrTitle"
	]);
	static renamedProperties = /* @__PURE__ */ new Map([
		["adoptium-java", "java-version"],
		["allowedPostUpgradeCommands", "allowedCommands"],
		["azureAutoApprove", "autoApprove"],
		["customChangelogUrl", "changelogUrl"],
		["endpoints", "hostRules"],
		["excludedPackageNames", "excludePackageNames"],
		["exposeEnv", "exposeAllEnv"],
		["keepalive", "keepAlive"],
		["managerBranchPrefix", "additionalBranchPrefix"],
		["multipleMajorPrs", "separateMultipleMajor"],
		["separatePatchReleases", "separateMinorPatch"],
		["versionScheme", "versioning"],
		["lookupNameTemplate", "packageNameTemplate"],
		["aliases", "registryAliases"],
		["masterIssue", "dependencyDashboard"],
		["masterIssueApproval", "dependencyDashboardApproval"],
		["masterIssueAutoclose", "dependencyDashboardAutoclose"],
		["masterIssueHeader", "dependencyDashboardHeader"],
		["masterIssueFooter", "dependencyDashboardFooter"],
		["masterIssueTitle", "dependencyDashboardTitle"],
		["masterIssueLabels", "dependencyDashboardLabels"],
		["regexManagers", "customManagers"],
		["baseBranches", "baseBranchPatterns"],
		["renovate-config-presets", "renovate-config"]
	]);
	static customMigrations = [
		AutomergeMajorMigration,
		AutomergeMigration,
		AutomergeMinorMigration,
		AutomergePatchMigration,
		AutomergeTypeMigration,
		AzureGitLabAutomergeMigration,
		BaseBranchMigration,
		BinarySourceMigration,
		BranchNameMigration,
		BranchPrefixMigration,
		CompatibilityMigration,
		ComposerIgnorePlatformReqsMigration,
		EnabledManagersMigration,
		ExtendsMigration,
		GoModTidyMigration,
		HostRulesMigration,
		IgnoreNodeModulesMigration,
		IgnoreNpmrcFileMigration,
		IncludeForksMigration,
		MatchStringsMigration,
		PackageNameMigration,
		PackagePatternMigration,
		PackagesMigration,
		PathRulesMigration,
		PinVersionsMigration,
		PostUpdateOptionsMigration,
		RebaseConflictedPrs,
		RebaseStalePrsMigration,
		RenovateForkMigration,
		RequiredStatusChecksMigration,
		ScheduleMigration,
		SemanticCommitsMigration,
		SeparateMajorReleasesMigration,
		SeparateMultipleMajorMigration,
		SuppressNotificationsMigration,
		TrustLevelMigration,
		UnpublishSafeMigration,
		UpgradeInRangeMigration,
		VersionStrategyMigration,
		DryRunMigration,
		RequireConfigMigration,
		PackageFilesMigration,
		DepTypesMigration,
		PackageRulesMigration,
		NodeMigration,
		SemanticPrefixMigration,
		MatchDatasourcesMigration,
		DatasourceMigration,
		RecreateClosedMigration,
		StabilityDaysMigration,
		FetchReleaseNotesMigration,
		MatchManagersMigration,
		CustomManagersMigration,
		PlatformCommitMigration,
		FileMatchMigration,
		UpdateLockFilesMigration
	];
	static run(originalConfig, parentKey) {
		const migratedConfig = {};
		const migrations = this.getMigrations(originalConfig, migratedConfig);
		for (const [key, value] of Object.entries(originalConfig)) {
			migratedConfig[key] ??= value;
			const migration = MigrationsService.getMigration(migrations, key);
			if (migration) {
				migration.run(value, key, parentKey);
				if (migration.deprecated) delete migratedConfig[key];
			}
		}
		return migratedConfig;
	}
	static isMigrated(originalConfig, migratedConfig) {
		return !dequal(originalConfig, migratedConfig);
	}
	static getMigrations(originalConfig, migratedConfig) {
		const migrations = [];
		for (const propertyName of MigrationsService.removedProperties) migrations.push(new RemovePropertyMigration(propertyName, originalConfig, migratedConfig));
		for (const [oldPropertyName, newPropertyName] of MigrationsService.renamedProperties.entries()) migrations.push(new RenamePropertyMigration(oldPropertyName, newPropertyName, originalConfig, migratedConfig));
		for (const CustomMigration of this.customMigrations) migrations.push(new CustomMigration(originalConfig, migratedConfig));
		return migrations;
	}
	static getMigration(migrations, key) {
		return migrations.find((migration) => {
			if (isRegExp(migration.propertyName)) return migration.propertyName.test(key);
			return migration.propertyName === key;
		});
	}
};
//#endregion
export { MigrationsService };

//# sourceMappingURL=migrations-service.js.map