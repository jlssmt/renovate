import { BunyanLogLevel, BunyanLogger, BunyanSerializers, BunyanStream, Logger } from "./types.js";
//#region lib/logger/renovate-logger.d.ts
export declare class RenovateLogger implements Logger {
  private readonly queue;
  readonly logger: Logger;
  readonly once: Logger & {
    reset: () => void;
  };
  private bunyanLogger;
  private uninitializedWarningFired;
  private context;
  private meta;
  constructor(context: string, meta: Record<string, unknown>, bunyanLogger?: BunyanLogger);
  trace(p1: string): void;
  trace(p1: Record<string, any>, p2?: string): void;
  debug(p1: string): void;
  debug(p1: Record<string, any>, p2?: string): void;
  info(p1: string): void;
  info(p1: Record<string, any>, p2?: string): void;
  warn(p1: string): void;
  warn(p1: Record<string, any>, p2?: string): void;
  error(p1: string): void;
  error(p1: Record<string, any>, p2?: string): void;
  fatal(p1: string): void;
  fatal(p1: Record<string, any>, p2?: string): void;
  addSerializers(serializers: BunyanSerializers): void;
  addStream(stream: BunyanStream): void;
  childLogger(): RenovateLogger;
  levels(name: 'stdout' | 'logfile', level: BunyanLogLevel): void;
  get logContext(): string;
  set logContext(context: string);
  /**
   * For internal initialization only
   */
  set bunyan(bunyanLogger: BunyanLogger);
  setMeta(obj: Record<string, unknown>): void;
  addMeta(obj: Record<string, unknown>): void;
  removeMeta(fields: string[]): void;
  private ensureLogger;
  private logFactory;
  private logOnceFn;
  private log;
}
//#endregion
//# sourceMappingURL=renovate-logger.d.ts.map