import { RequestError } from "got";
//#region lib/util/http/legacy.d.ts
export type GotLegacyError<E = unknown, T = unknown> = RequestError & {
  statusCode?: number;
  body: {
    message?: string;
    errors?: E[];
  };
  headers?: Record<string, T>;
};
//#endregion
//# sourceMappingURL=legacy.d.ts.map