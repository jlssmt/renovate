import { HttpMethod, HttpOptions, HttpResponse } from "./types.js";
import { HttpBase, InternalJsonUnsafeOptions } from "./http.js";
import { RetryObject } from "got";
//#region lib/util/http/gitlab.d.ts
export declare function setBaseUrl(url: string): void;
export interface GitlabHttpOptions extends HttpOptions {
  paginate?: boolean;
}
export declare class GitlabHttp extends HttpBase<GitlabHttpOptions> {
  protected get baseUrl(): string | undefined;
  constructor(type?: string, options?: GitlabHttpOptions);
  protected extraOptions(): readonly string[];
  protected requestJsonUnsafe<T = unknown>(method: HttpMethod, options: InternalJsonUnsafeOptions<GitlabHttpOptions>): Promise<HttpResponse<T>>;
  protected handleError(url: string | URL, _httpOptions: HttpOptions, err: Error): never;
  protected calculateRetryDelay(retryObject: RetryObject): number;
}
//#endregion
//# sourceMappingURL=gitlab.d.ts.map