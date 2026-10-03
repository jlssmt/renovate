import { RawExecOptions } from "./types.js";
//#region lib/util/exec/exec-error.d.ts
export interface ExecErrorData {
  cmd: string;
  stderr: string;
  stdout: string;
  options: RawExecOptions;
  exitCode?: number;
  signal?: NodeJS.Signals;
}
export declare class ExecError extends Error {
  cmd: string;
  stderr: string;
  stdout: string;
  options: RawExecOptions;
  exitCode?: number;
  signal?: NodeJS.Signals;
  err?: Error;
  constructor(message: string, data: ExecErrorData, err?: Error);
}
//#endregion
//# sourceMappingURL=exec-error.d.ts.map