import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	mySetting: string;
	quizColors: {
		correct: string;
		wrong: string;
		questionBg: string;
		buttonPrimary: string;
		resultsBg: string;
	};
	motivationalMessages: string[];
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	quizColors: {
		correct: '#22c55e',
		wrong: '#ef4444',
		questionBg: '#f093fb',
		buttonPrimary: '#667eea',
		resultsBg: '#a8edea'
	},
	motivationalMessages: [
		"Great Job!",
		"You're making progress!",
		"Keep it up!",
		"Excellent work!",
		"You're on fire!"
	]
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', {text: 'Quiz Colors'});

		new Setting(containerEl)
			.setName('Correct Answer Color')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.quizColors.correct)
				.onChange(async (value) => {
					this.plugin.settings.quizColors.correct = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Wrong Answer Color')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.quizColors.wrong)
				.onChange(async (value) => {
					this.plugin.settings.quizColors.wrong = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Question Background Color')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.quizColors.questionBg)
				.onChange(async (value) => {
					this.plugin.settings.quizColors.questionBg = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Primary Button Color')
			.addColorPicker(color => color
				.setValue(this.plugin.settings.quizColors.buttonPrimary)
				.onChange(async (value) => {
					this.plugin.settings.quizColors.buttonPrimary = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Motivational Messages')
			.setDesc('Comma-separated list of messages shown on correct answers')
			.addTextArea(text => text
				.setValue(this.plugin.settings.motivationalMessages.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.motivationalMessages = value.split(',').map(s => s.trim()).filter(s => s);
					await this.plugin.saveSettings();
				}));
	}
}
