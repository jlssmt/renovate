import { coerceArray } from "../../../util/array.js";
import { find } from "../../../util/host-rules.js";
import { id } from "../../versioning/aws-machine-image/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { DescribeImagesCommand, EC2Client } from "@aws-sdk/client-ec2";
//#region lib/modules/datasource/aws-machine-image/index.ts
var AwsMachineImageDatasource = class AwsMachineImageDatasource extends Datasource {
	static id = "aws-machine-image";
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `CreationDate` field in the results.";
	defaultConfig = {
		commitMessageExtra: "to {{{newVersion}}}",
		prBodyColumns: ["Change", "Image"],
		prBodyDefinitions: { Image: "```{{{newDigest}}}```" },
		digest: {
			commitMessageExtra: "to {{{newDigest}}}",
			prBodyColumns: ["Image"],
			prBodyDefinitions: { Image: "```{{{newDigest}}}```" }
		}
	};
	now;
	constructor() {
		super(AwsMachineImageDatasource.id);
		this.now = Date.now();
	}
	isAmiFilter(config) {
		return "Name" in config && "Values" in config;
	}
	getEC2Client(config) {
		const { profile, region } = config;
		const { password, token, username } = find({ hostType: AwsMachineImageDatasource.id });
		return new EC2Client({
			region,
			credentials: username && password ? {
				accessKeyId: username,
				secretAccessKey: password,
				sessionToken: token
			} : fromNodeProviderChain({ profile })
		});
	}
	getAmiFilterCommand(filter) {
		return new DescribeImagesCommand({ Filters: filter });
	}
	loadConfig(serializedAmiFilter) {
		const parsedConfig = JSON.parse(serializedAmiFilter);
		const filters = [];
		let config = {};
		for (const elem of parsedConfig) if (this.isAmiFilter(elem)) filters.push(elem);
		else config = Object.assign(config, elem);
		return [filters, config];
	}
	async fetchSortedAwsMachineImages(serializedAmiFilter) {
		const [amiFilter, clientConfig] = this.loadConfig(serializedAmiFilter);
		const amiFilterCmd = this.getAmiFilterCommand(amiFilter);
		const matchingImages = await this.getEC2Client(clientConfig).send(amiFilterCmd);
		matchingImages.Images = coerceArray(matchingImages.Images);
		return matchingImages.Images.sort((image1, image2) => {
			return (image1.CreationDate ? Date.parse(image1.CreationDate) : /* v8 ignore next -- AWS SDK types CreationDate as optional, but EC2 always returns it for images */ 0) - (image2.CreationDate ? Date.parse(image2.CreationDate) : /* v8 ignore next -- AWS SDK types CreationDate as optional, but EC2 always returns it for images */ 0);
		});
	}
	getSortedAwsMachineImages(serializedAmiFilter) {
		return this.cached({ key: `getSortedAwsMachineImages:${serializedAmiFilter}` }, () => this.fetchSortedAwsMachineImages(serializedAmiFilter));
	}
	async fetchDigest({ packageName: serializedAmiFilter }, newValue) {
		const images = await this.getSortedAwsMachineImages(serializedAmiFilter);
		if (images.length < 1) return null;
		if (newValue) {
			const newValueMatchingImages = images.filter((image) => image.ImageId === newValue);
			if (newValueMatchingImages.length === 1 && newValueMatchingImages[0].Name) return newValueMatchingImages[0].Name;
			return null;
		}
		return images.at(-1).Name ?? null;
	}
	getDigest(config, newValue) {
		return this.cached({
			key: `getDigest:${config.packageName}:${newValue ?? ""}`,
			fallback: true
		}, () => this.fetchDigest(config, newValue));
	}
	async fetchReleases({ packageName: serializedAmiFilter }) {
		const images = await this.getSortedAwsMachineImages(serializedAmiFilter);
		if (!images.length || !images.at(-1).ImageId) return null;
		return { releases: images.map((image) => ({
			version: image.ImageId,
			releaseTimestamp: asTimestamp(image.CreationDate),
			isDeprecated: Date.parse(image.DeprecationTime ?? this.now.toString()) < this.now,
			newDigest: image.Name
		})) };
	}
	getReleases(config) {
		return this.cached({
			key: `getReleases:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { AwsMachineImageDatasource };

//# sourceMappingURL=index.js.map