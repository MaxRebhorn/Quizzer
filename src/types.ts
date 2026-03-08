export interface BaseQuestion {
    type: string;
    question: string;
}

export interface QuizOption {
    text: string;
    correct: boolean;
    weight?: number; // weight/importance (number of asterisks)
}

export interface MultipleChoiceQuestion extends BaseQuestion {
    type: "mc";
    options: QuizOption[]; // array of options with correctness flag
    explanation?: string; // optional explanation text or heading link like "#Header"
    minimum?: "all" | number; // minimum weight required ("all" or a number)
}

export interface InputQuestion extends BaseQuestion {
    type: "input";
    options: string[]; // possible correct answers
    fuzzy: boolean; // enable fuzzy matching
    explanation?: string;
}

export type Question = MultipleChoiceQuestion | InputQuestion;
