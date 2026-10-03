import { z } from "zod/v4";
//#region lib/modules/datasource/npm/schema.d.ts
export declare const NpmResponseVersion: z.ZodObject<{
  repository: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodUnknown, z.ZodTransform<any, unknown>>, z.ZodUnion<readonly [z.ZodString, z.ZodType<{
    url?: string | undefined;
    directory?: string | undefined;
  }, unknown, z.core.$ZodTypeInternals<{
    url?: string | undefined;
    directory?: string | undefined;
  }, unknown>>]>>>;
  homepage: z.ZodCatch<z.ZodOptional<z.ZodString>>;
  deprecated: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodBoolean]>>;
  gitHead: z.ZodOptional<z.ZodString>;
  dependencies: z.ZodOptional<z.ZodType<Record<string, string>, any, z.core.$ZodTypeInternals<Record<string, string>, any>>>;
  devDependencies: z.ZodOptional<z.ZodType<Record<string, string>, any, z.core.$ZodTypeInternals<Record<string, string>, any>>>;
  engines: z.ZodCatch<z.ZodOptional<z.ZodObject<{
    node: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>>>;
  dist: z.ZodOptional<z.ZodObject<{
    attestations: z.ZodOptional<z.ZodObject<{
      url: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    integrity: z.ZodOptional<z.ZodString>;
    tarball: z.ZodOptional<z.ZodString>;
  }, z.core.$strip>>;
}, z.core.$strip>;
export type NpmResponseVersion = z.infer<typeof NpmResponseVersion>;
export declare const CachedPackument: z.ZodType<{
  versions?: Record<string, {
    repository?: string | {
      url?: string | undefined;
      directory?: string | undefined;
    } | undefined;
    homepage?: string | undefined;
    deprecated?: string | boolean | undefined;
    gitHead?: string | undefined;
    dependencies?: Record<string, string> | undefined;
    devDependencies?: Record<string, string> | undefined;
    engines?: {
      node?: string | undefined;
    } | undefined;
    dist?: {
      attestations?: {
        url?: string | undefined;
      } | undefined;
      integrity?: string | undefined;
      tarball?: string | undefined;
    } | undefined;
  }> | undefined;
  repository?: string | {
    url?: string | undefined;
    directory?: string | undefined;
  } | undefined;
  homepage?: string | undefined;
  time?: Record<string, string> | undefined;
  'dist-tags'?: Record<string, string> | undefined;
}, unknown, z.core.$ZodTypeInternals<{
  versions?: Record<string, {
    repository?: string | {
      url?: string | undefined;
      directory?: string | undefined;
    } | undefined;
    homepage?: string | undefined;
    deprecated?: string | boolean | undefined;
    gitHead?: string | undefined;
    dependencies?: Record<string, string> | undefined;
    devDependencies?: Record<string, string> | undefined;
    engines?: {
      node?: string | undefined;
    } | undefined;
    dist?: {
      attestations?: {
        url?: string | undefined;
      } | undefined;
      integrity?: string | undefined;
      tarball?: string | undefined;
    } | undefined;
  }> | undefined;
  repository?: string | {
    url?: string | undefined;
    directory?: string | undefined;
  } | undefined;
  homepage?: string | undefined;
  time?: Record<string, string> | undefined;
  'dist-tags'?: Record<string, string> | undefined;
}, unknown>>;
export declare const NpmResponse: z.ZodObject<{
  _id: z.ZodOptional<z.ZodString>;
  name: z.ZodOptional<z.ZodString>;
  versions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
    repository: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodUnknown, z.ZodTransform<any, unknown>>, z.ZodUnion<readonly [z.ZodString, z.ZodType<{
      url?: string | undefined;
      directory?: string | undefined;
    }, unknown, z.core.$ZodTypeInternals<{
      url?: string | undefined;
      directory?: string | undefined;
    }, unknown>>]>>>;
    homepage: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    deprecated: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodBoolean]>>;
    gitHead: z.ZodOptional<z.ZodString>;
    dependencies: z.ZodOptional<z.ZodType<Record<string, string>, any, z.core.$ZodTypeInternals<Record<string, string>, any>>>;
    devDependencies: z.ZodOptional<z.ZodType<Record<string, string>, any, z.core.$ZodTypeInternals<Record<string, string>, any>>>;
    engines: z.ZodCatch<z.ZodOptional<z.ZodObject<{
      node: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    dist: z.ZodOptional<z.ZodObject<{
      attestations: z.ZodOptional<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
      }, z.core.$strip>>;
      integrity: z.ZodOptional<z.ZodString>;
      tarball: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
  }, z.core.$loose>>>;
  repository: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodUnknown, z.ZodTransform<any, unknown>>, z.ZodUnion<readonly [z.ZodString, z.ZodType<{
    url?: string | undefined;
    directory?: string | undefined;
  }, unknown, z.core.$ZodTypeInternals<{
    url?: string | undefined;
    directory?: string | undefined;
  }, unknown>>]>>>;
  homepage: z.ZodCatch<z.ZodOptional<z.ZodString>>;
  time: z.ZodOptional<z.ZodType<Record<string, string>, any, z.core.$ZodTypeInternals<Record<string, string>, any>>>;
  'dist-tags': z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
export type NpmResponse = z.infer<typeof NpmResponse>;
//#endregion
//# sourceMappingURL=schema.d.ts.map