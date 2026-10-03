import _m0 from "protobufjs/minimal.js";
//#region lib/modules/datasource/hex/v2/signed.ts
function createBaseSigned() {
	return {
		payload: /* @__PURE__ */ new Uint8Array(0),
		signature: /* @__PURE__ */ new Uint8Array(0)
	};
}
const Signed = {
	decode(input, length) {
		const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === void 0 ? reader.len : reader.pos + length;
		const message = createBaseSigned();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) break;
					message.payload = reader.bytes();
					continue;
				case 2:
					if (tag !== 18) break;
					message.signature = reader.bytes();
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) break;
			reader.skipType(tag & 7);
		}
		return message;
	},
	fromJSON(object) {
		return {
			payload: isSet(object.payload) ? bytesFromBase64(object.payload) : /* @__PURE__ */ new Uint8Array(0),
			signature: isSet(object.signature) ? bytesFromBase64(object.signature) : /* @__PURE__ */ new Uint8Array(0)
		};
	},
	create(base) {
		return Signed.fromPartial(base ?? {});
	},
	fromPartial(object) {
		const message = createBaseSigned();
		message.payload = object.payload ?? /* @__PURE__ */ new Uint8Array(0);
		message.signature = object.signature ?? /* @__PURE__ */ new Uint8Array(0);
		return message;
	}
};
function bytesFromBase64(b64) {
	if (globalThis.Buffer) return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
	else {
		const bin = globalThis.atob(b64);
		const arr = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; ++i) arr[i] = bin.charCodeAt(i);
		return arr;
	}
}
function isSet(value) {
	return value !== null && value !== void 0;
}
//#endregion
export { Signed };

//# sourceMappingURL=signed.js.map