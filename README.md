# Quizzer Plugin for Obsidian

Quizzer is an Obsidian plugin that allows you to create and take interactive quizzes based on questions embedded in your notes.

## Features

- **Multiple Choice Questions**: Support for single or multiple correct answers
- **Tag-based Filtering**: Quiz on specific topics using note tags
- **Instant Feedback**: Get immediate results with color-coded answers
- **Explanations**: Link to detailed explanations in your notes or provide direct text
- **Motivational Messages**: Encouraging feedback for correct answers
- **Customizable Settings**: Adjust colors, question limits, and more

## Installation

1. Download the plugin files (`main.js`, `manifest.json`, `styles.css`)
2. Place them in your vault's `.obsidian/plugins/quizzer/` folder
3. Reload Obsidian and enable the plugin in Settings → Community plugins

## Creating Quiz Questions

Add quiz questions to any note using the following format:

### Multiple Choice Questions
```markdown
```quiz
type: mc
question: What is the capital of France?
- Berlin
- Paris *
- Rome
explanation: Paris has been the capital of France since 508 AD.
```
```

### Multiple Choice with Weighted Answers
```markdown
```quiz
type: mc
minimum: all
question: Which cities are in Europe?
- Berlin **
- Paris **
- Rome **
- Tokyo
explanation: Berlin, Paris, and Rome are all major European cities.
```
```

In weighted mode:
- Each asterisk (`*`) adds 1 weight to an answer
- `minimum: all` requires user to reach the total weight of all correct answers
- `minimum: 3` requires user to reach weight 3 (customize as needed)
- Berlin `**` + Paris `**` + Rome `**` = 6 weight total. If minimum is all, user must select all three
- If Berlin had `***` and minimum was `all`, user only needs Berlin (weight 3) if the others are weighted less

### Input Questions
```markdown
```quiz
type: in
question: Where do people live?
- house
- building
- cave
fuzzy: true
explanation: #HousingExplanation
```
```

### Question Format

- **type**: `mc` for multiple choice, `in` for input questions
- **question**: The question text
- **options**: 
  - For MC: list options with `*` for correct answers. Add more asterisks for weighted answers (`**`, `***`, etc.)
  - For input: list possible correct answers
- **minimum**: For MC only, either `all` (requires reaching sum of all correct weights) or a number
- **fuzzy**: For input questions, enable fuzzy matching (default: false)
- **explanation**: Either direct text or `#HeadingName` to link to a section in the note

### Tagging Notes

Tag your notes with `#quiz` to make their questions available for quizzing.

## Using the Quizzer

1. Open the Quizzer view from the sidebar or using the command palette
2. Configure your quiz:
   - **Tags**: Comma-separated tags to filter questions (leave empty for all)
   - **Question Limit**: Maximum number of questions (leave empty for all)
   - **Instant Feedback**: Show results immediately after each question
   - **Question Types**: Select which types of questions to include
3. Click "Start Quiz" to begin!

## Settings

Access settings through Settings → Community plugins → Quizzer:

- **Quiz Colors**: Customize the color scheme
- **Motivational Messages**: Comma-separated messages shown for correct answers

## Tips

- Use header links (`#HeadingName`) in explanations to keep detailed information organized in your notes
- Combine multiple tags for topic-specific quizzes
- Instant feedback provides immediate learning reinforcement
- Motivational messages encourage continued learning
- **Weighted Answers**: Use asterisks to emphasize important answers. For example, if a question has multiple valid answers but one is most important, give it more weight
- **Weighted Mode**: Set `minimum: all` to require full coverage of correct answers, or use `minimum: 2` to set a specific weight threshold

