import { AsyncResult } from "../result.js";
import { HttpMethod, HttpOptions, HttpResponse, SafeJsonError } from "./types.js";
import { Options, OptionsInit, RetryObject } from "got";
import { ZodType, z } from "zod/v4";
import "type-fest";
//#region lib/util/http/http.d.ts
export interface InternalJsonUnsafeOptions<Opts extends HttpOptions = HttpOptions> {
  url: string | URL;
  httpOptions?: Opts;
}
export interface InternalHttpOptions extends HttpOptions {
  json?: HttpOptions['body'];
  method?: HttpMethod;
  parseJson?: Options['parseJson'];
}
export declare abstract class HttpBase<JSONOpts extends HttpOptions = HttpOptions, Opts extends HttpOptions = HttpOptions> {
  private readonly options;
  protected get baseUrl(): string | undefined;
  protected hostType: string;
  constructor(hostType: string, options?: HttpOptions);
  /**
   * Builds the final got options for a request to a given `url`
   *
   * This merges instance options, applies default headers, host rules and authorization, and rejects requests to disabled hosts.
   *
   * Both the `request()` and `stream()` paths must use this single entry point so that policy applied here covers every outbound request.
   */
  private prepareOptions;
  private request;
  private _normalizeOptions;
  /**
   * Returns Renovate extra options which needs to be removed before passing to got.
   * @returns extra Renovate options.
   */
  protected extraOptions(): readonly string[];
  protected processOptions(_url: URL, _options: InternalHttpOptions): void;
  protected handleError(_url: string | URL, _httpOptions: HttpOptions, err: Error): never;
  protected handleResponse(_url: URL, _res: HttpResponse<unknown>): void;
  resolveUrl(requestUrl: string | URL, options?: HttpOptions): URL;
  protected calculateRetryDelay({ computedValue }: RetryObject): number;
  get(url: string, options?: HttpOptions): Promise<HttpResponse<string | Uint8Array>>;
  head(url: string, options?: HttpOptions): Promise<HttpResponse<never>>;
  getText(url: string | URL, options?: HttpOptions): Promise<HttpResponse>;
  getBuffer(url: string | URL, options?: HttpOptions): Promise<HttpResponse<Uint8Array>>;
  protected requestJsonUnsafe<ResT>(method: HttpMethod, { url, httpOptions: requestOptions }: InternalJsonUnsafeOptions<JSONOpts>): Promise<HttpResponse<ResT>>;
  private requestJson;
  private resolveArgs;
  getPlain(url: string, options?: Opts): Promise<HttpResponse>;
  /**
   * @deprecated use `getYaml` instead
   */
  getYamlUnchecked<ResT>(url: string, options?: Opts): Promise<HttpResponse<ResT>>;
  getYaml<Schema extends ZodType<any, any, any>>(url: string, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  getYaml<Schema extends ZodType<any, any, any>>(url: string, options: Opts, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  getYamlSafe<ResT extends NonNullable<unknown>, Schema extends ZodType<ResT> = ZodType<ResT>>(url: string, schema: Schema): AsyncResult<z.infer<Schema>, SafeJsonError>;
  getYamlSafe<ResT extends NonNullable<unknown>, Schema extends ZodType<ResT> = ZodType<ResT>>(url: string, options: Opts, schema: Schema): AsyncResult<z.infer<Schema>, SafeJsonError>;
  /**
   * Request JSON and return the response without any validation.
   *
   * The usage of this method is discouraged, please use `getJson` instead.
   *
   * If you're new to Zod schema validation library:
   * - consult the [documentation of Zod library](https://github.com/colinhacks/zod?tab=readme-ov-file#basic-usage)
   * - search the Renovate codebase for 'zod' module usage
   * - take a look at the `schema-utils.ts` file for Renovate-specific schemas and utilities
   */
  getJsonUnchecked<ResT = unknown>(url: string, options?: JSONOpts): Promise<HttpResponse<ResT>>;
  /**
   * Request JSON with a Zod schema for the response,
   * throwing an error if the response is not valid.
   *
   * @param url
   * @param schema Zod schema for the response
   */
  getJson<Schema extends ZodType<any, any, any>>(url: string, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  getJson<Schema extends ZodType<any, any, any>>(url: string, options: JSONOpts, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  /**
   * Request JSON with a Zod schema for the response,
   * wrapping response data in a `Result` class.
   *
   * @param url
   * @param schema Zod schema for the response
   */
  getJsonSafe<ResT extends NonNullable<unknown>, Schema extends ZodType<ResT>>(url: string, schema: Schema): AsyncResult<z.infer<Schema>, SafeJsonError>;
  getJsonSafe<ResT extends NonNullable<unknown>, Schema extends ZodType<ResT>>(url: string, options: JSONOpts, schema: Schema): AsyncResult<z.infer<Schema>, SafeJsonError>;
  /**
   * @deprecated use `head` instead
   */
  headJson(url: string, httpOptions?: JSONOpts): Promise<HttpResponse<never>>;
  postJson<T>(url: string, options?: JSONOpts): Promise<HttpResponse<T>>;
  postJson<T, Schema extends ZodType<T> = ZodType<T>>(url: string, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  postJson<T, Schema extends ZodType<T> = ZodType<T>>(url: string, options: JSONOpts, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  putJson<T>(url: string, options?: JSONOpts): Promise<HttpResponse<T>>;
  putJson<T, Schema extends ZodType<T> = ZodType<T>>(url: string, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  putJson<T, Schema extends ZodType<T> = ZodType<T>>(url: string, options: JSONOpts, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  patchJson<T>(url: string, options?: JSONOpts): Promise<HttpResponse<T>>;
  patchJson<T, Schema extends ZodType<T> = ZodType<T>>(url: string, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  patchJson<T, Schema extends ZodType<T> = ZodType<T>>(url: string, options: JSONOpts, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  deleteJson<T>(url: string, options?: JSONOpts): Promise<HttpResponse<T>>;
  deleteJson<T, Schema extends ZodType<T> = ZodType<T>>(url: string, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  deleteJson<T, Schema extends ZodType<T> = ZodType<T>>(url: string, options: JSONOpts, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  stream(url: string, options?: HttpOptions): NodeJS.ReadableStream;
  getToml<Schema extends ZodType<any, any, any>>(url: string, schema?: Schema): Promise<HttpResponse<z.infer<Schema>>>;
  getToml<Schema extends ZodType<any, any, any>>(url: string, options: JSONOpts, schema: Schema): Promise<HttpResponse<z.infer<Schema>>>;
}
//#endregion
//# sourceMappingURL=http.d.ts.map