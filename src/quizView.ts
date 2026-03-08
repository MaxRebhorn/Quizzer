import { ItemView, WorkspaceLeaf, TFile } from "obsidian";
import { QuizParserFixed } from "./quizParser";
import { Question, QuizOption, MultipleChoiceQuestion } from "./types";

type Step = 'config' | 'quiz' | 'result';

interface QuizResult {
    question: Question;
    selected: number[];
    correct: boolean;
}

export class QuizView extends ItemView {
    private parser: QuizParserFixed;
    private step: Step = 'config';
    private config = { 
        tags: '', 
        questionLimit: '', 
        instantFeedback: false,
        questionTypes: ['mc'] as string[]
    };
    private questions: Question[] = [];
    private currentQuestionIndex = 0;
    private results: QuizResult[] = [];

    // Type display name mapping
    private typeDisplayNames: { [key: string]: string } = {
        'mc': 'Multiple Choice',
        'input': 'Input/Text Answer'
    };

    constructor(leaf: WorkspaceLeaf, private plugin: any) {
        super(leaf);
        this.parser = new QuizParserFixed(this.app, this.app.vault);
    }

    private getTypeDisplayName(type: string): string {
        return this.typeDisplayNames[type] || type;
    }

    getViewType(): string {
        return "quiz-view";
    }

    getDisplayText(): string {
        return "Quizzer";
    }

    async onOpen() {
        this.updateCSSVariables();
        this.render();
    }

    private render() {
        const container = this.containerEl.children[1];
        if (!container) return;

        container.empty();

        switch (this.step) {
            case 'config':
                this.renderConfig(container);
                break;
            case 'quiz':
                this.renderQuiz(container);
                break;
            case 'result':
                this.renderResult(container);
                break;
        }
    }

    private renderConfig(container: Element) {
        container.createEl("h4", { text: "Quizzer - Configuration" });
        
        const form = container.createEl("div", { cls: "config-form" });
        
        // Tags
        const tagsDiv = form.createEl("div", { cls: "config-item" });
        tagsDiv.createEl("label", { text: "Tags (comma-separated, leave empty for all):" });
        const tagsInput = tagsDiv.createEl("input", { type: "text", placeholder: "e.g., math, history" });
        (tagsInput as HTMLInputElement).setAttribute("list", "tag-list");
        tagsInput.value = this.config.tags;
        tagsInput.addEventListener("input", (e) => {
            this.config.tags = (e.target as HTMLInputElement).value;
        });
        
        // Create datalist for autocomplete
        const datalist = container.createEl("datalist", { attr: { id: "tag-list" } });
        const allTags = this.getAllTags();
        allTags.forEach(tag => {
            datalist.createEl("option", { attr: { value: tag } });
        });
        
        // Question limit
        const limitDiv = form.createEl("div", { cls: "config-item" });
        limitDiv.createEl("label", { text: "Question limit (leave empty for all):" });
        const limitInput = limitDiv.createEl("input", { type: "number", placeholder: "e.g., 10" });
        limitInput.value = this.config.questionLimit;
        limitInput.addEventListener("input", (e) => {
            this.config.questionLimit = (e.target as HTMLInputElement).value;
        });
        
        // Instant feedback
        const feedbackDiv = form.createEl("div", { cls: "config-item" });
        const feedbackLabel = feedbackDiv.createEl("label");
        const feedbackCheckbox = feedbackLabel.createEl("input", { type: "checkbox" });
        feedbackCheckbox.checked = this.config.instantFeedback;
        feedbackCheckbox.addEventListener("change", (e) => {
            this.config.instantFeedback = (e.target as HTMLInputElement).checked;
        });
        feedbackLabel.createEl("span", { text: " Instant feedback (show results immediately after each question)" });
        
        // Question types
        const typesDiv = form.createEl("div", { cls: "config-item" });
        typesDiv.createEl("label", { text: "Question types:" });
        const availableTypes = ['mc', 'input']; // TODO: make dynamic
        availableTypes.forEach(type => {
            const typeLabel = typesDiv.createEl("label");
            const typeCheckbox = typeLabel.createEl("input", { type: "checkbox" });
            typeCheckbox.checked = this.config.questionTypes.includes(type);
            typeCheckbox.addEventListener("change", (e) => {
                if ((e.target as HTMLInputElement).checked) {
                    this.config.questionTypes.push(type);
                } else {
                    const idx = this.config.questionTypes.indexOf(type);
                    if (idx > -1) this.config.questionTypes.splice(idx, 1);
                }
            });
            typeLabel.createEl("span", { text: ` ${this.getTypeDisplayName(type)}` });
            typesDiv.createEl("br");
        });
        
        const button = container.createEl("button", { text: "Start Quiz", cls: "quiz-start-btn" });
        button.addEventListener("click", async () => {
            this.questions = await this.loadQuizzes();
            if (this.questions.length === 0) {
                alert("No questions found with the specified criteria.");
                return;
            }
            this.step = 'quiz';
            this.currentQuestionIndex = 0;
            this.results = [];
            this.render();
        });
    }

