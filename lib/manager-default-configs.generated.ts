
export const managerDefaultConfigs: Record<string, Record<string, unknown>> = {
  "ant": {
    "managerFilePatterns": [
      "**/build.xml"
    ]
  },
  "ansible": {
    "managerFilePatterns": [
      "/(^|/)tasks/[^/]+\\.ya?ml$/"
    ]
  },
  "ansible-galaxy": {
    "managerFilePatterns": [
      "/(^|/)(galaxy|requirements)(\\.ansible)?\\.ya?ml$/"
    ]
  },
  "apm": {
    "managerFilePatterns": [
      "/(^|/)apm\\.ya?ml$/"
    ]
  },
  "argocd": {
    "managerFilePatterns": []
  },
  "asdf": {
    "managerFilePatterns": [
      "/(^|/)\\.tool-versions$/"
    ]
  },
  "azure-pipelines": {
    "managerFilePatterns": [
      "/(^|/).azuredevops/.+\\.ya?ml$/",
      "/azure.*pipelines?.*\\.ya?ml$/"
    ],
    "enabled": false
  },
  "batect": {
    "managerFilePatterns": [
      "/(^|/)batect(-bundle)?\\.ya?ml$/"
    ]
  },
  "batect-wrapper": {
    "managerFilePatterns": [
      "/(^|/)batect$/"
    ],
    "versioning": "semver"
  },
  "bazel": {
    "managerFilePatterns": [
      "/(^|/)WORKSPACE(|\\.bazel|\\.bzlmod)$/",
      "/\\.WORKSPACE\\.bazel$/",
      "/\\.bzl$/"
    ]
  },
  "bazel-module": {
    "managerFilePatterns": [
      "/(^|/|\\.)MODULE\\.bazel$/"
    ]
  },
  "bazelisk": {
    "managerFilePatterns": [
      "/(^|/)\\.bazelversion$/"
    ],
    "pinDigests": false,
    "versioning": "semver"
  },
  "bicep": {
    "managerFilePatterns": [
      "/\\.bicep$/"
    ]
  },
  "bitbucket-pipelines": {
    "managerFilePatterns": [
      "**/*-pipelines.yml"
    ]
  },
  "bitrise": {
    "managerFilePatterns": [
      "/(^|/)bitrise\\.ya?ml$/"
    ]
  },
  "buildkite": {
    "managerFilePatterns": [
      "/buildkite\\.ya?ml/",
      "/\\.buildkite/.+\\.ya?ml$/"
    ],
    "commitMessageTopic": "buildkite plugin {{depName}}",
    "commitMessageExtra": "to {{#if isMajor}}{{{prettyNewMajor}}}{{else}}{{{newValue}}}{{/if}}"
  },
  "buildpacks": {
    "commitMessageTopic": "buildpack {{depName}}",
    "managerFilePatterns": [
      "/(^|/)project\\.toml$/"
    ],
    "pinDigests": false
  },
  "bun": {
    "managerFilePatterns": [
      "/(^|/)bun\\.lockb?$/",
      "/(^|/)package\\.json$/"
    ],
    "digest": {
      "prBodyDefinitions": {
        "Change": "{{#if displayFrom}}`{{{displayFrom}}}` → {{else}}{{#if currentValue}}`{{{currentValue}}}` → {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}"
      }
    },
    "prBodyDefinitions": {
      "Change": "[{{#if displayFrom}}`{{{displayFrom}}}` → {{else}}{{#if currentValue}}`{{{currentValue}}}` → {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}]({{#if depName}}https://renovatebot.com/diffs/npm/{{replace '/' '%2f' depName}}/{{{currentVersion}}}/{{{newVersion}}}{{/if}})"
    }
  },
  "bun-version": {
    "managerFilePatterns": [
      "/(^|/)\\.bun-version$/"
    ],
    "versioning": "npm"
  },
  "bundler": {
    "managerFilePatterns": [
      "/(^|/)Gemfile$/"
    ],
    "versioning": "ruby"
  },
  "cake": {
    "managerFilePatterns": [
      "/\\.cake$/"
    ]
  },
  "cargo": {
    "commitMessageTopic": "Rust crate {{depName}}",
    "managerFilePatterns": [
      "/(^|/)Cargo\\.toml$/"
    ]
  },
  "cdnurl": {
    "managerFilePatterns": [],
    "versioning": "semver"
  },
  "circleci": {
    "managerFilePatterns": [
      "/(^|/)\\.circleci/.+\\.ya?ml$/"
    ]
  },
  "cloudbuild": {
    "managerFilePatterns": [
      "/(^|/)cloudbuild\\.ya?ml/"
    ]
  },
  "cocoapods": {
    "managerFilePatterns": [
      "/(^|/)Podfile$/"
    ],
    "versioning": "ruby"
  },
  "composer": {
    "managerFilePatterns": [
      "/(^|/)([\\w-]*)composer\\.json$/"
    ],
    "versioning": "composer"
  },
  "conan": {
    "managerFilePatterns": [
      "/(^|/)conanfile\\.(txt|py)$/"
    ],
    "datasource": "conan",
    "versioning": "conan"
  },
  "copier": {
    "managerFilePatterns": [
      "/(^|/)\\.copier-answers(\\..+)?\\.ya?ml/"
    ],
    "versioning": "pep440"
  },
  "cpanfile": {
    "managerFilePatterns": [
      "/(^|/)cpanfile$/"
    ]
  },
  "crossplane": {
    "managerFilePatterns": []
  },
  "crow": {
    "managerFilePatterns": [
      "/^\\.crow(?:/[^/]+)?\\.ya?ml$/"
    ]
  },
  "deno": {
    "managerFilePatterns": [
      "/(^|/)deno\\.lock$/",
      "/(^|/)deno\\.(json|jsonc)$/"
    ],
    "digest": {
      "prBodyDefinitions": {
        "Change": "{{#if displayFrom}}`{{{displayFrom}}}` -> {{else}}{{#if currentValue}}`{{{currentValue}}}` -> {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}"
      }
    },
    "prBodyDefinitions": {
      "Change": "{{#if (equals datasource \"npm\")}}[{{#if displayFrom}}`{{{displayFrom}}}` -> {{else}}{{#if currentValue}}`{{{currentValue}}}` -> {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}]({{#if depName}}https://renovatebot.com/diffs/npm/{{replace '/' '%2f' depName}}/{{{currentVersion}}}/{{{newVersion}}}{{/if}}){{else}}{{#if displayFrom}}`{{{displayFrom}}}` -> {{else}}{{#if currentValue}}`{{{currentValue}}}` -> {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}{{/if}}"
    }
  },
  "deps-edn": {
    "managerFilePatterns": [
      "/(^|/)(?:deps|bb)\\.edn$/"
    ],
    "versioning": "maven"
  },
  "devbox": {
    "managerFilePatterns": [
      "/(^|/)devbox\\.json$/"
    ]
  },
  "devcontainer": {
    "managerFilePatterns": [
      "/^.devcontainer/devcontainer.json$/",
      "/^.devcontainer.json$/",
      "/^.devcontainer/[^/]+/devcontainer.json$/"
    ]
  },
  "docker-compose": {
    "managerFilePatterns": [
      "/(^|/)(?:docker-)?compose[^/]*\\.ya?ml$/"
    ]
  },
  "dockerfile": {
    "managerFilePatterns": [
      "/(^|/|\\.)([Dd]ocker|[Cc]ontainer)file$/",
      "/(^|/)([Dd]ocker|[Cc]ontainer)file[^/]*$/"
    ]
  },
  "droneci": {
    "managerFilePatterns": [
      "/(^|/)\\.drone\\.yml$/"
    ]
  },
  "fleet": {
    "managerFilePatterns": [
      "/(^|/)fleet\\.ya?ml/"
    ]
  },
  "flux": {
    "managerFilePatterns": [
      "/(?:^|/)gotk-components\\.ya?ml$/"
    ]
  },
  "fvm": {
    "managerFilePatterns": [
      "/(^|/)\\.fvm/fvm_config\\.json$/",
      "/(^|/)\\.fvmrc$/"
    ],
    "versioning": "semver"
  },
  "git-submodules": {
    "enabled": false,
    "versioning": "git",
    "managerFilePatterns": [
      "/(^|/)\\.gitmodules$/"
    ]
  },
  "github-actions": {
    "managerFilePatterns": [
      "/(^|/)(workflow-templates|\\.(?:github|gitea|forgejo)/(?:workflows|actions))/.+\\.ya?ml$/",
      "/(^|/)action\\.ya?ml$/"
    ]
  },
  "gitlabci": {
    "managerFilePatterns": [
      "/\\.gitlab-ci\\.ya?ml$/"
    ]
  },
  "gitlabci-include": {
    "managerFilePatterns": [
      "/\\.gitlab-ci\\.ya?ml$/"
    ]
  },
  "glasskube": {
    "managerFilePatterns": []
  },
  "gleam": {
    "managerFilePatterns": [
      "/(^|/)gleam.toml$/"
    ],
    "versioning": "hex"
  },
  "gomod": {
    "managerFilePatterns": [
      "/(^|/)go\\.mod$/"
    ],
    "pinDigests": false
  },
  "gradle": {
    "managerFilePatterns": [
      "/\\.gradle(\\.kts)?$/",
      "/(^|/)gradle\\.properties$/",
      "/(^|/)gradle/.+\\.toml$/",
      "/(^|/)buildSrc/.+\\.kt$/",
      "/\\.versions\\.toml$/",
      "/(^|/)versions.props$/",
      "/(^|/)versions.lock$/"
    ],
    "timeout": 600,
    "versioning": "gradle"
  },
  "gradle-wrapper": {
    "managerFilePatterns": [
      "/(^|/)gradle/wrapper/gradle-wrapper\\.properties$/"
    ],
    "versioning": "gradle"
  },
  "haskell-cabal": {
    "managerFilePatterns": [
      "/\\.cabal$/"
    ],
    "pinDigests": false
  },
  "helm-requirements": {
    "registryAliases": {
      "stable": "https://charts.helm.sh/stable"
    },
    "commitMessageTopic": "helm chart {{depName}}",
    "managerFilePatterns": [
      "/(^|/)requirements\\.ya?ml$/"
    ]
  },
  "helm-values": {
    "commitMessageTopic": "helm values {{depName}}",
    "managerFilePatterns": [
      "/(^|/)values\\.ya?ml$/"
    ],
    "pinDigests": false
  },
  "helmfile": {
    "registryAliases": {
      "stable": "https://charts.helm.sh/stable"
    },
    "commitMessageTopic": "helm chart {{depName}}",
    "managerFilePatterns": [
      "/(^|/)helmfile\\.ya?ml(?:\\.gotmpl)?$/",
      "/(^|/)helmfile\\.d/.+\\.ya?ml(?:\\.gotmpl)?$/"
    ]
  },
  "helmsman": {
    "managerFilePatterns": []
  },
  "helmv3": {
    "registryAliases": {
      "stable": "https://charts.helm.sh/stable"
    },
    "commitMessageTopic": "helm chart {{depName}}",
    "managerFilePatterns": [
      "/(^|/)Chart\\.ya?ml$/"
    ]
  },
  "hermit": {
    "managerFilePatterns": [
      "/(^|/)bin/hermit$/"
    ],
    "excludeCommitPaths": [
      "**/bin/hermit"
    ],
    "versioning": "hermit"
  },
  "homeassistant-manifest": {
    "managerFilePatterns": [
      "/(^|/)manifest\\.json$/"
    ]
  },
  "homebrew": {
    "commitMessageTopic": "Homebrew Formula {{depName}}",
    "managerFilePatterns": [
      "/^Formula/\\w*/?[^/]+[.]rb$/"
    ]
  },
  "html": {
    "managerFilePatterns": [
      "/\\.html?$/"
    ],
    "versioning": "semver",
    "digest": {
      "enabled": false
    },
    "pinDigests": false
  },
  "jenkins": {
    "managerFilePatterns": [
      "/(^|/)plugins\\.(txt|ya?ml)$/"
    ]
  },
  "jsonnet-bundler": {
    "managerFilePatterns": [
      "/(^|/)jsonnetfile\\.json$/"
    ],
    "datasource": "git-tags"
  },
  "kotlin-script": {
    "managerFilePatterns": [
      "/^.+\\.main\\.kts$/"
    ]
  },
  "kubernetes": {
    "managerFilePatterns": []
  },
  "kustomize": {
    "managerFilePatterns": [
      "/(^|/)kustomization\\.ya?ml$/"
    ],
    "pinDigests": false
  },
  "leiningen": {
    "managerFilePatterns": [
      "/(^|/)project\\.clj$/"
    ],
    "versioning": "maven"
  },
  "maven": {
    "managerFilePatterns": [
      "/(^|/|\\.)pom\\.xml$/",
      "/(^|/)pom\\.template\\.xml$/",
      "/^(((\\.mvn)|(\\.m2))/)?settings\\.xml$/",
      "/(^|/)\\.mvn/extensions\\.xml$/"
    ]
  },
  "maven-wrapper": {
    "managerFilePatterns": [
      "/(^|\\/).mvn/wrapper/maven-wrapper.properties$/",
      "/(^|\\/)mvnw(.cmd)?$/"
    ]
  },
  "meteor": {
    "managerFilePatterns": [
      "/(^|/)package\\.js$/"
    ]
  },
  "mint": {
    "managerFilePatterns": [
      "/(^|/)Mintfile$/"
    ]
  },
  "mise": {
    "managerFilePatterns": [
      "**/{,.}mise{,.*}.toml",
      "**/{,.}mise/config{,.*}.toml",
      "**/.config/mise{,.*}.toml",
      "**/.config/mise/{mise,config}{,.*}.toml",
      "**/.config/mise/conf.d/*.toml",
      "**/.rtx{,.*}.toml"
    ],
    "pinDigests": false
  },
  "mix": {
    "managerFilePatterns": [
      "/(^|/)mix\\.exs$/"
    ]
  },
  "nix": {
    "managerFilePatterns": [
      "/(^|/)flake\\.nix$/"
    ],
    "commitMessageTopic": "nix",
    "commitMessageExtra": "to {{newValue}}",
    "enabled": false
  },
  "nodenv": {
    "managerFilePatterns": [
      "/(^|/)\\.node-version$/"
    ],
    "versioning": "node"
  },
  "npm": {
    "managerFilePatterns": [
      "/(^|/)package\\.json$/",
      "/(^|/)pnpm-workspace\\.yaml$/",
      "/(^|/)\\.yarnrc\\.yml$/"
    ],
    "digest": {
      "prBodyDefinitions": {
        "Change": "{{#if displayFrom}}`{{{displayFrom}}}` → {{else}}{{#if currentValue}}`{{{currentValue}}}` → {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}"
      }
    },
    "prBodyDefinitions": {
      "Change": "[{{#if displayFrom}}`{{{displayFrom}}}` → {{else}}{{#if currentValue}}`{{{currentValue}}}` → {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}]({{#if depName}}https://renovatebot.com/diffs/npm/{{replace '/' '%2f' depName}}/{{{currentVersion}}}/{{{newVersion}}}{{/if}})"
    }
  },
  "nuget": {
    "managerFilePatterns": [
      "/\\.(?:cs|fs|vb|sql)proj$/",
      "/\\.(?:props|targets)$/",
      "/(^|/)dotnet-tools\\.json$/",
      "/(^|/)global\\.json$/"
    ],
    "rangeStrategy": "bump",
    "packageRules": [
      {
        "matchDepTypes": [
          "msbuild-sdk"
        ],
        "rangeStrategy": "bump"
      }
    ]
  },
  "nvm": {
    "managerFilePatterns": [
      "/(^|/)\\.nvmrc$/"
    ],
    "versioning": "node",
    "pinDigests": false
  },
  "ocb": {
    "managerFilePatterns": []
  },
  "osgi": {
    "managerFilePatterns": [
      "/(^|/)src/main/features/.+\\.json$/"
    ]
  },
  "pep621": {
    "managerFilePatterns": [
      "/(^|/)pyproject\\.toml$/"
    ]
  },
  "pep723": {
    "managerFilePatterns": []
  },
  "pip-compile": {
    "managerFilePatterns": [],
    "lockFileMaintenance": {
      "enabled": true,
      "branchTopic": "pip-compile-refresh",
      "commitMessageAction": "Refresh pip-compile outputs"
    }
  },
  "pip_requirements": {
    "managerFilePatterns": [
      "/(^|/)[\\w-]*requirements([-._]\\w+)?\\.(txt|pip)$/"
    ]
  },
  "pip_setup": {
    "managerFilePatterns": [
      "/(^|/)setup\\.py$/"
    ]
  },
  "pipenv": {
    "managerFilePatterns": [
      "/(^|/)Pipfile$/"
    ]
  },
  "pixi": {
    "managerFilePatterns": [
      "/(^|/)pyproject\\.toml$/",
      "/(^|/)pixi\\.toml$/"
    ]
  },
  "poetry": {
    "managerFilePatterns": [
      "/(^|/)pyproject\\.toml$/"
    ]
  },
  "pre-commit": {
    "commitMessageTopic": "pre-commit hook {{depName}}",
    "enabled": false,
    "managerFilePatterns": [
      "/(^|/)\\.pre-commit-config\\.ya?ml$/"
    ],
    "prBodyNotes": [
      "Note: The `pre-commit` manager in Renovate is not supported by the `pre-commit` maintainers or community. Please do not report any problems there, instead [create a Discussion in the Renovate repository](https://github.com/renovatebot/renovate/discussions/new) if you have any questions."
    ]
  },
  "proto": {
    "managerFilePatterns": [
      "**/.prototools"
    ]
  },
  "pub": {
    "managerFilePatterns": [
      "/(^|/)pubspec\\.ya?ml$/"
    ]
  },
  "puppet": {
    "managerFilePatterns": [
      "/(^|/)Puppetfile$/"
    ]
  },
  "pyenv": {
    "managerFilePatterns": [
      "/(^|/)\\.python-version$/"
    ],
    "versioning": "docker",
    "pinDigests": false
  },
  "quadlet": {
    "managerFilePatterns": [
      "/.+\\.container$/",
      "/.+\\.image$/",
      "/.+\\.volume$/"
    ]
  },
  "renovate-config": {
    "managerFilePatterns": [
      "renovate.json",
      "renovate.jsonc",
      "renovate.json5",
      ".github/renovate.json",
      ".github/renovate.jsonc",
      ".github/renovate.json5",
      ".gitlab/renovate.json",
      ".gitlab/renovate.jsonc",
      ".gitlab/renovate.json5",
      ".renovaterc",
      ".renovaterc.json",
      ".renovaterc.jsonc",
      ".renovaterc.json5"
    ]
  },
  "ruby-version": {
    "managerFilePatterns": [
      "/(^|/)\\.ruby-version$/"
    ],
    "versioning": "ruby"
  },
  "runtime-version": {
    "managerFilePatterns": [
      "/(^|/)runtime.txt$/"
    ],
    "pinDigests": false
  },
  "rust-toolchain": {
    "commitMessageTopic": "Rust",
    "managerFilePatterns": [
      "/(^|/)rust-toolchain(\\.toml)?$/"
    ]
  },
  "sbt": {
    "managerFilePatterns": [
      "/\\.sbt$/",
      "/project/[^/]*\\.scala$/",
      "/project/build\\.properties$/",
      "/(^|/)repositories$/"
    ],
    "versioning": "ivy"
  },
  "scalafmt": {
    "managerFilePatterns": [
      "/(^|/)\\.scalafmt.conf$/"
    ]
  },
  "setup-cfg": {
    "managerFilePatterns": [
      "/(^|/)setup\\.cfg$/"
    ],
    "versioning": "pep440"
  },
  "smithy": {
    "managerFilePatterns": [
      "/(^|/)smithy-build\\.json$/"
    ]
  },
  "sveltos": {
    "managerFilePatterns": []
  },
  "swift": {
    "managerFilePatterns": [
      "/(^|/)Package\\.swift/"
    ],
    "versioning": "swift",
    "pinDigests": false
  },
  "tekton": {
    "managerFilePatterns": []
  },
  "terraform": {
    "commitMessageTopic": "Terraform {{depName}}",
    "managerFilePatterns": [
      "**/*.tf",
      "**/*.tofu"
    ],
    "pinDigests": false
  },
  "terraform-version": {
    "managerFilePatterns": [
      "/(^|/)\\.terraform-version$/"
    ],
    "versioning": "hashicorp",
    "extractVersion": "^v(?<version>.*)$"
  },
  "terragrunt": {
    "commitMessageTopic": "Terragrunt dependency {{depName}}",
    "managerFilePatterns": [
      "/(^|/)terragrunt\\.hcl$/"
    ]
  },
  "terragrunt-version": {
    "managerFilePatterns": [
      "/(^|/)\\.terragrunt-version$/"
    ],
    "versioning": "hashicorp",
    "extractVersion": "^v(?<version>.+)$"
  },
  "tflint-plugin": {
    "commitMessageTopic": "TFLint plugin {{depName}}",
    "managerFilePatterns": [
      "/\\.tflint\\.hcl$/"
    ],
    "extractVersion": "^v(?<version>.*)$"
  },
  "travis": {
    "managerFilePatterns": [
      "/^\\.travis\\.ya?ml$/"
    ],
    "major": {
      "enabled": false
    },
    "versioning": "node"
  },
  "typst": {
    "managerFilePatterns": [
      "/\\.typ$/"
    ]
  },
  "unity3d": {
    "managerFilePatterns": [
      "**/ProjectSettings/ProjectVersion.txt"
    ]
  },
  "velaci": {
    "managerFilePatterns": [
      "/(^|/)\\.vela\\.ya?ml$/"
    ]
  },
  "vendir": {
    "commitMessageTopic": "vendir {{depName}}",
    "managerFilePatterns": [
      "/(^|/)vendir\\.yml$/"
    ]
  },
  "woodpecker": {
    "managerFilePatterns": [
      "/^\\.woodpecker(?:/[^/]+)?\\.ya?ml$/"
    ]
  },
  "xcodegen": {
    "managerFilePatterns": [
      "**/project.yml"
    ],
    "pinDigests": false
  },
  "regex": {
    "pinDigests": false
  },
  "jsonata": {
    "pinDigests": false
  }
};
