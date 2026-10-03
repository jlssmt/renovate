import { openpgp } from "../../expose.js";
import { regEx } from "../../util/regex.js";
import { logger } from "../../logger/index.js";
//#region lib/config/decrypt/openpgp.ts
let pgp = void 0;
async function tryDecryptOpenPgp(privateKey, encryptedStr) {
	if (pgp === void 0) try {
		pgp = await openpgp();
	} catch (err) {
		logger.warn({ err }, "Could load openpgp");
		pgp = null;
	}
	if (pgp === null) {
		logger.once.warn("Cannot load openpgp, skipping decryption");
		return null;
	}
	try {
		const pk = await pgp.readPrivateKey({ armoredKey: privateKey.replace(regEx(/\n[ \t]+/g), "\n") });
		const startBlock = "-----BEGIN PGP MESSAGE-----\n\n";
		const endBlock = "\n-----END PGP MESSAGE-----";
		let armoredMessage = encryptedStr.trim();
		// v8 ignore else -- TODO: add test #40625
		if (!armoredMessage.startsWith(startBlock)) armoredMessage = `${startBlock}${armoredMessage}`;
		// v8 ignore else -- TODO: add test #40625
		if (!armoredMessage.endsWith(endBlock)) armoredMessage = `${armoredMessage}${endBlock}`;
		const message = await pgp.readMessage({ armoredMessage });
		const { data } = await pgp.decrypt({
			message,
			decryptionKeys: pk
		});
		logger.debug("Decrypted config using openpgp");
		return data;
	} catch (err) {
		logger.debug({ err }, "Could not decrypt using openpgp");
		return null;
	}
}
//#endregion
export { tryDecryptOpenPgp };

//# sourceMappingURL=openpgp.js.map