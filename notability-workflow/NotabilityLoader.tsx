import * as fs from "fs";
import * as unzipper from "unzipper";

export class NotabilityLoader {
	savePath: string;
	dropboxPath: string;
	dropboxURL = "https://content.dropboxapi.com/2/files/download_zip";
	token: string;

	constructor(savePath: string, dropboxPath: string, token: string) {
		this.savePath = savePath;
		this.token = token;
		this.dropboxPath = dropboxPath;
	}

	loadNotes() {
		this.postRequest(
			this.dropboxURL,
			{
				Authorization: "Bearer " + this.token,
				"Dropbox-API-Arg": '{"path":"' + this.dropboxPath + '"}',
			},
			this.savePath
		);
	}

	postRequest(url: string, headers: HeadersInit, path: string) {
		var request = new XMLHttpRequest();
		request.responseType = "blob";
		request.open("POST", url, true);
		for (var key in headers) {
			request.setRequestHeader(key, headers[key]);
		}

		request.onload = async function () {
			var blob = request.response;
			var fileName = "data.zip";
			const buffer = Buffer.from(await blob.arrayBuffer());
			fs.writeFile(path + "/" + fileName, buffer, () => {
				console.log("zip saved to " + path + "/" + fileName);
				fs.createReadStream(path + "/" + fileName).pipe(
					unzipper.Extract({
						path: path,
					})
				);
				console.log("files unzipped to " + path);
			});
		};

		request.send();
		return request;
	}
}
