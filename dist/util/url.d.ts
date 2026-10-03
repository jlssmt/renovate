import _parseLinkHeader from "parse-link-header";
//#region lib/util/url.d.ts
export declare function joinUrlParts(...parts: string[]): string;
export declare function ensurePathPrefix(url: string, prefix: string): string;
export declare function ensureTrailingSlash(url: string): string;
export declare function trimTrailingSlash(url: string): string;
export declare function trimLeadingSlash(path: string): string;
export declare function trimSlashes(path: string): string;
/**
 * Resolves an input path against a base URL
 *
 * @param baseUrl - base URL to resolve against
 * @param input - input path (if this is a full URL, it will be returned)
 */
export declare function resolveBaseUrl(baseUrl: string, input: string | URL): string;
/**
 * Replaces the path of a URL with a new path
 *
 * @param baseUrl - source URL
 * @param path - replacement path (if this is a full URL, it will be returned)
 */
export declare function replaceUrlPath(baseUrl: string | URL, path: string): string;
/**
 * Resolves a server-provided pagination "next" URL against the current request
 * URL, returning it only when it stays on the same origin.
 *
 * Registries paginate by returning a `Link` header (or Atom `<link rel="next">`)
 * pointing at the next page.
 *
 * However, if we were to follow that URL without validating it, this could lead to us being redirected to a different host, which could lead to Server-Side Request Forgery (SSRF).
 *
 * This guard drops any `next` URL that resolves to a different origin.
 *
 * @param baseUrl - the URL of the request that produced `nextUrl`
 * @param nextUrl - the remote-server-provided pagination target (may be relative, and may be malicious)
 * @returns the resolved absolute URL if same-origin, otherwise `null`
 */
export declare function resolveSameOriginUrl(baseUrl: string | URL, nextUrl: string | URL): string | null;
export declare function getQueryString(params: Record<string, any>): string;
export declare function isHttpUrl(url: unknown): boolean;
export declare function parseUrl(url: URL | string | undefined | null): URL | null;
/**
 * Tries to create an URL object from either a full URL string or a hostname
 * @param url either the full url or a hostname
 * @returns an URL object or null
 */
export declare function createURLFromHostOrURL(url: string): URL | null;
/**
 * Removes the `user:password@` userinfo from a URL.
 *
 * Registries are sometimes configured with a URL that carries a placeholder such as `${USER}:${PASS}@`, and credentials embedded this way should not stop the URL from matching a plain `matchHost`.
 *
 * @returns the URL's `href` without userinfo, or `null` if `url` cannot be parsed
 */
export declare function stripUrlCredentials(url: URL): string;
export declare function stripUrlCredentials(url: string | URL): string | null;
export type LinkHeaderLinks = _parseLinkHeader.Links;
export declare function parseLinkHeader(linkHeader: string | null | undefined): LinkHeaderLinks | null;
/**
 * prefix https:// to hosts with port or path
 */
export declare function massageHostUrl(url: string): string;
//#endregion
//# sourceMappingURL=url.d.ts.map