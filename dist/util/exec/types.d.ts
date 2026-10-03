import { VersioningName } from "../../versioning-list.generated.js";
import { Options } from "execa";
//#region lib/util/exec/types.d.ts
export interface ConstraintDefinition {
  name: string;
  description?: string;
}
/**
 * A `tool` that Containerbase supports.
 *
 * TODO #41849 replace with upstream types
 */
export declare const toolDefinitions: [{
  readonly name: 'apm';
}, {
  readonly name: 'bazelisk';
}, {
  readonly name: 'bun';
}, {
  readonly name: 'bundler';
}, {
  readonly name: 'cocoapods';
}, {
  readonly name: 'composer';
}, {
  readonly name: 'conan';
}, {
  readonly name: 'copier';
}, {
  readonly name: 'corepack';
}, {
  readonly name: 'deno';
}, {
  readonly name: 'devbox';
}, {
  readonly name: 'dotnet';
}, {
  readonly name: 'erlang';
}, {
  readonly name: 'elixir';
}, {
  readonly name: 'flux';
}, {
  readonly name: 'gh';
}, {
  readonly name: 'gleam';
}, {
  readonly name: 'golang';
}, {
  readonly name: 'gradle';
}, {
  readonly name: 'hashin';
}, {
  readonly name: 'helm';
}, {
  readonly name: 'helmfile';
}, {
  readonly name: 'java';
}, {
  readonly name: 'java-maven';
}, {
  readonly name: 'jb';
}, {
  readonly name: 'kustomize';
}, {
  readonly name: 'maven';
}, {
  readonly name: 'mise';
}, {
  readonly name: 'nix';
}, {
  readonly name: 'node';
}, {
  readonly name: 'npm';
}, {
  readonly name: 'pdm';
}, {
  readonly name: 'php';
}, {
  readonly name: 'pip-tools';
}, {
  readonly name: 'pipenv';
}, {
  readonly name: 'pnpm';
}, {
  readonly name: 'pixi';
}, {
  readonly name: 'poetry';
}, {
  readonly name: 'python';
}, {
  readonly name: 'ruby';
  readonly description: 'Also used in the `rubygems` Datasource';
}, {
  readonly name: 'rust';
}, {
  readonly name: 'uv';
}, {
  readonly name: 'yarn';
}, {
  readonly name: 'yarn-slim';
}, {
  readonly name: 'dart';
}, {
  readonly name: 'flutter';
}, {
  readonly name: 'vendir';
}];
/**
 * A `tool` that Containerbase supports.
 */
export type ToolName = (typeof toolDefinitions)[number]['name'];
/**
 * A `tool` that Containerbase supports.
 */
export declare const toolNames: ToolName[];
export declare function isToolName(value: unknown): value is ToolName;
/**
 * Additional constraints that can be specified for some Managers, but are **not** tools that Containerbase supports, with optional description.
 */
export declare const additionalConstraintDefinitions: [{
  readonly name: 'ghActionsLock';
  readonly description: `Used in the \`github-actions\` manager to specify a release tag for the [\`github/gh-actions-lock\`](https://github.com/github/gh-actions-lock) \`gh\` CLI extension, which regenerates \`.github/workflows/actions.lock\`.

Must be a full release tag, prefixed with \`v\`, such as \`v0.1.7\`. Set it to an empty string to always install the latest release.`;
}, {
  readonly name: 'go';
  readonly description: `Used in the \`gomod\` manager to specify the version of the Go toolchain to use.

In precedence order:

1. config: \`constraints.go\`
1. \`go.mod\`: \`toolchain\` directive
1. \`go.mod\`: \`go\` directive

NOTE that the \`constraints.golang\` is not used (https://github.com/renovatebot/renovate/issues/42601)
  `;
}, {
  readonly name: 'gomodMod';
  readonly description: `Used in the \`gomod\` manager to specify a tag for [\`github.com/marwan-at-work/mod\`](https://github.com/marwan-at-work/mod).

Must be prefixed with \`v\`.`;
}, {
  readonly name: 'jenkins';
  readonly description: 'Used in the `jenkins-plugins` datasource to specify a minimum version of Jenkins that a plugin must support.';
}, {
  readonly name: 'pipTools';
  readonly description: 'Used in the `pip-compile` manager to specify a version of `pip-tools` to use. @deprecated TODO remove in #42599';
}, {
  readonly name: 'platform';
  readonly description: 'Used in the `rubygems` datasource to specify the `platform` that the Gem dependency supports.';
}, {
  readonly name: 'rubygems';
  readonly description: 'Used in the `rubygems` datasource to specify the version of the `rubygems` tool that is needed to use this Gem.';
}, {
  readonly name: 'vscode';
  readonly description: 'Used in the `npm` manager to track the version of VSCode that the package is compatible with.';
}, {
  readonly name: 'dotnet-sdk';
  readonly description: 'Used in the `nuget` manager to track .NET SDK version required.';
}, {
  readonly name: 'perl';
  readonly description: 'Used in the `cpanfile` manager to track Perl version required.';
}, {
  readonly name: '%goMod';
  readonly description: 'Used in the `gomod` manager to determine the [minimum version of Go required to use this module](https://go.dev/ref/mod#go-mod-file-go).\n\nNote that this is prefixed with a `%` to explicitly note that this is not a tool that Containerbase knows.';
}];
/**
 * Additional constraints that can be specified for some Managers, but are **not** tools that Containerbase supports.
 */
