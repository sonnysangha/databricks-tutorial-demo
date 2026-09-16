# PapaEats tutorial prompts

Use these while following the [tutorial](../README.md). Replace catalog, schema and volume paths with your own. Use **Genie Code** for building and inspecting; ask business questions **inside your Genie Agent**. Review generated code and query results before using them.

## 1. Bring the feedback together

**Genie Code:**

```text
Inspect these four feedback exports. Show a few examples and explain what needs cleaning before we combine them.
```

**Genie Code:**

```text
Combine and clean the feedback. Make the dates and columns consistent, remove duplicate submissions, and hide email addresses and phone numbers. Keep different messages from the same customer and leave the original files unchanged. Save the result and show what changed.
```

## 3. Turn messages into useful labels

**Genie Code:**

```text
Use Databricks AI to categorize a small sample of our cleaned feedback and identify its sentiment. Show each message beside its labels and a short explanation, and flag anything uncertain.
```

**Genie Code:**

```text
Apply this approach to the remaining feedback and save the results. Keep the original messages and flag anything that needs review.
```

## 4. See the recurring problems

**Genie Code:**

```text
Group our saved feedback into recurring problems and feature requests. Build a dashboard showing the biggest groups, sentiment and feedback that needs review. Let us select an issue and source to see the customer messages behind the numbers. Show message counts separately from user counts.
```

## 5. Create a Genie Agent and ask a question

**Genie Code — create the agent:**

```text
Create a Genie Agent called “PapaEats Customer Feedback” using our saved analysis and issue summary. Help it distinguish complaints from feature requests, count messages separately from customers, and show evidence for its answers.
```

**Genie Agent — business question:**

```text
What are the biggest customer complaints and bugs? Show the message counts in a chart and keep feature requests separate.
```

**Genie Agent — follow-up:**

```text
Show five customer messages behind the biggest problem.
```

## 6. Make the processing repeatable

**Genie Code:**

```text
Turn our working notebook into a repeatable feedback workflow. Process new and updated feedback, reuse unchanged analysis, and keep each issue linked to its customer messages. Show the steps and what was processed or skipped.
```

## 8. Show what MLflow adds

**Genie Code:**

```text
Use MLflow to review a small sample of our saved classifications. Check whether the category and sentiment fit each message and whether the explanation adds unsupported details. Show examples that need attention and explain why.
```
