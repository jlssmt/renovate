//#region lib/util/compress.d.ts
export declare function compressToBuffer(input: string, quality?: number): Promise<Buffer>;
export declare function decompressFromBuffer(input: Buffer): Promise<string>;
export declare function compressToBase64(input: string): Promise<string>;
export declare function decompressFromBase64(input: string): Promise<string>;
//#endregion
//# sourceMappingURL=compress.d.ts.map