import { BunyanLogLevel, BunyanRecord, BunyanStream, Logger } from "./types.js";
//#region lib/logger/index.d.ts
export declare function logLevel(): BunyanLogLevel;
export declare const logger: Logger;
export declare function init(): Promise<void>;
export declare function setContext(value: string): void;
export declare function getContext(): any;
export declare function setMeta(obj: Record<string, unknown>): void;
export declare function addMeta(obj: Record<string, unknown>): void;
export declare function removeMeta(fields: string[]): void;
export declare function withMeta<T>(obj: Record<string, unknown>, cb: () => T): T;
export declare function addStream(stream: BunyanStream): void;
/**
 * For testing purposes only
 * @param name stream name
 * @param level log level
 * @private
 */
export declare function levels(name: 'stdout' | 'logfile', level: BunyanLogLevel): void;
export declare function getProblems(): BunyanRecord[];
export declare function clearProblems(): void;
//#endregion
//# sourceMappingURL=index.d.ts.map