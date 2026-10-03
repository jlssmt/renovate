export const SupportedRuntimes = ['js-java', 'wasm-java', 'wasm-dotnet'];

let decryptDotnet, decryptWasmJava, decryptJsJava;

export function isSupportedRuntime(runtime) {
  return SupportedRuntimes.includes(runtime);
}

export async function decrypt(key, data, options) {
  switch (options?.runtime) {
    case 'js-java':
      if (!decryptJsJava) {
        decryptJsJava = import('./dist/teavm/lib.js');
      }
      return (await decryptJsJava).decrypt(key, data);
    case 'wasm-java':
      if (!decryptWasmJava) {
        decryptWasmJava = import('./dist/teavm/lib.wasm-runtime.js').then(
          async ({ load }) =>
            load(`${import.meta.dirname}/dist/teavm/lib.wasm`).then(
              (teavm) => teavm.exports,
            ),
        );
      }
      return (await decryptWasmJava).decrypt(key, data);
    case 'wasm-dotnet':
      if (!decryptDotnet) {
        decryptDotnet = import('./dist/dotnet/main.mjs');
      }
      return (await decryptDotnet).decrypt(key, data);
    default:
      throw new Error(`Unsupported runtime: ${options?.runtime}`);
  }
}
