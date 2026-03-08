import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";
import { QuizParserFixed } from "./quizParser"; // Import the fixed QuizParser class
import { QuizView } from "./quizView";

export default class HelloWorldPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log("[Quizzer] onload called");
		await this.loadSettings();

		// Register the quiz view
		this.registerView("quiz-view", (leaf) => new QuizView(leaf, this.app, this));

		this.addRibbonIcon('dice', 'Greet', () => {
			new Notice('Hello, world!');
		});


		
		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', 'Quizzer', (evt: MouseEvent) => {
			// Open the quiz view in a new leaf
			this.app.workspace.getLeaf(true).setViewState({ type: "quiz-view" });
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample editor command');
			}
		});
		this.addCommand({
			id: "test-parser",
			name: "Test Quiz Parser",
			callback: async () => {
				console.log("[Quizzer] running test-parser");
				const parser = new QuizParserFixed(this.app, this.app.vault);
				const notes = await parser.getNoteswithQuizTag();
				const quizzes = await parser.extractQuizzesFromNotes(notes);
				console.log("Test result:", quizzes);
			}
		});
		console.log("[Quizzer] registered test-parser command");
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			new Notice("Click");
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}








class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
