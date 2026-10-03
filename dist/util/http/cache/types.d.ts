import { GotOptions, HttpResponse } from "../types.js";
//#region lib/util/http/cache/types.d.ts
export interface HttpCacheProvider {
  setCacheHeaders<T extends Pick<GotOptions, 'headers'>>(method: string, url: string, opts: T): Promise<void>;
  bypassServer<T>(method: string, url: string, ignoreSoftTtl?: boolean): Promise<HttpResponse<T> | null>;
  wrapServerResponse<T>(method: string, url: string, resp: HttpResponse<T>): Promise<HttpResponse<T>>;
}
//#endregion
//# sourceMappingURL=types.d.ts.map