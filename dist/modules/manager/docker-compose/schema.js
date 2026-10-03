import { isObject, isString } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/manager/docker-compose/schema.ts
const DockerComposeService = z.object({
	image: z.string().optional(),
	build: z.union([z.string(), z.object({
		context: z.string().optional(),
		dockerfile: z.string().optional()
	})]).optional()
});
const DockerComposeFileV1 = z.record(z.string(), DockerComposeService);
const DockerComposeFileModern = z.object({
	/**
	*  compose does not use this strictly, so we shouldn't be either
	*  https://docs.docker.com/compose/compose-file/04-version-and-name/#version-top-level-element
	*/
	version: z.string().optional(),
	services: z.record(z.string(), DockerComposeService)
}).catchall(z.unknown()).transform((obj) => {
	const { version, services, ...rest } = obj;
	let extensions;
	for (const key in rest) if (key.startsWith("x-")) {
		const value = rest[key];
		if (isObject(value) && "image" in value && isString(value.image)) {
			extensions ??= {};
			extensions[key] = { image: value.image };
		}
	}
	return {
		version,
		services,
		...extensions && { extensions }
	};
});
const DockerComposeFile = z.union([DockerComposeFileModern, DockerComposeFileV1]);
//#endregion
export { DockerComposeFile };

//# sourceMappingURL=schema.js.map