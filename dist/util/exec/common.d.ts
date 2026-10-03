import { CommandWithOptions, ExecResult, RawExecOptions } from "./types.js";
//#region lib/util/exec/common.d.ts
export declare function exec(commandArgument: string | CommandWithOptions, opts: RawExecOptions): Promise<ExecResult>;
export declare function rawExec(cmd: string | CommandWithOptions, opts: RawExecOptions): Promise<ExecResult>;
//#endregion
//# sourceMappingURL=common.d.ts.map