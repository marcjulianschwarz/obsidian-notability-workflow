import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	FileSystemAdapter,
} from "obsidian";

//@ts-ignore
import { NotabilityLoader } from "./NotabilityLoader";
import * as fs from "fs";

interface NotabilityWorkflowSetting {
	saveFolder: string;
}

const DEFAULT_SETTINGS: NotabilityWorkflowSetting = {
	saveFolder: "/",
};

export default class NotabilityWorkflow extends Plugin {
	settings: NotabilityWorkflowSetting;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "load-notability-files",
			name: "Load Notability Files",
			callback: () => {
				let path = this.getVaultPath() + "/" + this.settings.saveFolder;
				new NotabilityLoader(path).loadNotes();
			},
		});

		this.addCommand({
			id: "link-notability-files",
			name: "Link Notability Files",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());

				var walk = function (dir: string) {
					var results: string[] = [];
					var list = fs.readdirSync(dir);
					list.forEach(function (file: string) {
						file = dir + "/" + file;
						var stat = fs.statSync(file);
						if (stat && stat.isDirectory()) {
							results = results.concat(walk(file));
						} else {
							results.push(file);
						}
					});
					return results;
				};

				let files = walk(
					this.getVaultPath() + this.settings.saveFolder
				);

				let content = "";
				files.forEach((file) => {
					let filename = file.split("/").pop();
					if (filename.endsWith(".pdf")) {
						content +=
							"- [" +
							filename +
							"](file://" +
							encodeURI(file) +
							")\n";
					}
				});

				editor.replaceSelection(content);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new NotabilityWorkflowTab(this.app, this));
	}

	getVaultPath() {
		let adapter = app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			return adapter.getBasePath();
		}
		return null;
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class NotabilityWorkflowTab extends PluginSettingTab {
	plugin: NotabilityWorkflow;

	constructor(app: App, plugin: NotabilityWorkflow) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", {
			text: "Settings for Notability Workflow",
		});

		new Setting(containerEl)
			.setName("Save Folder")
			.setDesc("PDFs will be saved here.")
			.addText((text) =>
				text
					.setPlaceholder("")
					.setValue(this.plugin.settings.saveFolder)
					.onChange(async (value) => {
						this.plugin.settings.saveFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
