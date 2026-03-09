import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";
import { QuizParserFixed } from "./quizParser";
import { QuizView } from "./quizView";

export default class QuizzerPlugin extends Plugin {

settings: MyPluginSettings;

async onload() {

		console.log("[Quizzer] loading plugin");

		await this.loadSettings();

		// Register the quiz view
		this.registerView("quiz-view", (leaf) => new QuizView(leaf, this));

		// Ribbon icon to open quiz
		this.addRibbonIcon("dice", "Open Quizzer", () => {
			this.app.workspace.getLeaf(true).setViewState({
				type: "quiz-view"
			});
		});

		// Command palette entry
		this.addCommand({
			id: "open-quizzer",
			name: "Open Quizzer",
			callback: () => {
				this.app.workspace.getLeaf(true).setViewState({
					type: "quiz-view"
				});
			}
		});

		// Optional: parser debug command
		this.addCommand({
			id: "quizzer-test-parser",
			name: "Quizzer: Test Parser",
			callback: async () => {

				const parser = new QuizParserFixed(this.app, this.app.vault);

				const notes = await parser.getNoteswithQuizTag();
				const quizzes = await parser.extractQuizzesFromNotes(notes);

				console.log("[Quizzer] parser test result:", quizzes);
			}
		});

		// Settings tab
		this.addSettingTab(new SampleSettingTab(this.app, this));

		console.log("[Quizzer] plugin loaded");
	}

	onunload() {
		console.log("[Quizzer] plugin unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData() as Partial<MyPluginSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
