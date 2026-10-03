import { PLATFORM_GPG_FAILED } from "../../constants/error-messages.js";
import { newlineRegex, regEx } from "../regex.js";
import { fromBase64, toBase64 } from "../string.js";
import { addSecretForSanitizing } from "../sanitize.js";
import { logger } from "../../logger/index.js";
import { exec } from "../exec/index.js";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
import fs from "fs-extra";
import upath from "upath";
import os from "node:os";
//#region lib/util/git/private-key.ts
const sshKeyRegex = regEx(/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----.*?-----END (?:[A-Z]+ )?PRIVATE KEY-----/, "s");
let gitPrivateKey;
/**
* Decodes Base64 string if roundtrip encoding matches
*/
function tryBase64(value) {
	const decodedValue = fromBase64(value);
	if (value !== toBase64(decodedValue)) return null;
	return decodedValue;
}
var PrivateKey = class {
	key;
	passphrase;
	keyId;
	constructor(key, passphrase) {
		const decodedKey = tryBase64(key);
		if (decodedKey) {
			this.key = decodedKey;
			addSecretForSanitizing(key, "global");
			logger.debug("gitPrivateKey: decoded key from Base64");
		} else this.key = key;
		addSecretForSanitizing(this.key, "global");
		this.passphrase = passphrase;
		if (this.passphrase) addSecretForSanitizing(this.passphrase, "global");
		logger.debug("gitPrivateKey: successfully set (but not yet written/configured)");
	}
	async writeKey() {
		try {
			this.keyId ??= await this.importKey();
			logger.debug("gitPrivateKey: imported");
		} catch (err) {
			logger.warn({ err }, "gitPrivateKey: error importing");
			throw new Error(PLATFORM_GPG_FAILED);
		}
	}
	async configSigningKey(cwd) {
		logger.debug("gitPrivateKey: configuring commit signing");
		await exec(`git config user.signingkey ${this.keyId}`, { cwd });
		await exec(`git config commit.gpgsign true`, { cwd });
		await exec(`git config gpg.format ${this.gpgFormat}`, { cwd });
	}
};
var GPGKey = class extends PrivateKey {
	gpgFormat = "openpgp";
	constructor(key, passphrase) {
		super(key.trim(), passphrase);
		if (passphrase) logger.warn("Passphrase is not yet supported for GPG keys, it will be ignored");
	}
	async importKey() {
		const keyFileName = upath.join(`${os.tmpdir()}/git-private-gpg.key`);
		await fs.outputFile(keyFileName, this.key);
		const { stdout, stderr } = await exec(`gpg --batch --no-tty --import ${keyFileName}`);
		logger.debug({
			stdout,
			stderr
		}, "Private key import result");
		await fs.remove(keyFileName);
		return `${stdout}${stderr}`.split(newlineRegex).find((line) => line.includes("secret key imported"))?.replace("gpg: key ", "").split(":").shift();
	}
};
var SSHKey = class extends PrivateKey {
	gpgFormat = "ssh";
	async importKey() {
		const keyFileName = upath.join(`${os.tmpdir()}/git-private-ssh.key`);
		await fs.outputFile(keyFileName, this.key.replace(regEx(/\n?$/), "\n"));
		/* v8 ignore next -- not easily testable */
		process.on("exit", () => fs.rmSync(keyFileName, { force: true }));
		await fs.chmod(keyFileName, 384);
		if (this.passphrase) await exec(`ssh-keygen -p -f ${keyFileName} -P "${this.passphrase}" -N ""`);
		const { stdout } = await exec(`ssh-keygen -y -f ${keyFileName}`);
		const pubFileName = `${keyFileName}.pub`;
		await fs.outputFile(pubFileName, stdout);
		/* v8 ignore next -- not easily testable */
		process.on("exit", () => fs.rmSync(pubFileName, { force: true }));
		return keyFileName;
	}
};
function getPrivateKeyFormat(key) {
	return sshKeyRegex.test(key) ? "ssh" : "gpg";
}
function createPrivateKey(key, passphrase) {
	switch (getPrivateKeyFormat(key)) {
		case "gpg":
			logger.debug("gitPrivateKey: GPG key detected");
			return new GPGKey(key, passphrase);
		case "ssh":
			logger.debug("gitPrivateKey: SSH key detected");
			return new SSHKey(key, passphrase);
	}
}
function setPrivateKey(key, passphrase) {
	if (!isNonEmptyStringAndNotWhitespace(key)) return;
	gitPrivateKey = createPrivateKey(key, passphrase);
}
async function writePrivateKey() {
	await gitPrivateKey?.writeKey();
}
async function configSigningKey(cwd) {
	await gitPrivateKey?.configSigningKey(cwd);
}
//#endregion
export { configSigningKey, setPrivateKey, writePrivateKey };

//# sourceMappingURL=private-key.js.map