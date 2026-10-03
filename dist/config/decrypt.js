import { CONFIG_VALIDATION } from "../constants/error-messages.js";
import { getEnv } from "../util/env.js";
import { regEx } from "../util/regex.js";
import { GlobalConfig } from "./global.js";
import { addSecretForSanitizing } from "../util/sanitize.js";
import { logger } from "../logger/index.js";
import { ensureTrailingSlash, parseUrl, trimSlashes } from "../util/url.js";
import { tryDecryptBcPgp } from "./decrypt/bcpgp.js";
import { tryDecryptOpenPgp } from "./decrypt/openpgp.js";
import { DecryptedObject } from "./schema.js";
import { isArray, isNonEmptyString, isObject, isString } from "@sindresorhus/is";
//#region lib/config/decrypt.ts
let privateKey;
let privateKeyOld;
function setPrivateKeys(pKey, pKeyOld) {
	privateKey = pKey;
	privateKeyOld = pKeyOld;
}
async function tryDecrypt(key, encryptedStr, repository) {
	let decryptedStr = null;
	let decryptedObjStr;
	if (getEnv().RENOVATE_X_USE_OPENPGP === "true") decryptedObjStr = await tryDecryptOpenPgp(key, encryptedStr);
	else decryptedObjStr = await tryDecryptBcPgp(key, encryptedStr);
	if (decryptedObjStr) decryptedStr = validateDecryptedValue(decryptedObjStr, repository);
	return decryptedStr;
}
function validateDecryptedValue(decryptedObjStr, repository) {
	try {
		const decryptedObj = DecryptedObject.safeParse(decryptedObjStr);
		if (!decryptedObj.success) {
			const error = /* @__PURE__ */ new Error("config-validation");
			error.validationError = `Could not parse decrypted config.`;
			throw error;
		}
		const { o: org, r: repo, v: value } = decryptedObj.data;
		if (!isNonEmptyString(value)) {
			const error = /* @__PURE__ */ new Error("config-validation");
			error.validationError = `Encrypted value in config is missing a value.`;
			throw error;
		}
		if (!isNonEmptyString(org)) {
			const error = /* @__PURE__ */ new Error("config-validation");
			error.validationError = `Encrypted value in config is missing a scope.`;
			throw error;
		}
		const repositories = [repository.toUpperCase()];
		const azureCollection = getAzureCollection();
		if (isNonEmptyString(azureCollection)) {
			repositories.push(`${azureCollection}/${repository}`.toUpperCase());
			repositories.push(`${azureCollection}/*/`.toUpperCase());
		}
		const orgPrefixes = org.split(",").map((o) => o.trim()).map((o) => o.toUpperCase()).map((o) => ensureTrailingSlash(o));
		if (isNonEmptyString(repo)) {
			const scopedRepos = orgPrefixes.map((orgPrefix) => `${orgPrefix}${repo}`.toUpperCase());
			for (const rp of repositories) if (scopedRepos.some((r) => r === rp)) return value;
			logger.debug({ scopedRepos }, "Secret is scoped to a different repository");
			const error = /* @__PURE__ */ new Error("config-validation");
			error.validationError = `Encrypted secret is scoped to a different repository: "${scopedRepos.join(",")}".`;
			throw error;
		}
		const azcol = azureCollection === void 0 ? void 0 : ensureTrailingSlash(azureCollection).toUpperCase();
		for (const rp of repositories) if (orgPrefixes.some((orgPrefix) => rp.startsWith(orgPrefix) && orgPrefix !== azcol)) return value;
		logger.debug({ orgPrefixes }, "Secret is scoped to a different org");
		const error = /* @__PURE__ */ new Error("config-validation");
		error.validationError = `Encrypted secret is scoped to a different org: "${orgPrefixes.join(",")}".`;
		throw error;
	} catch (err) {
		logger.warn({ err }, "Could not parse decrypted string");
	}
	return null;
}
async function decryptConfig(config, repository, existingPath = "$") {
	logger.trace({ config }, "decryptConfig()");
	const decryptedConfig = { ...config };
	for (const [key, val] of Object.entries(config)) if (key === "encrypted" && isObject(val)) {
		const path = `${existingPath}.${key}`;
		logger.debug({ config: val }, `Found encrypted config in ${path}`);
		const encryptedWarning = GlobalConfig.get("encryptedWarning");
		if (isString(encryptedWarning)) logger.once.warn(encryptedWarning);
		if (privateKey) for (const [eKey, eVal] of Object.entries(val)) {
			logger.debug(`Trying to decrypt ${eKey} in ${path}`);
			let decryptedStr = await tryDecrypt(privateKey, eVal, repository);
			if (privateKeyOld && !isNonEmptyString(decryptedStr)) {
				logger.debug(`Trying to decrypt with old private key`);
				decryptedStr = await tryDecrypt(privateKeyOld, eVal, repository);
			}
			if (!isNonEmptyString(decryptedStr)) {
				const error = /* @__PURE__ */ new Error("config-validation");
				error.validationError = `Failed to decrypt field ${eKey}. Please re-encrypt and try again.`;
				throw error;
			}
			logger.debug(`Decrypted ${eKey} in ${path}`);
			// v8 ignore if -- TODO: add test #40625
			if (eKey === "npmToken") {
				const token = decryptedStr.replace(regEx(/\n$/), "");
				decryptedConfig[eKey] = token;
				addSecretForSanitizing(token);
			} else {
				decryptedConfig[eKey] = decryptedStr;
				addSecretForSanitizing(decryptedStr);
			}
		}
		else {
			const env = getEnv();
			if (env.RENOVATE_X_ENCRYPTED_STRICT === "true") {
				const error = new Error(CONFIG_VALIDATION);
				error.validationSource = "config";
				error.validationError = "Encrypted config unsupported";
				error.validationMessage = `This config contains an encrypted object at location \`$.${key}\` but no privateKey is configured. To support encrypted config, the Renovate administrator must configure a \`privateKey\` in Global Configuration.`;
				if (env.MEND_HOSTED === "true") error.validationMessage = `Mend-hosted Renovate Apps no longer support the use of encrypted secrets in Renovate file config (e.g. renovate.json).
Please migrate all secrets to the Developer Portal using the web UI available at https://developer.mend.io/

Refer to migration documents here: ${GlobalConfig.get("productLinks").documentation}mend-hosted/migrating-secrets/`;
				throw error;
			} else logger.error("Found encrypted data but no privateKey");
		}
		delete decryptedConfig.encrypted;
	} else if (isArray(val)) {
		decryptedConfig[key] = [];
		for (const [index, item] of val.entries()) if (isObject(item) && !isArray(item)) {
			const path = `${existingPath}.${key}[${index}]`;
			decryptedConfig[key].push(await decryptConfig(item, repository, path));
		} else decryptedConfig[key].push(item);
	} else if (isObject(val) && key !== "content") decryptedConfig[key] = await decryptConfig(val, repository, `${existingPath}.${key}`);
	delete decryptedConfig.encrypted;
	logger.trace({ config: decryptedConfig }, "decryptedConfig");
	return decryptedConfig;
}
function getAzureCollection() {
	if (GlobalConfig.get("platform") !== "azure") return;
	const endpoint = GlobalConfig.get("endpoint");
	const endpointUrl = parseUrl(endpoint);
	if (endpointUrl === null) {
		logger.warn({ endpoint }, "Unable to parse endpoint for token decryption");
		return;
	}
	const azureCollection = trimSlashes(endpointUrl.pathname);
	if (!isNonEmptyString(azureCollection)) {
		logger.debug({ endpoint }, "Unable to find azure collection name from URL");
		return;
	}
	if (azureCollection.startsWith("tfs/")) return azureCollection.substring(4);
	return azureCollection;
}
//#endregion
export { decryptConfig, getAzureCollection, setPrivateKeys, tryDecrypt, validateDecryptedValue };

//# sourceMappingURL=decrypt.js.map