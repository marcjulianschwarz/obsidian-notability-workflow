//@ts-ignore
import * as fs from "fs";
import * as unzipper from "unzipper";

const umlautMapping = {
	ü: "\\u00fc",
	ö: "\\u00f6",
	ä: "\\u00e4",
	ß: "\\u00df",
	Ä: "\\u00c4",
	Ö: "\\u00d6",
	Ü: "\\u00dc",
};

export class NotabilityLoader {
	savePath: string;
	zipName: string = "data.zip";
	vaultPath: string;
	dropboxPath: string;
	dropboxZipURL = "https://content.dropboxapi.com/2/files/download_zip";
	dropboxSingleFileURL = "https://content.dropboxapi.com/2/files/download";
	listFolderURL = "https://api.dropboxapi.com/2/files/list_folder";
	token: string;

	constructor(
		vaultPath: string,
		savePath: string,
		dropboxPath: string,
		token: string
	) {
		this.savePath = savePath;
		this.vaultPath = vaultPath;
		this.token = token;
		this.dropboxPath = dropboxPath;
	}

	httpSafeString(str: string) {
		return str.replace(/[^a-zA-Z0-9]/g, (c) => {
			return umlautMapping[c] || c;
		});
	}

	async updateNote(path: string) {
		const response = await window.fetch(this.dropboxSingleFileURL, {
			method: "POST",
			headers: {
				Authorization: "Bearer " + this.token,
				"Dropbox-API-Arg":
					'{"path":"' + this.httpSafeString(path) + '"}',
			},
		});

		const blob = await response.blob();
		//@ts-ignore
		const buffer = Buffer.from(await blob.arrayBuffer());
		fs.writeFile(this.savePath + "/" + path, buffer, () => {
			console.log("file updated at " + path);
		});
	}

	isDataLoaded() {
		return fs.existsSync(this.savePath + "/" + this.zipName);
	}

	async updateNotes(savePath: string) {
		const response = await window.fetch(this.listFolderURL, {
			method: "POST",
			headers: {
				Authorization: "Bearer " + this.token,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				path: "/" + this.dropboxPath,
				recursive: true,
			}),
		});

		const data = await response.json();
		const files = data.entries;
		files.forEach((file) => {
			if (file.name.endsWith(".pdf")) {
				let serverTime = new Date(file.server_modified);

				if (fs.existsSync(savePath + "/" + file.path_display)) {
					const { mtime } = fs.statSync(savePath + file.path_display);
					let localTime = new Date(mtime);

					if (serverTime > localTime) {
						console.log(file.name);
						console.log("Server is newer, updating file");
						this.updateNote(file.path_display);
					}
				} else {
					this.updateNote(file.path_display);
				}
			}
		});
	}

	loadNotes() {
		if (this.isDataLoaded()) {
			console.log("data already loaded, updating changed files");
			this.updateNotes(this.savePath);
		} else {
			console.log("initial load of data");
			this.loadAllNotes();
		}
	}

	async loadAllNotes() {
		const response = await window.fetch(this.dropboxZipURL, {
			method: "POST",
			headers: {
				Authorization: "Bearer " + this.token,
				"Dropbox-API-Arg": '{"path":"/' + this.dropboxPath + '"}',
			},
		});

		const blob = await response.blob();
		//@ts-ignore
		const buffer = Buffer.from(await blob.arrayBuffer());
		const filename = this.zipName;

		fs.writeFile(this.savePath + "/" + filename, buffer, () => {
			console.log("zip saved to " + this.savePath + "/" + filename);
			fs.createReadStream(this.savePath + "/" + filename).pipe(
				unzipper.Extract({
					path: this.savePath,
				})
			);
			console.log("files unzipped to " + this.savePath);
		});
	}
}
