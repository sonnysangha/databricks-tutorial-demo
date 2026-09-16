# PapaEats configurable starter

Follow the [complete tutorial](https://github.com/sonnysangha/databricks-tutorial-demo#readme). The downloadable ZIP also includes `TUTORIAL.md` for reference and `prompts.md` for copyable prompts.

You can also [install Databricks Agent Skills and ask your coding agent to perform the setup](https://github.com/sonnysangha/databricks-tutorial-demo#set-this-up-with-your-favourite-coding-agent). Give it the repository or this extracted starter, including `TUTORIAL.md` and `docs/SETUP.md`.

1. [Create a Databricks workspace](https://login.databricks.com/signup?provider=DB_FREE_TIER&utm_medium=influencer&utm_campaign=plug-pilot&utm_source=youtube&utm_content=short&utm_term=sonnysangha).
2. Sign in with a CLI profile you explicitly choose. Create/select your SQL warehouse and a dedicated Lakebase database.
3. Extract `dist/papaeats-starter.zip`. Work inside the extracted `papaeats-starter` directory, alongside `template/`.
4. Copy `config.example.json` to `config.json` and fill every identifier. Keep tokens and passwords out of it.
5. Run `python3 configure.py --config config.json --output my-papaeats`.
6. Run generated `my-papaeats/sql/00_bootstrap.sql` in Databricks SQL; upload the four data exports into the created volume.
7. Import the generated main notebook at the path in `main-job.json`, create the main job, and wait for its four tasks to succeed.
8. Build your dashboard and Genie Agent over the main tables.
9. Run `prepare-app-tables.sql` in Databricks SQL. Run SQL 06 and 07 in **Lakebase's Postgres SQL editor**.
10. Import the app notebook, create the app job from `app-job.json`, and put its ID in generated `web/.env.local`.
11. Start the app, submit fictional feedback, inspect the completed result and MLflow trace, and save/reload a team decision.
12. Use the configured MLflow evaluation script to inspect saved classifications.

The renderer only writes local files and refuses to overwrite an existing destination. The main and app schemas must differ. The generated job files use four sequential serverless tasks with no schedule. Starting the app job without a saved submission ID intentionally fails.

Never publish `config.json` or generated `.env.local` files. A local build/test pass is distinct from a successful run in your cloud workspace.
