import { App, TFile, Vault } from "obsidian";
import yaml from "js-yaml"; // Ensure js-yaml is installed and imported for YAML parsing
import { Question } from "./types"; // Define a proper Question type in types.ts
// This should run each time when the quiz ribbon is clicked and load



// New class with all fixes applied, including a skeleton for extractQuizzesFromNotes with implementation guidance
export class QuizParserFixed {
    // Class properties declared properly
    private notes: TFile[] = [];

    constructor(private app: App, private vault: Vault) {
        // nothing to initialize yet
    }

    // Method with proper typing and logic fixes
   public async getNoteswithQuizTag(): Promise<TFile[]> {
        this.notes = this.vault.getMarkdownFiles();
        const notesWithQuizTag: TFile[] = [];

        console.log("Total markdown files found:", this.notes.length);
        this.notes.forEach(element => {
            const cache = this.app.metadataCache.getFileCache(element);
            console.log("Checking file:", element.name, "tags:", cache?.tags);
            // Check all tags (frontmatter + inline) for "quiz"
            if (cache?.tags?.some(t => t.tag === "#quiz")) {
                notesWithQuizTag.push(element);
            }
        });
        console.log("Notes with quiz tag:", notesWithQuizTag.length);
        return notesWithQuizTag;
    }

    public async extractQuizzesFromNotes(notesWithQuizTag: TFile[]): Promise<Question[]> {
        const quizzes: Question[] = [];
        console.log("Starting to extract quizzes from", notesWithQuizTag.length, "notes");
        
        for (const note of notesWithQuizTag) {
            const content = await this.vault.read(note);
            if (!content) continue;
            console.log("Reading note:", note.name, "Content length:", content.length);
            
            const regex = /```quiz\n([\s\S]*?)\n```/g;
            let match: RegExpExecArray | null;
            while ((match = regex.exec(content)) !== null) {
                const blockText = match[1];
                const quiz = this.parseQuizBlock(blockText, content);
                if (quiz) {
                    console.log("Parsed quiz:", quiz);
                    quizzes.push(quiz);
                } else {
                    console.warn("Failed to parse quiz block in", note.name, "\n", blockText);
                }
            }
        }
        console.log("Total quizzes extracted:", quizzes.length);
        return quizzes;
    }

    /**
     * Parse the inner text of a ```quiz block and return a Question
     * currently supports only multiple-choice format defined in README.
     */
    private parseQuizBlock(text: string, fullContent: string): Question | null {
        const lines = text.split(/\r?\n/).map(l => l.trim());
        let type = "";
        let question = "";
        const rawOptions: string[] = [];
        let explanation = "";
        let fuzzy = false;
        let minimum: "all" | number | undefined;
        let inOptions = false;

        for (const line of lines) {
            if (line.startsWith("type:")) {
                type = line.slice("type:".length).trim();
            } else if (line.startsWith("question:")) {
                question = line.slice("question:".length).trim();
            } else if (line.startsWith("explanation:") || line.startsWith("eplanation:")) {  // Handle typo
                explanation = line.slice(line.indexOf(":") + 1).trim();
            } else if (line.startsWith("fuzzy:")) {
                fuzzy = line.slice("fuzzy:".length).trim().toLowerCase() === "true";
            } else if (line.startsWith("minimum:")) {
                const minVal = line.slice("minimum:".length).trim();
                minimum = minVal === "all" ? "all" : parseInt(minVal) || undefined;
            } else if (line.startsWith("options:")) {
                inOptions = true;
            } else if (line.startsWith("-")) {
                rawOptions.push(line.slice(1).trim());
            }
        }

        // Handle header links for explanations
        if (explanation.startsWith("#")) {
            const headerText = this.extractTextUnderHeader(fullContent, explanation);
            if (headerText) {
                explanation = headerText;
            }
        }

        if (type === "mc") {
            const opts = rawOptions.map(o => {
                // Count asterisks at the end to determine weight
                const asteriskMatch = o.match(/\*+$/);
                const weight = asteriskMatch ? asteriskMatch[0].length : 0;
                
                // Check if this is a correct answer (has at least one asterisk)
                const correct = weight > 0;
                
                // Remove asterisks from text
                const text = o.replace(/\*+$/, "").trim();
                
                return { text, correct, weight };
            });
            return { type: "mc", question, options: opts, explanation, minimum };
        } else if (type === "in" || type === "input") {
            return { type: "input", question, options: rawOptions, fuzzy, explanation };
        }

        // unhandled types return null for now
        return null;
    }

    private extractTextUnderHeader(content: string, header: string): string | null {
        const lines = content.split(/\r?\n/);
        const headerLevel = (header.match(/^#+/) || [''])[0].length;
        const headerText = header.slice(headerLevel).trim();
        let inHeader = false;
        let result = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#')) {
                const level = trimmed.match(/^#+/)![0].length;
                const text = trimmed.slice(level).trim();
                if (text === headerText && level === headerLevel) {
                    inHeader = true;
                    continue;
                } else if (inHeader && level <= headerLevel) {
                    break;
                }
            }
            if (inHeader && trimmed) {
                result += line + '\n';
            }
        }
        return result.trim() || null;
    }
}
