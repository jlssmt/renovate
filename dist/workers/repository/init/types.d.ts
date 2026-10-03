import "../../../config/types.js";
//#region lib/workers/repository/init/types.d.ts
export interface RepoConfigError {
  validationError: string;
  validationMessage: string;
}
export interface RepoFileConfig {
  configFileName?: string;
  configFileParsed?: any;
  configFileParseError?: RepoConfigError;
}
export interface RepoInitConfig {
  defaultBranchSha?: string;
  repoConfig?: RepoFileConfig;
}
//#endregion
//# sourceMappingURL=types.d.ts.map