    private getAllTags(): string[] {
        // Get all tags from the vault
        const allFiles = this.app.vault.getMarkdownFiles();
        const tagSet = new Set<string>();
        allFiles.forEach(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            cache?.tags?.forEach(tag => {
                tagSet.add(tag.tag.slice(1));
            });
        });
        return Array.from(tagSet);
    }
    
    private updateCSSVariables() {
        if (!this.plugin || !this.plugin.settings) return;
        const colors = this.plugin.settings.quizColors;
        const root = document.documentElement;
        root.style.setProperty('--quiz-correct-color', colors.correct);
        root.style.setProperty('--quiz-wrong-color', colors.wrong);
        root.style.setProperty('--quiz-question-bg', colors.questionBg);
        root.style.setProperty('--quiz-button-primary', colors.buttonPrimary);
        root.style.setProperty('--quiz-results-bg', colors.resultsBg);
    }

    private renderQuiz(container: Element) {
        if (this.currentQuestionIndex >= this.questions.length) return;

        const question = this.questions[this.currentQuestionIndex]!;
        container.createEl("div", { text: `Question ${this.currentQuestionIndex + 1} of ${this.questions.length}`, cls: "quiz-progress" });
        const questionDiv = container.createEl("div", { text: question.question, cls: "quiz-question" });

        if (question.type === "mc") {
            const mcQuestion = question as MultipleChoiceQuestion;
            const form = container.createEl("form");
            const selected: number[] = [];
            
            mcQuestion.options.forEach((option, index) => {
                const label = form.createEl("label", { cls: "quiz-option" });
                const checkbox = label.createEl("input", { type: "checkbox" });
                checkbox.addEventListener("change", (e) => {
                    if ((e.target as HTMLInputElement).checked) {
                        selected.push(index);
                    } else {
                        const idx = selected.indexOf(index);
                        if (idx > -1) selected.splice(idx, 1);
                    }
                });
                label.createEl("span", { text: option.text });
            });

            const confirmButton = container.createEl("button", { text: "Confirm Answer", cls: "quiz-confirm-btn" });
            confirmButton.addEventListener("click", () => {
                this.confirmAnswer(question, selected);
            });
        } else if (question.type === "input") {
            const inputQuestion = question as InputQuestion;
            const input = container.createEl("input", { type: "text", placeholder: "Enter your answer", cls: "quiz-input" });
            const confirmButton = container.createEl("button", { text: "Confirm Answer", cls: "quiz-confirm-btn" });
            confirmButton.addEventListener("click", () => {
                this.confirmAnswer(question, input.value);
            });
        }
    }

    private confirmAnswer(question: Question, selected: number[] | string) {
        const container = this.containerEl.children[1];
        if (!container) return;

        let isCorrect = false;

        if (question.type === "mc") {
            const mcQuestion = question as MultipleChoiceQuestion;
            
            if (mcQuestion.minimum) {
                // Weighted mode
                const selectedWeight = (selected as number[]).reduce((sum, idx) => {
                    return sum + (mcQuestion.options[idx]?.weight || 0);
                }, 0);
                
                let requiredWeight: number;
                if (mcQuestion.minimum === "all") {
                    // Calculate total weight of correct answers
                    requiredWeight = mcQuestion.options.filter(o => o.correct).reduce((sum, o) => sum + (o.weight || 0), 0);
                } else {
                    requiredWeight = mcQuestion.minimum;
                }
                
                isCorrect = selectedWeight >= requiredWeight;
            } else {
                // Regular mode: selected must exactly match correct answers
                const correctIndices = mcQuestion.options.map((o, i) => o.correct ? i : -1).filter(i => i !== -1);
                isCorrect = (selected as number[]).length === correctIndices.length && (selected as number[]).every(s => correctIndices.includes(s));
            }
        } else if (question.type === "input") {
            const inputQuestion = question as InputQuestion;
            const userAnswer = (selected as string).trim().toLowerCase();
            isCorrect = inputQuestion.options.some(option => {
                const correctAnswer = option.trim().toLowerCase();
                if (inputQuestion.fuzzy) {
                    return this.fuzzyMatch(userAnswer, correctAnswer);
                } else {
                    return userAnswer === correctAnswer;
                }
            });
        }

        this.results.push({ question, selected: Array.isArray(selected) ? selected : [selected as string], correct: isCorrect });

        if (this.config.instantFeedback) {
            if (question.type === "mc") {
                const mcQuestion = question as MultipleChoiceQuestion;
                const form = container.querySelector("form");
                if (form) {
                    const labels = form.querySelectorAll(".quiz-option");
                    labels.forEach((label, index) => {
                        const span = label.querySelector("span") as HTMLElement;
                        if (mcQuestion.options[index]) {
                            if (mcQuestion.options[index].correct) {
                                span.addClass("option-correct");
                            } else if ((selected as number[]).includes(index)) {
                                span.addClass("option-wrong");
                            }
                        }
                    });
                }
            } else if (question.type === "input") {
                const input = container.querySelector(".quiz-input") as HTMLInputElement;
                if (input) {
                    input.classList.add(isCorrect ? "option-correct" : "option-wrong");
                }
            }
        }

        // Disable input/checkboxes and confirm button
        const inputs = container.querySelectorAll("input");
        inputs.forEach(i => i.disabled = true);
        const confirmBtn = container.querySelector(".quiz-confirm-btn") as HTMLButtonElement;
        if (confirmBtn) confirmBtn.disabled = true;

        // Add Next button
        const nextButton = container.createEl("button", { text: "Next Question", cls: "quiz-next-btn" });
        nextButton.addEventListener("click", () => {
            this.nextQuestion();
        });

        // Show weight info for weighted MC questions
        if (question.type === "mc") {
            const mcQuestion = question as MultipleChoiceQuestion;
            if (mcQuestion.minimum) {
                const selectedWeight = (selected as number[]).reduce((sum, idx) => sum + (mcQuestion.options[idx]?.weight || 0), 0);
                const totalCorrectWeight = mcQuestion.options.filter(o => o.correct).reduce((sum, o) => sum + (o.weight || 0), 0);
                const requiredWeight = mcQuestion.minimum === "all" ? totalCorrectWeight : mcQuestion.minimum;
                const weightInfo = container.createEl("p", { cls: "quiz-weight-info" });
                weightInfo.createEl("br");
                weightInfo.appendChild(document.createTextNode(`Weight: ${selectedWeight}/${requiredWeight} (${isCorrect ? '✓ Correct' : '✗ Incorrect'})`));
            }
        }

        // If wrong and has explanation, show it
        if (!isCorrect && question.explanation) {
            this.showExplanation(container, question.explanation);
        } else if (isCorrect) {
            let messages = this.plugin && this.plugin.settings && this.plugin.settings.motivationalMessages && this.plugin.settings.motivationalMessages.length > 0 
                ? this.plugin.settings.motivationalMessages 
                : ["Great Job!", "You're making progress!", "Keep it up!", "Excellent work!", "You're on fire!"];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            this.showMotivationalMessage(container, randomMessage);
        }
    }

    private async showExplanation(container: Element, explanation: string) {
        const explanationDiv = container.createEl("div", { cls: "quiz-explanation" });
        const textDiv = explanationDiv.createEl("div", { cls: "explanation-text" });

        // Typing animation
        let index = 0;
        const interval = setInterval(() => {
            if (index < explanation.length) {
                textDiv.textContent += explanation[index];
                index++;
            } else {
                clearInterval(interval);
            }
        }, 50); // 50ms per character
    }

    private showMotivationalMessage(container: Element, message: string) {
        const messageDiv = container.createEl("div", { cls: "quiz-motivational" });
        const textDiv = messageDiv.createEl("div", { cls: "motivational-text" });

        // Typing animation
        let index = 0;
        const interval = setInterval(() => {
            if (index < message.length) {
                textDiv.textContent += message[index];
                index++;
            } else {
                clearInterval(interval);
            }
        }, 50); // 50ms per character
    }

    private nextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex >= this.questions.length) {
            this.step = 'result';
        }
        this.render();
    }

    private renderResult(container: Element) {
        const resultsDiv = container.createEl("div", { cls: "quiz-results" });
        resultsDiv.createEl("h4", { text: "Quiz Results" });
        
        const total = this.results.length;
        const correct = this.results.filter(r => r.correct).length;
        const score = Math.round((correct / total) * 100);
        
        resultsDiv.createEl("div", { text: `Score: ${correct}/${total} (${score}%)`, cls: "quiz-score" });
        
        // Show detailed results
        const list = resultsDiv.createEl("div", { cls: "results-list" });
        this.results.forEach((result, index) => {
            const item = list.createEl("div", { cls: "result-item" });
            item.createEl("h5", { text: `Question ${index + 1}: ${result.question.question}` });
            item.createEl("p", { text: `Your answer: ${Array.isArray(result.selected) ? (result.question.type === "mc" ? 'Selected options' : result.selected[0]) : result.selected} (${result.correct ? 'Correct' : 'Incorrect'})` });
            
            if (!this.config.instantFeedback) {
                if (result.question.type === "mc") {
                    // Show feedback now
                    const mcQuestion = result.question as MultipleChoiceQuestion;
                    const optionsDiv = item.createEl("div");
                    mcQuestion.options.forEach((option, optIndex) => {
                        const optDiv = optionsDiv.createEl("div", { cls: "result-option" });
                        const weightText = option.weight ? ` (weight: ${option.weight})` : '';
                        const span = optDiv.createEl("span", { text: option.text + weightText });
                        if (option.correct) {
                            span.addClass("option-correct");
                        } else if ((result.selected as number[]).includes(optIndex)) {
                            span.addClass("option-wrong");
                        }
                    });
                    
                    // Show minimum requirement if weighted
                    if (mcQuestion.minimum) {
                        const totalCorrectWeight = mcQuestion.options.filter(o => o.correct).reduce((sum, o) => sum + (o.weight || 0), 0);
                        const selectedWeight = (result.selected as number[]).reduce((sum, idx) => sum + (mcQuestion.options[idx]?.weight || 0), 0);
                        const requiredWeight = mcQuestion.minimum === "all" ? totalCorrectWeight : mcQuestion.minimum;
                        item.createEl("p", { text: `Your weight: ${selectedWeight} | Required: ${requiredWeight}` });
                    }
                } else if (result.question.type === "input") {
                    const inputQuestion = result.question as InputQuestion;
                    item.createEl("p", { text: `Possible answers: ${inputQuestion.options.join(', ')}` });
                }
            }
        });

        const restartButton = container.createEl("button", { text: "Restart", cls: "quiz-restart-btn" });
        restartButton.addEventListener("click", () => {
            this.step = 'config';
            this.render();
        });
    }

    private async loadQuizzes(): Promise<Question[]> {
        const tags = this.config.tags.split(',').map(t => t.trim()).filter(t => t);
        const limit = parseInt(this.config.questionLimit) || 0;
        
        let questions: Question[] = [];
        
        if (tags.length === 0) {
            // No tags, load all #quiz questions
            const notes = await this.parser.getNoteswithQuizTag();
            questions = await this.parser.extractQuizzesFromNotes(notes);
        } else {
            // Group questions by topic
            const topicQuestions: { [topic: string]: Question[] } = {};
            for (const tag of tags) {
                const notes = await this.getNotesWithTag(tag);
                const qs = await this.parser.extractQuizzesFromNotes(notes);
                topicQuestions[tag] = qs;
            }
            
            if (limit > 0) {
                // Distribute limit proportionally
                const totalTopics = tags.length;
                const perTopic = Math.floor(limit / totalTopics);
                const remainder = limit % totalTopics;
                
                const selected: Question[] = [];
                for (let i = 0; i < tags.length; i++) {
                    const tag = tags[i];
                    const qs = (topicQuestions as any)[tag] || [];
                    const take = perTopic + (i < remainder ? 1 : 0);
                    if (qs.length > take) {
                        selected.push(...this.shuffleArray(qs).slice(0, take));
                    } else {
                        selected.push(...qs);
                    }
                }
                questions = this.shuffleArray(selected);
            } else {
                // No limit, combine all
                const all: Question[] = [];
                for (const tag of tags) {
                    const qs = (topicQuestions as any)[tag] || [];
                    all.push(...qs);
                }
                questions = this.shuffleArray(all);
            }
        }
        
        // Filter by question types
        questions = questions.filter(q => this.config.questionTypes.includes(q.type));
        
        if (limit > 0 && questions.length > limit) {
            questions = this.shuffleArray(questions).slice(0, limit);
        }
        
        return questions;
    }
    
    private async getNotesWithTag(tag: string): Promise<TFile[]> {
        const notes = await this.parser.getNoteswithQuizTag();
        return notes.filter(note => {
            const cache = this.app.metadataCache.getFileCache(note);
            const noteTags = cache?.tags?.map(t => t.tag.slice(1)) || [];
            return noteTags.includes(tag);
        });
    }
    
    private fuzzyMatch(userAnswer: string, correctAnswer: string): boolean {
        // Exact match (case-insensitive)
        if (userAnswer === correctAnswer) return true;
        
        // Substring match
        if (userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer)) return true;
        
        // Levenshtein distance <= 2 for small words, <= 3 for larger words
        const distance = this.levenshteinDistance(userAnswer, correctAnswer);
        const maxDistance = Math.max(userAnswer.length, correctAnswer.length) <= 5 ? 2 : 3;
        if (distance <= maxDistance) return true;
        
        // Character overlap: if 80% of characters match
        const userChars = new Set(userAnswer.split(''));
        const correctChars = new Set(correctAnswer.split(''));
        const overlap = [...userChars].filter(c => correctChars.has(c)).length;
        const overlapPercent = overlap / Math.max(userChars.size, correctChars.size);
        return overlapPercent >= 0.8;
    }

    private levenshteinDistance(a: string, b: string): number {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }
}