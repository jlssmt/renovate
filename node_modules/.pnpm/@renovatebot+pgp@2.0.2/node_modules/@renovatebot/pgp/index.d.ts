export type RuntimeType = 'js-java' | 'wasm-java' | 'wasm-dotnet';

export interface DecryptOptions {
  runtime: RuntimeType;
}

/**
 * List of supported runtimes.
 */
export const SupportedRuntimes: readonly RuntimeType[];

/**
 * Check if the given runtime is supported.
 * @param runtime value to check
 */
export function isSupportedRuntime(runtime: string): runtime is RuntimeType;

/**
 * Decrypt data with .NET wasm implementations of Bouncy Castle.
 * @param key private key in PEM format
 * @param data encrypted data in base64 format
 * @param options runtime options
 */
export async function decrypt(
  key: string,
  data: string,
  options: DecryptOptions,
): Promise<string>;
