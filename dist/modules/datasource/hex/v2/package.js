import _m0 from "protobufjs/minimal.js";
//#region lib/modules/datasource/hex/v2/package.ts
const RetirementReason = {
	RETIRED_OTHER: 0,
	RETIRED_INVALID: 1,
	RETIRED_SECURITY: 2,
	RETIRED_DEPRECATED: 3,
	RETIRED_RENAMED: 4,
	UNRECOGNIZED: -1
};
function retirementReasonFromJSON(object) {
	switch (object) {
		case 0:
		case "RETIRED_OTHER": return RetirementReason.RETIRED_OTHER;
		case 1:
		case "RETIRED_INVALID": return RetirementReason.RETIRED_INVALID;
		case 2:
		case "RETIRED_SECURITY": return RetirementReason.RETIRED_SECURITY;
		case 3:
		case "RETIRED_DEPRECATED": return RetirementReason.RETIRED_DEPRECATED;
		case 4:
		case "RETIRED_RENAMED": return RetirementReason.RETIRED_RENAMED;
		default: return RetirementReason.UNRECOGNIZED;
	}
}
function createBasePackage() {
	return {
		releases: [],
		name: "",
		repository: ""
	};
}
const Package = {
	decode(input, length) {
		const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === void 0 ? reader.len : reader.pos + length;
		const message = createBasePackage();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) break;
					message.releases.push(Release.decode(reader, reader.uint32()));
					continue;
				case 2:
					if (tag !== 18) break;
					message.name = reader.string();
					continue;
				case 3:
					if (tag !== 26) break;
					message.repository = reader.string();
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) break;
			reader.skipType(tag & 7);
		}
		return message;
	},
	fromJSON(object) {
		return {
			releases: globalThis.Array.isArray(object?.releases) ? object.releases.map((e) => Release.fromJSON(e)) : [],
			name: isSet(object.name) ? globalThis.String(object.name) : "",
			repository: isSet(object.repository) ? globalThis.String(object.repository) : ""
		};
	},
	create(base) {
		return Package.fromPartial(base ?? {});
	},
	fromPartial(object) {
		const message = createBasePackage();
		message.releases = object.releases?.map((e) => Release.fromPartial(e)) || [];
		message.name = object.name ?? "";
		message.repository = object.repository ?? "";
		return message;
	}
};
function createBaseRelease() {
	return {
		version: "",
		innerChecksum: /* @__PURE__ */ new Uint8Array(0),
		dependencies: [],
		retired: void 0,
		outerChecksum: /* @__PURE__ */ new Uint8Array(0)
	};
}
const Release = {
	decode(input, length) {
		const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === void 0 ? reader.len : reader.pos + length;
		const message = createBaseRelease();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) break;
					message.version = reader.string();
					continue;
				case 2:
					if (tag !== 18) break;
					message.innerChecksum = reader.bytes();
					continue;
				case 3:
					if (tag !== 26) break;
					message.dependencies.push(Dependency.decode(reader, reader.uint32()));
					continue;
				case 4:
					if (tag !== 34) break;
					message.retired = RetirementStatus.decode(reader, reader.uint32());
					continue;
				case 5:
					if (tag !== 42) break;
					message.outerChecksum = reader.bytes();
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) break;
			reader.skipType(tag & 7);
		}
		return message;
	},
	fromJSON(object) {
		return {
			version: isSet(object.version) ? globalThis.String(object.version) : "",
			innerChecksum: isSet(object.innerChecksum) ? bytesFromBase64(object.innerChecksum) : /* @__PURE__ */ new Uint8Array(0),
			dependencies: globalThis.Array.isArray(object?.dependencies) ? object.dependencies.map((e) => Dependency.fromJSON(e)) : [],
			retired: isSet(object.retired) ? RetirementStatus.fromJSON(object.retired) : void 0,
			outerChecksum: isSet(object.outerChecksum) ? bytesFromBase64(object.outerChecksum) : /* @__PURE__ */ new Uint8Array(0)
		};
	},
	create(base) {
		return Release.fromPartial(base ?? {});
	},
	fromPartial(object) {
		const message = createBaseRelease();
		message.version = object.version ?? "";
		message.innerChecksum = object.innerChecksum ?? /* @__PURE__ */ new Uint8Array(0);
		message.dependencies = object.dependencies?.map((e) => Dependency.fromPartial(e)) || [];
		message.retired = object.retired !== void 0 && object.retired !== null ? RetirementStatus.fromPartial(object.retired) : void 0;
		message.outerChecksum = object.outerChecksum ?? /* @__PURE__ */ new Uint8Array(0);
		return message;
	}
};
function createBaseRetirementStatus() {
	return {
		reason: 0,
		message: ""
	};
}
const RetirementStatus = {
	decode(input, length) {
		const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === void 0 ? reader.len : reader.pos + length;
		const message = createBaseRetirementStatus();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 8) break;
					message.reason = reader.int32();
					continue;
				case 2:
					if (tag !== 18) break;
					message.message = reader.string();
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) break;
			reader.skipType(tag & 7);
		}
		return message;
	},
	fromJSON(object) {
		return {
			reason: isSet(object.reason) ? retirementReasonFromJSON(object.reason) : 0,
			message: isSet(object.message) ? globalThis.String(object.message) : ""
		};
	},
	create(base) {
		return RetirementStatus.fromPartial(base ?? {});
	},
	fromPartial(object) {
		const message = createBaseRetirementStatus();
		message.reason = object.reason ?? 0;
		message.message = object.message ?? "";
		return message;
	}
};
function createBaseDependency() {
	return {
		package: "",
		requirement: "",
		optional: false,
		app: "",
		repository: ""
	};
}
const Dependency = {
	decode(input, length) {
		const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === void 0 ? reader.len : reader.pos + length;
		const message = createBaseDependency();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) break;
					message.package = reader.string();
					continue;
				case 2:
					if (tag !== 18) break;
					message.requirement = reader.string();
					continue;
				case 3:
					if (tag !== 24) break;
					message.optional = reader.bool();
					continue;
				case 4:
					if (tag !== 34) break;
					message.app = reader.string();
					continue;
				case 5:
					if (tag !== 42) break;
					message.repository = reader.string();
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) break;
			reader.skipType(tag & 7);
		}
		return message;
	},
	fromJSON(object) {
		return {
			package: isSet(object.package) ? globalThis.String(object.package) : "",
			requirement: isSet(object.requirement) ? globalThis.String(object.requirement) : "",
			optional: isSet(object.optional) ? globalThis.Boolean(object.optional) : false,
			app: isSet(object.app) ? globalThis.String(object.app) : "",
			repository: isSet(object.repository) ? globalThis.String(object.repository) : ""
		};
	},
	create(base) {
		return Dependency.fromPartial(base ?? {});
	},
	fromPartial(object) {
		const message = createBaseDependency();
		message.package = object.package ?? "";
		message.requirement = object.requirement ?? "";
		message.optional = object.optional ?? false;
		message.app = object.app ?? "";
		message.repository = object.repository ?? "";
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
export { Dependency, Package, Release, RetirementReason, RetirementStatus, retirementReasonFromJSON };

//# sourceMappingURL=package.js.map