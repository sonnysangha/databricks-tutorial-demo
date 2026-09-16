# Feedback processing

See the [tutorial](../docs/SETUP.md#5-clean-classify-and-publish) for first-run setup and the generated `main-job.json` route.

The main notebook processes exports in four steps: **prepare → analyze → group → publish**. Run `sql/00_bootstrap.sql` first to create empty baseline tables. Interactive execution defaults to review-only; processing requires a numeric job run ID.

Stable identity is `source + feedback_id`. Source IDs preserve updated reviews and tickets. In-app messages lack independent IDs, so their identity uses user + text + timestamp. Different messages from the same user are retained.

Unchanged text reuses saved analysis. New AI responses are materialized once and cached. Broad categories/sentiment use AI; detailed issue groups use ordered keyword rules. Summary counts come from exact row-level membership; user totals are source-qualified IDs.

Preparation rejects invalid fields, conflicting IDs, and remaining recognized contact patterns. Publication checks baseline Delta versions before writing. Each Delta write is atomic, but all tables are not published in one transaction. Inspect failed runs before retrying. Staging data is retained for diagnosis; add a retention policy for recurring use.

The optional `databricks.yml` bundle defines the main workflow only. For a new bundle-managed job, authenticate with a profile you choose, then from this directory run:

```bash
databricks bundle validate --strict -t review --profile YOUR_PROFILE
databricks bundle deploy -t review --profile YOUR_PROFILE
```

Review its catalog, schema, raw-path variables and task settings first. Use either the generated JSON setup or the bundle for the main job, not both: deploying an unbound bundle after creating a job separately creates a duplicate. Deployment does not run the job.

Offline checks from the repository root:

```bash
python3 -m unittest discover -s workflow/tests -v
```