export type AdditionalConstraintName = (typeof additionalConstraintDefinitions)[number]['name'];
/**
 * Additional constraints that can be specified for some Managers, but are **not** tools that Containerbase supports.
 */
export declare const additionalConstraintNames: AdditionalConstraintName[];
export declare function isAdditionalConstraintName(value: unknown): value is AdditionalConstraintName;
/**
 * A name usable as a key in a `constraints` record, which may be tools that Containerbase supports.
 */
export type ConstraintName = ToolName | AdditionalConstraintName;
export declare function isConstraintName(value: unknown): value is ConstraintName;
export interface ToolConstraint {
  toolName: ToolName;
  constraint?: string | null;
}
export interface ToolConfig {
  datasource: string;
  extractVersion?: string;
  packageName: string;
  versioning: VersioningName;
}
export type Opt<T> = T | null | undefined;
export type VolumesPair = [string, string];
export type VolumeOption = Opt<string | VolumesPair>;
export interface DockerOptions {
  volumes?: Opt<VolumeOption[]>;
  envVars?: Opt<Opt<string>[]>;
  cwd?: Opt<string>;
}
export type DataListener = (chunk: any) => void;
export interface OutputListeners {
  stdout?: DataListener[];
  stderr?: DataListener[];
}
export interface OutputWriter {
  write(chunk: Buffer): void;
  toString(): string;
}
export interface OutputWriters {
  stdout?: OutputWriter;
  stderr?: OutputWriter;
}
/** execa options producing text output, which excludes the binary encodings */
type TextExecaOptions = Extract<Options, {
  readonly encoding?: 'utf8' | 'utf16le';
}>;
export interface RawExecOptions extends TextExecaOptions {
  maxBuffer?: number | undefined;
  cwd?: string;
  outputListeners?: OutputListeners;
  outputWriters?: OutputWriters;
}
export interface ExecResult {
  stdout: string;
  stderr: string;
  /**
   * The process' exit code in the case of a failure.
   *
   * This is only set if using `ignoreFailure` when executing a command
   *
   */
  exitCode?: number;
}
export type ExtraEnv<T = unknown> = Record<string, T>;
export interface ExecOptions {
  cwd?: string;
  cwdFile?: string;
  env?: Opt<ExtraEnv>;
  extraEnv?: Opt<ExtraEnv>;
  docker?: Opt<DockerOptions>;
  toolConstraints?: Opt<ToolConstraint[]>;
  preCommands?: Opt<string[]>;
  ignoreStdout?: boolean;
  maxBuffer?: number | undefined;
  timeout?: number | undefined;
  shell?: boolean | string | undefined;
}
/**
 * configuration that can be configured on a per-command basis, that doesn't make sense to be on the `RawExecOptions`
 */
export interface CommandWithOptions {
  command: string[];
  /** do not throw errors when a command fails, but do log that an error occurred */
  ignoreFailure?: boolean;
  /**
   * Execute the `command` within a shell
   *
   * WARNING this can result in security issues if this includes user-controlled commands
   * **/
  shell?: boolean | string;
}
//#endregion
//# sourceMappingURL=types.d.ts.map