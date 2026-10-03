import { Pr } from "../types.js";
//#region lib/modules/platform/gitlab/types.d.ts
export interface GitlabIssue {
  iid: number;
  labels?: string[];
  title: string;
}
export interface GitlabPr extends Pr {
  headPipelineStatus?: string;
  headPipelineSha?: string;
}
//#endregion
//# sourceMappingURL=types.d.ts.map