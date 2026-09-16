-- Run in the Databricks SQL editor before the first refresh job.
-- These statements create empty baseline tables; existing tables are untouched.
-- Change workspace.papaeats if you choose another catalog/schema.
CREATE SCHEMA IF NOT EXISTS workspace.papaeats;
CREATE VOLUME IF NOT EXISTS workspace.papaeats.raw;

CREATE TABLE IF NOT EXISTS workspace.papaeats.feedback_clean (
  source STRING, feedback_id STRING, user_id STRING, message_text STRING,
  rating INT, timestamp TIMESTAMP, app_version STRING, metadata STRING
) USING DELTA;

CREATE TABLE IF NOT EXISTS workspace.papaeats.feedback_analyzed USING DELTA AS
SELECT *, CAST(NULL AS STRING) AS category, CAST(NULL AS DOUBLE) AS confidence_score,
       CAST(NULL AS STRING) AS explanation, CAST(NULL AS STRING) AS sentiment,
       CAST(NULL AS BOOLEAN) AS uncertain_classification
FROM workspace.papaeats.feedback_clean WHERE false;

CREATE TABLE IF NOT EXISTS workspace.papaeats.feedback_with_issue_type USING DELTA AS
SELECT *, CAST(NULL AS STRING) AS issue_cat, CAST(NULL AS STRING) AS issue_type
FROM workspace.papaeats.feedback_analyzed WHERE false;

CREATE TABLE IF NOT EXISTS workspace.papaeats.issue_summary (
  issue_category STRING, issue_type STRING, total_messages BIGINT,
  unique_users BIGINT, avg_confidence DOUBLE, uncertain_messages BIGINT,
  first_reported TIMESTAMP, last_reported TIMESTAMP,
  example_messages ARRAY<STRUCT<message:STRING,user:STRING,source:STRING,
    confidence:DOUBLE,sentiment:STRING,timestamp:TIMESTAMP>>,
  messages_per_user DOUBLE, needs_review BOOLEAN
) USING DELTA;
