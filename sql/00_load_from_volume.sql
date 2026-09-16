-- Optional SQL inspection of the four raw exports.
-- You uploaded the four raw exports to the volume workspace.papaeats.raw.
-- This turns each file into a table. Types are inferred; the messy dates stay as strings
-- on purpose so Genie Code has something to fix in the next step.

CREATE OR REPLACE TABLE workspace.papaeats.app_store_reviews AS
SELECT * EXCEPT (_rescued_data)
FROM read_files(
  '/Volumes/workspace/papaeats/raw/app_store_reviews.csv',
  format => 'csv', header => true, inferColumnTypes => true
);

CREATE OR REPLACE TABLE workspace.papaeats.google_play_reviews AS
SELECT * EXCEPT (_rescued_data)
FROM read_files(
  '/Volumes/workspace/papaeats/raw/google_play_reviews.csv',
  format => 'csv', header => true, inferColumnTypes => true
);

CREATE OR REPLACE TABLE workspace.papaeats.support_tickets AS
SELECT * EXCEPT (_rescued_data)
FROM read_files(
  '/Volumes/workspace/papaeats/raw/support_tickets.csv',
  format => 'csv', header => true, inferColumnTypes => true
);

-- The JSON file is one array of objects, so it needs multiLine.
CREATE OR REPLACE TABLE workspace.papaeats.in_app_feedback AS
SELECT * EXCEPT (_rescued_data)
FROM read_files(
  '/Volumes/workspace/papaeats/raw/in_app_feedback.json',
  format => 'json', multiLine => true
);

-- Sanity check: four tables, about 2,227 rows in total.
SELECT 'app_store'   AS source, count(*) AS rows FROM workspace.papaeats.app_store_reviews
UNION ALL SELECT 'google_play', count(*) FROM workspace.papaeats.google_play_reviews
UNION ALL SELECT 'support',     count(*) FROM workspace.papaeats.support_tickets
UNION ALL SELECT 'in_app',      count(*) FROM workspace.papaeats.in_app_feedback;

-- If read_files in your workspace does not add a _rescued_data column, replace
-- "SELECT * EXCEPT (_rescued_data)" with "SELECT *".
