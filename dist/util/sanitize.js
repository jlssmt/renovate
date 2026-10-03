import { toBase64 } from "./string.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/util/sanitize.ts
const globalSecrets = /* @__PURE__ */ new Set();
const repoSecrets = /* @__PURE__ */ new Set();
const redactedFields = [
	"authorization",
	"token",
	"githubAppKey",
	"npmToken",
	"npmrc",
	"privateKey",
	"privateKeyOld",
	"gitPrivateKey",
	"forkToken",
	"password",
	"httpsCertificate",
	"httpsPrivateKey",
	"httpsCertificateAuthority"
];
function sanitize(input) {
	if (!input) return input;
	let output = input;
	[globalSecrets, repoSecrets].forEach((secrets) => {
		secrets.forEach((secret) => {
			while (output.includes(secret)) output = output.replace(secret, "**redacted**");
		});
	});
	return output;
}
const GITHUB_APP_TOKEN_PREFIX = "x-access-token:";
function addSecretForSanitizing(secret, type = "repo") {
	if (!isNonEmptyString(secret)) return;
	const secrets = type === "repo" ? repoSecrets : globalSecrets;
	secrets.add(secret);
	secrets.add(toBase64(secret));
	if (secret.startsWith(GITHUB_APP_TOKEN_PREFIX)) {
		const trimmedSecret = secret.replace(GITHUB_APP_TOKEN_PREFIX, "");
		secrets.add(trimmedSecret);
		secrets.add(toBase64(trimmedSecret));
	}
}
function clearRepoSanitizedSecretsList() {
	repoSecrets.clear();
}
//#endregion
export { addSecretForSanitizing, clearRepoSanitizedSecretsList, redactedFields, sanitize };

//# sourceMappingURL=sanitize.js.map