//#region lib/instrumentation/types.ts
const ATTR_RENOVATE_SPLIT = "renovate.split";
/**
* The name of a Renovate datasource (ex: `github-tags`, `npm`, `docker`, etc).
*/
const ATTR_RENOVATE_DATASOURCE = "renovate.datasource";
/**
* The registry URL of a registry URL as might be used with a datasource and package name.
*/
const ATTR_RENOVATE_REGISTRY_URL = "renovate.registryUrl";
/**
* The package name of a package.
*/
const ATTR_RENOVATE_PACKAGE_NAME = "renovate.packageName";
/**
* the Git Version Control System (VCS)'s Operation Type
*
* @see GitOperationType
* @see https://opentelemetry.io/docs/specs/semconv/registry/attributes/vcs/
*
*/
const ATTR_VCS_GIT_OPERATION_TYPE = "vcs.git.operation.type";
/**
* the Git Version Control System (VCS)'s subcommand
*
* @see https://opentelemetry.io/docs/specs/semconv/registry/attributes/vcs/
* */
const ATTR_VCS_GIT_SUBCOMMAND = "vcs.git.subcommand";
//#endregion
export { ATTR_RENOVATE_DATASOURCE, ATTR_RENOVATE_PACKAGE_NAME, ATTR_RENOVATE_REGISTRY_URL, ATTR_RENOVATE_SPLIT, ATTR_VCS_GIT_OPERATION_TYPE, ATTR_VCS_GIT_SUBCOMMAND };

//# sourceMappingURL=types.js.map