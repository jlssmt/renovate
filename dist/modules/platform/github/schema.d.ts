import { z } from "zod/v4";
//#region lib/modules/platform/github/schema.d.ts
export declare const GithubVulnerabilityAlerts: z.ZodPipe<z.ZodType<{
  dismissed_reason?: string | undefined;
  security_advisory: {
    ghsa_id: string;
    summary: string;
    description: string;
    identifiers: {
      type: string;
      value: string;
    }[];
    references?: {
      url: string;
    }[] | undefined;
    severity: "critical" | "high" | "low" | "medium";
    cvss_severities?: {
      cvss_v3?: {
        vector_string: string | null;
        score: number | null;
      } | undefined;
      cvss_v4?: {
        vector_string: string | null;
        score: number | null;
      } | undefined;
    } | undefined;
  };
  security_vulnerability: {
    first_patched_version?: {
      identifier: string;
    } | undefined;
    package: {
      ecosystem: "actions" | "composer" | "go" | "maven" | "npm" | "nuget" | "pip" | "rubygems" | "rust";
      name: string;
    };
    severity: "critical" | "high" | "low" | "medium";
    vulnerable_version_range: string;
  } | null;
  dependency: {
    manifest_path: string;
  };
}[], any, z.core.$ZodTypeInternals<{
  dismissed_reason?: string | undefined;
  security_advisory: {
    ghsa_id: string;
    summary: string;
    description: string;
    identifiers: {
      type: string;
      value: string;
    }[];
    references?: {
      url: string;
    }[] | undefined;
    severity: "critical" | "high" | "low" | "medium";
    cvss_severities?: {
      cvss_v3?: {
        vector_string: string | null;
        score: number | null;
      } | undefined;
      cvss_v4?: {
        vector_string: string | null;
        score: number | null;
      } | undefined;
    } | undefined;
  };
  security_vulnerability: {
    first_patched_version?: {
      identifier: string;
    } | undefined;
    package: {
      ecosystem: "actions" | "composer" | "go" | "maven" | "npm" | "nuget" | "pip" | "rubygems" | "rust";
      name: string;
    };
    severity: "critical" | "high" | "low" | "medium";
    vulnerable_version_range: string;
  } | null;
  dependency: {
    manifest_path: string;
  };
}[], any>>, z.ZodTransform<{
  dismissed_reason?: string | undefined;
  security_advisory: {
    ghsa_id: string;
    summary: string;
    description: string;
    identifiers: {
      type: string;
      value: string;
    }[];
    references?: {
      url: string;
    }[] | undefined;
    severity: "critical" | "high" | "low" | "medium";
    cvss_severities?: {
      cvss_v3?: {
        vector_string: string | null;
        score: number | null;
      } | undefined;
      cvss_v4?: {
        vector_string: string | null;
        score: number | null;
      } | undefined;
    } | undefined;
  };
  security_vulnerability: {
    first_patched_version?: {
      identifier: string;
    } | undefined;
    package: {
      ecosystem: "actions" | "composer" | "go" | "maven" | "npm" | "nuget" | "pip" | "rubygems" | "rust";
      name: string;
    };
    severity: "critical" | "high" | "low" | "medium";
    vulnerable_version_range: string;
  } | null;
  dependency: {
    manifest_path: string;
  };
}[], {
  dismissed_reason?: string | undefined;
  security_advisory: {
    ghsa_id: string;
    summary: string;
    description: string;
    identifiers: {
      type: string;
      value: string;
    }[];
    references?: {
      url: string;
    }[] | undefined;
    severity: "critical" | "high" | "low" | "medium";
    cvss_severities?: {
      cvss_v3?: {
        vector_string: string | null;
        score: number | null;
      } | undefined;
      cvss_v4?: {
        vector_string: string | null;
        score: number | null;
      } | undefined;
    } | undefined;
  };
  security_vulnerability: {
    first_patched_version?: {
      identifier: string;
    } | undefined;
    package: {
      ecosystem: "actions" | "composer" | "go" | "maven" | "npm" | "nuget" | "pip" | "rubygems" | "rust";
      name: string;
    };
    severity: "critical" | "high" | "low" | "medium";
    vulnerable_version_range: string;
  } | null;
  dependency: {
    manifest_path: string;
  };
}[]>>;
export type GithubVulnerabilityAlerts = z.infer<typeof GithubVulnerabilityAlerts>;
export type GithubVulnerabilityAlert = GithubVulnerabilityAlerts[number];
//#endregion
//# sourceMappingURL=schema.d.ts.map