import { z } from "zod/v4";
//#region lib/util/timestamp.d.ts
export type Timestamp = string & {
  __timestamp: never;
};
export declare function asTimestamp(input: unknown): Timestamp | null;
export declare const Timestamp: z.ZodPipe<z.ZodUnknown, z.ZodTransform<Timestamp, unknown>>;
export declare const MaybeTimestamp: z.ZodCatch<z.ZodNullable<z.ZodPipe<z.ZodUnknown, z.ZodTransform<Timestamp, unknown>>>>;
//#endregion
//# sourceMappingURL=timestamp.d.ts.map