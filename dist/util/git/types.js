//#region lib/util/git/types.ts
/**
* Git tree entry modes (octal file-type representations).
* @see https://git-scm.com/docs/gitdatamodel
*/
const GitTreeMode = {
	/** Regular non-executable file */
	RegularFile: "100644",
	/** Regular executable file */
	ExecutableFile: "100755",
	/** Symbolic link */
	SymbolicLink: "120000",
	/** Directory / subtree */
	Directory: "040000",
	/** Gitlink (submodule) */
	Gitlink: "160000"
};
//#endregion
export { GitTreeMode };

//# sourceMappingURL=types.js.map