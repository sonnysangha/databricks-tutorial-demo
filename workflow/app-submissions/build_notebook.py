"""Generate the app-input variant from the reviewed refresh (main notebook is untouched)."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
s = (root / 'src/PapaEats Feedback Refresh.py').read_text()
s = s.replace('# MAGIC # PapaEats Feedback Refresh', '# MAGIC # PapaEats App Feedback')
s = s.replace('# MAGIC **Manual workflow — review before running.**', '# MAGIC **Started by the Next.js app after saving customer feedback in Lakebase.**')
s = s.replace('# MAGIC No schedule, automatic retries or Lakebase sync is enabled.', '# MAGIC The input and completion receipt use Lakebase. Team decisions are never modified.')
s = s.replace('# COMMAND ----------\nimport json', '# COMMAND ----------\n# MAGIC %pip install psycopg[binary]==3.2.10 mlflow==3.16.0\n\n# COMMAND ----------\ndbutils.library.restartPython()\n\n# COMMAND ----------\nimport json', 1)
s = s.replace("('schema', 'papaeats'),", "('schema', 'papaeats_app_demo'), ('submission_id', ''),")
s = s.replace("NS = f'{CATALOG}.{SCHEMA}'", """NS = f'{CATALOG}.{SCHEMA}'
if NS != 'workspace.papaeats_app_demo':
    raise ValueError('App workflow must use its isolated app demo schema')
SUBMISSION = dbutils.widgets.get('submission_id')
if STEP != 'review' and not re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}', SUBMISSION):
    raise ValueError('Use a valid saved app submission ID')

def app_connection():
    import psycopg
    import certifi
    from databricks.sdk import WorkspaceClient
    w = WorkspaceClient()
    credential = w.api_client.do('POST', '/api/2.0/postgres/credentials',
        body={'endpoint': '__LAKEBASE_ENDPOINT__'})
    return psycopg.connect(host='__PG_HOST__',
        dbname='databricks_postgres', user='__WORKSPACE_USER__', password=credential['token'],
        sslmode='verify-full', sslrootcert=certifi.where(), connect_timeout=20)
""")
start=s.index("    reader = spark.read.option('header'")
end=s.index('    incoming = canonical(incoming)', start)
s=s[:start]+'''    # The app passes only the stable ID. Customer text is read from Lakebase.
    with app_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id::text, message_text, rating, created_at FROM papaeats_app.feedback_submissions WHERE id=%s", (SUBMISSION,))
            record = cursor.fetchone()
    check(record is not None, 'Saved submission does not exist')
    feedback_id, message, rating, created_at = record
    incoming = spark.createDataFrame([('app_submission', feedback_id, 'customer_' + feedback_id[:8], message,
        rating, created_at, 'demo', 'submitted via PapaEats app')],
        'source STRING, feedback_id STRING, user_id STRING, message_text STRING, rating INT, timestamp TIMESTAMP, app_version STRING, metadata STRING')
''' + s[end:]
needle = "        materialized = save_stage(classified, 'ai_responses')"
assert s.count(needle) == 1, 'Expected exactly one AI materialization to instrument'
s = s.replace(needle, "        materialized = materialize_ai_traced(classified, fresh, metrics)", 1)
tracing = (root / 'app-submissions/tracing.py.fragment').read_text()
s = s.replace('def analyze(metrics):', tracing + '\n\n\ndef analyze(metrics):', 1)
s=s.replace("    print('Published saved analysis. The Next.js SQL preview will read it after its 60-second cache expires. No Lakebase resources or app decisions were changed.')", '''    # A receipt is written only after validated canonical Delta publication.
    # A repeat attempt can repair a missing receipt using the saved analysis.
    result = grouped.filter((F.col('source') == 'app_submission') & (F.col('feedback_id') == SUBMISSION)).first()
    check(result is not None, 'Published result is missing the submission')
    receipt = result.asDict()
    receipt.update(processed=metrics['processed'], skipped=metrics['skipped'], run_id=RUN)
    if exists(stage('trace')):
        trace_info = spark.table(stage('trace')).first().asDict()
        receipt['mlflow_trace_id'] = trace_info['trace_id']
        receipt['mlflow_experiment_id'] = trace_info['experiment_id']
    with app_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE papaeats_app.feedback_submissions SET result=%s::jsonb, completed_at=now(), dispatch_error=NULL WHERE id=%s",
                (json.dumps(receipt, default=str), SUBMISSION))
            check(cursor.rowcount == 1, 'Completion receipt was not saved')
    print('Published validated analysis and saved the completion receipt. Team decisions were not modified.')''')
(root/'app-submissions/PapaEats App Feedback.py').write_text(s)
print('Generated app notebook with isolated writes, stable submission ID, and Lakebase receipt.')
