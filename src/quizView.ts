import{ItemView, WorkspaceLeaf, TFile, Notice}from "obsidian";
import {QuizParserFixed}from "./quizParser";
import {Question, MultipleChoiceQuestion, InputQuestion }from "./types";

type Step = "config" | "quiz" | "result";

interface QuizResult {
question: Question;
selected: number[] | string[];
correct: boolean;
}

export class QuizView extends ItemView {

private parser: QuizParserFixed;
private step: Step = "config";

private config = {
tags: "",
questionLimit: "",
instantFeedback: false,
questionTypes: ["mc"] as string[]
};

private questions: Question[] = [];
private currentQuestionIndex = 0;
private results: QuizResult[] = [];

constructor(leaf: WorkspaceLeaf, private plugin: any) {
        super(leaf);
        this.parser = new QuizParserFixed(this.app, this.app.vault);
    }

    getViewType(): string {
        return "quiz-view";
    }

    getDisplayText(): string {
        return "Quizzer";
    }

    async onOpen() {
        this.render();
    }

    private render() {

        const container = this.containerEl.children[1];
        if (!container) return;

        container.empty();

        switch (this.step) {

            case "config":
                this.renderConfig(container);
                break;

            case "quiz":
                this.renderQuiz(container);
                break;

            case "result":
                this.renderResult(container);
                break;
        }
    }

    private renderConfig(container: Element) {

        container.createEl("h4", { text: "Quiz Configuration" });

        const button = container.createEl("button", {
            text: "Start Quiz"
        });

        button.onclick = async () => {

            this.questions = await this.loadQuizzes();

            if (this.questions.length === 0) {
                new Notice("No quiz questions found.");
                return;
            }

            this.step = "quiz";
            this.currentQuestionIndex = 0;
            this.results = [];

            this.render();
        };
    }

    private renderQuiz(container: Element) {

        const question = this.questions[this.currentQuestionIndex];

        if (!question) return;

        container.createEl("div", {
            text: `Question ${this.currentQuestionIndex + 1} / ${this.questions.length}`
        });

        container.createEl("div", {
            text: question.question,
            cls: "quiz-question"
        });

        if (question.type === "mc") {

            const q = question as MultipleChoiceQuestion;

            const selected: number[] = [];

            const form = container.createEl("form");

            q.options.forEach((opt, index) => {

                const label = form.createEl("label");

                const checkbox = label.createEl("input", {
                    type: "checkbox"
                });

                checkbox.onchange = () => {

                    if (checkbox.checked) {
                        selected.push(index);
                    } else {
                        const i = selected.indexOf(index);
                        if (i !== -1) selected.splice(i, 1);
                    }
                };

                label.createSpan({ text: opt.text });
            });

            const btn = container.createEl("button", {
                text: "Confirm"
            });

            btn.onclick = () => {
                this.confirmAnswer(question, selected);
            };
        }

        if (question.type === "input") {

            const input = container.createEl("input", {
                type: "text"
            });

            const btn = container.createEl("button", {
                text: "Confirm"
            });

            btn.onclick = () => {
                this.confirmAnswer(question, input.value);
            };
        }
    }

    private confirmAnswer(question: Question, selected: number[] | string) {

        let correct = false;
        let selectedResult: number[] | string[];

        if (question.type === "mc") {

            const q = question as MultipleChoiceQuestion;

            const selectedIdx = selected as number[];

            selectedResult = selectedIdx;

            const correctIdx = q.options
                .map((o, i) => o.correct ? i : -1)
                .filter(i => i !== -1);

            correct =
                selectedIdx.length === correctIdx.length &&
                selectedIdx.every(i => correctIdx.includes(i));
        }
        else {

            const q = question as InputQuestion;

            const answer = (selected as string).trim().toLowerCase();

            selectedResult = [answer];

            correct = q.options.some(opt =>
                answer === opt.trim().toLowerCase()
            );
        }

        this.results.push({
            question,
            selected: selectedResult,
            correct
        });

        this.nextQuestion();
    }

    private nextQuestion() {

        this.currentQuestionIndex++;

        if (this.currentQuestionIndex >= this.questions.length) {
            this.step = "result";
        }

        this.render();
    }

    private renderResult(container: Element) {

        const correct = this.results.filter(r => r.correct).length;
        const total = this.results.length;

        container.createEl("h3", {
            text: `Score ${correct}/${total}`
        });

        const restart = container.createEl("button", {
            text: "Restart"
        });

        restart.onclick = () => {

            this.step = "config";
            this.render();
        };
    }

    private async loadQuizzes(): Promise<Question[]> {

        const tags = this.config.tags
            .split(",")
            .map(t => t.trim())
            .filter(Boolean);

        let questions: Question[] = [];

        if (tags.length === 0) {

            const notes = await this.parser.getNoteswithQuizTag();
            questions = await this.parser.extractQuizzesFromNotes(notes);

        } else {

            const topicQuestions: Record<string, Question[]> = {};

            for (const tag of tags) {

                const notes = await this.getNotesWithTag(tag);
                const qs = await this.parser.extractQuizzesFromNotes(notes);

                topicQuestions[tag] = qs;
            }

            const combined: Question[] = [];

            for (const tag of tags) {

                const qs = topicQuestions[tag] ?? [];

                combined.push(...qs);
            }

            questions = this.shuffleArray(combined);
        }

        return questions;
    }

    private async getNotesWithTag(tag: string): Promise<TFile[]> {

        const notes = await this.parser.getNoteswithQuizTag();

        return notes.filter(note => {

            const cache = this.app.metadataCache.getFileCache(note);

            const tags = cache?.tags?.map(t => t.tag.replace("#", "")) ?? [];

            return tags.includes(tag);
        });
    }

	private shuffleArray<T>(array: T[]): T[] {

		const shuffled = [...array];

		for (let i = shuffled.length - 1; i > 0; i--) {

			const j = Math.floor(Math.random() * (i + 1));

			const temp = shuffled[i]!;
			shuffled[i] = shuffled[j]!;
			shuffled[j] = temp;
		}

		return shuffled;
	}

	private levenshteinDistance(a: string, b: string): number {

		const matrix: number[][] = [];

		for (let i = 0; i <= b.length; i++) {
			matrix[i] = new Array(a.length + 1).fill(0);
		}

		for (let i = 0; i <= b.length; i++) {
			matrix[i]![0] = i;
		}

		for (let j = 0; j <= a.length; j++) {
			matrix[0]![j] = j;
		}

		for (let i = 1; i <= b.length; i++) {

			for (let j = 1; j <= a.length; j++) {

				if (b[i - 1] === a[j - 1]) {
					matrix[i]![j] = matrix[i - 1]![j - 1]!;
				} else {

					matrix[i]![j] = Math.min(
						matrix[i - 1]![j - 1]! + 1,
						matrix[i]![j - 1]! + 1,
						matrix[i - 1]![j]! + 1
					);
				}
			}
		}

		return matrix[b.length]![a.length]!;
	}
}
