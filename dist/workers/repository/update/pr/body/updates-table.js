import { regEx } from "../../../../../util/regex.js";
import { logger } from "../../../../../logger/index.js";
import { compile } from "../../../../../util/template/index.js";
//#region lib/workers/repository/update/pr/body/updates-table.ts
function getRowDefinition(prBodyColumns, upgrade) {
	const res = [];
	if (upgrade.prBodyDefinitions) for (const header of prBodyColumns) {
		const value = upgrade.prBodyDefinitions[header];
		res.push({
			header,
			value
		});
	}
	return res;
}
function getNonEmptyColumns(prBodyColumns, rows) {
	const res = [];
	for (const header of prBodyColumns) for (const row of rows) if (row[header]?.length && !res.includes(header)) res.push(header);
	return res;
}
function getHeaderLabel(header, config) {
	return config.prBodyHeadingDefinitions?.[header] ?? header;
}
function getPrUpdatesTable(config) {
	if (config.prBodyColumns === void 0) {
		logger.warn("getPrUpdatesTable - prBodyColumns is undefined");
		return "";
	}
	const tableKeyValuePairs = {};
	for (const upgrade of config.upgrades) if (upgrade) {
		const key = `${upgrade.depName ?? ""}_${upgrade.depType ?? ""}_${upgrade.newValue ?? ""}_${upgrade.newVersion ?? ""}_${upgrade.currentValue ?? ""}_${upgrade.currentVersion ?? ""}_${upgrade.updateType}`;
		const res = {};
		const rowDefinition = getRowDefinition(config.prBodyColumns, upgrade);
		for (const column of rowDefinition) {
			const { header, value } = column;
			try {
				// istanbul ignore else
				if (value) res[header] = compile(value, upgrade).replace(regEx(/``/g), "");
				else res[header] = "";
			} catch (err) /* istanbul ignore next */ {
				logger.warn({
					header,
					value,
					err
				}, "Handlebars compilation error");
			}
		}
		if (tableKeyValuePairs[key]) tableKeyValuePairs[key] = compareTableValues(tableKeyValuePairs[key], res, config.prBodyColumns);
		else tableKeyValuePairs[key] = res;
	}
	const tableValues = Object.values(tableKeyValuePairs);
	const tableColumns = getNonEmptyColumns(config.prBodyColumns, tableValues);
	let res = "\n\nThis PR contains the following updates:\n\n";
	const headerCells = tableColumns.map((col) => getHeaderLabel(col, config));
	res += `| ${headerCells.join(" | ")} |\n`;
	res += `|${tableColumns.map(() => "---|").join("")}\n`;
	const rows = [];
	for (const row of tableValues) {
		let val = "|";
		for (const column of tableColumns) {
			const content = row[column] ? row[column].replace(regEx(/^@/), "@&#8203;").replace(regEx(/\|/g), "\\|") : "";
			val += ` ${content} |`;
		}
		val += "\n";
		rows.push(val);
	}
	const uniqueRows = [...new Set(rows)];
	res += uniqueRows.join("");
	res += "\n\n";
	return res;
}
function compareTableValues(a, b, prBodyColumns) {
	let score = 0;
	for (const header of prBodyColumns) {
		if (!b[header] && !a[header]) continue;
		if (!b[header]) {
			score--;
			continue;
		}
		if (!a[header]) {
			score++;
			continue;
		}
		if (a[header] !== b[header]) {
			if (a[header].length < b[header].length) score++;
			else score--;
		}
	}
	return score > 0 ? b : a;
}
//#endregion
export { getPrUpdatesTable };

//# sourceMappingURL=updates-table.js.map