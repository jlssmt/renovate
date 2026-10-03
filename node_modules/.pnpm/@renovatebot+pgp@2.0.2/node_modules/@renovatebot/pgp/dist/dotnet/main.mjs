import { dotnet } from './_framework/dotnet.js';

const { setModuleImports, getAssemblyExports, getConfig } = await dotnet
  .withDiagnosticTracing(false)
  .create();

// setModuleImports('main.mjs', {
//     node: {
//         process: {
//             version: () => globalThis.process.version
//         }
//     }
// });

const config = getConfig();
const exports = await getAssemblyExports(config.mainAssemblyName);

export function decrypt(key, data) {
  return exports.Program.Decrypt(key, data);
}
