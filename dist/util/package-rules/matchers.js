import { BaseBranchesMatcher } from "./base-branches.js";
import { CategoriesMatcher } from "./categories.js";
import { CurrentAgeMatcher } from "./current-age.js";
import { CurrentValueMatcher } from "./current-value.js";
import { CurrentVersionMatcher } from "./current-version.js";
import { DatasourcesMatcher } from "./datasources.js";
import { DepNameMatcher } from "./dep-names.js";
import { DepTypesMatcher } from "./dep-types.js";
import { FileNamesMatcher } from "./files.js";
import { IsBreakingMatcher } from "./is-breaking.js";
import { JsonataMatcher } from "./jsonata.js";
import { ManagersMatcher } from "./managers.js";
import { MergeConfidenceMatcher } from "./merge-confidence.js";
import { NewValueMatcher } from "./new-value.js";
import { PackageNameMatcher } from "./package-names.js";
import { RegistryUrlsMatcher } from "./registryurls.js";
import { RepositoriesMatcher } from "./repositories.js";
import { SourceUrlsMatcher } from "./sourceurls.js";
import { UpdateTypesMatcher } from "./update-types.js";
//#region lib/util/package-rules/matchers.ts
const matchers = [];
matchers.push(new MergeConfidenceMatcher());
matchers.push(new RepositoriesMatcher());
matchers.push(new BaseBranchesMatcher());
matchers.push(new CategoriesMatcher());
matchers.push(new ManagersMatcher());
matchers.push(new FileNamesMatcher());
matchers.push(new DatasourcesMatcher());
matchers.push(new PackageNameMatcher());
matchers.push(new DepNameMatcher());
matchers.push(new DepTypesMatcher());
matchers.push(new CurrentValueMatcher());
matchers.push(new CurrentVersionMatcher());
matchers.push(new UpdateTypesMatcher());
matchers.push(new IsBreakingMatcher());
matchers.push(new SourceUrlsMatcher());
matchers.push(new RegistryUrlsMatcher());
matchers.push(new NewValueMatcher());
matchers.push(new CurrentAgeMatcher());
matchers.push(new JsonataMatcher());
//#endregion
export { matchers as default };

//# sourceMappingURL=matchers.js.map