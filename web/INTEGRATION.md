# Application integration

Follow [README setup steps](../README.md#8-connect-the-application) before running the app.

## Request flow

1. The server validates the submission and commits a stable UUID to Lakebase `papaeats_app.feedback_submissions`.
2. After commit, it requests the app Lakeflow Job with the submission ID. Customer text stays out of job parameters.
3. The job reads the saved message, masks contacts, classifies changed text, validates issue membership, and publishes to the isolated app Delta schema.
4. The job saves a completion receipt in Lakebase. The result page polls and displays this saved result.
5. Issue evidence is read through Databricks SQL. Owner, priority, and decision are separate parameterized Postgres writes to `papaeats_app.issue_decisions`.

The app requests the job; a database insert alone is not a trigger. App tables begin as a one-time deep copy of main tables. They do not automatically receive subsequent main export refreshes.

## Configuration and permissions

The starter writes `web/.env.local`; supply `SUBMISSION_JOB_ID` after creating the app job. `.env.example` lists the fields for manual configuration. Select a CLI profile explicitly. Local OAuth tokens and refreshed Lakebase credentials stay on the server.

Use `LOCAL_DEMO_MODE=true`, `APP_ORIGIN=http://127.0.0.1:3017`, `FEEDBACK_BACKEND=sql`, and the loopback launch command in the tutorial. All local submissions share a demo actor. This is a private local application, not a public customer authentication system.

The app identity needs SQL warehouse use, catalog/schema use and SELECT on the app evidence table, permission to request the app job, and Postgres schema usage plus SELECT/INSERT/UPDATE on both operational tables. The job identity also needs read/write/create access in the app Delta schema and access to the configured MLflow experiment folder.

## Failure behavior

- The saved UUID and attempt number form the Jobs idempotency token. Repeated requests do not create duplicate submissions/runs for the same attempt.
- Uncertain dispatch keeps the input saved. Retry processing is available after the earlier run is known to be terminal; there is no unattended outbox worker.
- Tracing/export errors do not repeat the AI materialization action. A failed AI write still fails the task.
- Delta publication and the Postgres receipt are separate transactions. Completion is displayed only from a saved receipt; a retry can repair a missing receipt using published analysis.
- Decision reads come directly from Postgres. Analysis snapshots are cached for 60 seconds, with a 10,000-row guard.
- The local demo allows ten new submissions per actor per hour.

Hosted deployment needs authenticated ingress, a dedicated service identity and resource bindings, explicit grants on existing Postgres tables, and a hosted origin. Do not enable the local-demo bypass or upload local credentials to hosting.
