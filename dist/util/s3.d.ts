import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
//#region lib/util/s3.d.ts
export declare function getS3Client(s3Endpoint?: string, s3PathStyle?: boolean, credentials?: S3ClientConfig['credentials']): S3Client;
export interface S3UrlParts {
  Bucket: string;
  Key: string;
}
export declare function parseS3Url(rawUrl: URL | string): S3UrlParts | null;
//#endregion
//# sourceMappingURL=s3.d.ts.map