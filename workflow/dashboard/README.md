# Feedback dashboard

Follow the [dashboard walkthrough](../../README.md#6-build-the-dashboard).

`dataset.sql` uses one row-level evidence table for every widget and filter. The unconfigured query uses `feedback_with_issue_type`; choose your main catalog/schema in the SQL editor. The starter renders a fully qualified table name.

Use row count for messages, count distinct `source_user_key` for source-qualified user IDs, and sum `needs_review` for review flags. Bind separate issue/source/category dropdown filters to the same dataset and compare filtered totals with the evidence table before publishing.
