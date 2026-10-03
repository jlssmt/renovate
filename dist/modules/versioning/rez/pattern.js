import { regEx } from "../../../util/regex.js";
//#region lib/modules/versioning/rez/pattern.ts
const versionGroup = "([0-9a-zA-Z_]+(?:[.-][0-9a-zA-Z_]+)*)";
const matchVersion = regEx(`^(?<version>${versionGroup})$`);
const exactVersion = regEx(`^(?<exact_version>==(?<exact_version_group>${versionGroup})?)$`);
const inclusiveBound = regEx(`^(?<inclusive_bound>(?<inclusive_lower_version>${versionGroup})?\\.\\.(?<inclusive_upper_version>${versionGroup})?)$`);
const lowerBound = new RegExp(`^(?<lower_bound>(?<lower_bound_prefix>>|>=)?(?<lower_version>${versionGroup})?(\\k<lower_bound_prefix>|\\+)?)$`);
const upperBound = new RegExp(`^(?<upper_bound>(?<upper_bound_prefix><(?=${versionGroup})|<=)?(?<upper_version>${versionGroup})?)$`);
const ascendingRange = new RegExp(`^(?<range_asc>(?<range_lower_asc>(?<range_lower_asc_prefix>>|>=)?(?<range_lower_asc_version>${versionGroup})?(\\k<range_lower_asc_prefix>|\\+)?),?(?<range_upper_asc>(\\k<range_lower_asc_version>,?|)(?<range_upper_asc_prefix><(?=${versionGroup})|<=)(?<range_upper_asc_version>${versionGroup})?))$`);
const descendingRange = new RegExp(`^(?<range_desc>(?<range_upper_desc>(?<range_upper_desc_prefix><|<=)?(?<range_upper_desc_version>${versionGroup})?(\\k<range_upper_desc_prefix>|\\+)?),(?<range_lower_desc>(\\k<range_upper_desc_version>,|)(?<range_lower_desc_prefix><(?=${versionGroup})|>=?)(?<range_lower_desc_version>${versionGroup})?))$`);
//#endregion
export { ascendingRange, descendingRange, exactVersion, inclusiveBound, lowerBound, matchVersion, upperBound, versionGroup };

//# sourceMappingURL=pattern.js.map