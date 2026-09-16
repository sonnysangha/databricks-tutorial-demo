"""Render a new local starter from identifier-only config. Never calls Databricks."""
import argparse
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse

FIELDS = {
    'workspace_host', 'profile', 'workspace_user', 'warehouse_id', 'catalog',
    'main_schema', 'app_schema', 'raw_path', 'lakebase_endpoint', 'pg_host',
    'pg_database', 'pg_user',
}


def validate(c):
    if set(c) != FIELDS or any(not isinstance(v, str) or not v.strip() for v in c.values()):
        raise ValueError('Use exactly the nonempty identifier fields from config.example.json; do not add tokens.')
    if any('YOUR-' in v or v == 'you@example.com' for v in c.values()):
        raise ValueError('Replace the example workspace, user and resource placeholders first.')
    if any(any(ch in v for ch in ['\n', '\r', '\x00', '"', "'", '`', '$', '\\', '#']) for v in c.values()):
        raise ValueError('Identifiers must not contain shell, environment or source-code delimiters.')
    parsed = urlparse(c['workspace_host'])
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.path not in ('', '/') or parsed.query or parsed.fragment:
        raise ValueError('workspace_host must be the HTTPS workspace origin.')
    for key in ['catalog', 'main_schema', 'app_schema', 'pg_database']:
        if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', c[key]):
            raise ValueError(f'{key} must be a plain database identifier.')
    if c['main_schema'] == c['app_schema']:
        raise ValueError('Use a separate app schema to preserve the main demo tables.')
    if c['raw_path'] != f"/Volumes/{c['catalog']}/{c['main_schema']}/raw":
        raise ValueError('raw_path must point to the raw volume in your main schema.')
    for key in ['workspace_user', 'pg_user']:
        if not re.fullmatch(r'[A-Za-z0-9_.+@-]+', c[key]):
            raise ValueError(f'{key} must be an email or service identity, not a path.')
    if not re.fullmatch(r'[A-Za-z0-9_-]+', c['profile']):
        raise ValueError('Use a simple CLI profile name.')
    if not re.fullmatch(r'[a-fA-F0-9]+', c['warehouse_id']):
        raise ValueError('Copy the SQL warehouse ID from your workspace.')
    if not re.fullmatch(r'[A-Za-z0-9.-]+', c['pg_host']):
        raise ValueError('pg_host must be a hostname without a scheme or credentials.')
    if not re.fullmatch(r'projects/[A-Za-z0-9-]+/branches/[A-Za-z0-9-]+/endpoints/[A-Za-z0-9-]+', c['lakebase_endpoint']):
        raise ValueError('Copy the Lakebase endpoint resource name, not its hostname.')


def replace_once(source, old, new):
    if source.count(old) != 1:
        raise ValueError(f'Template changed; expected one configuration marker: {old}')
    return source.replace(old, new, 1)


def render(config, destination, template):
    validate(config)
    c = config
    if destination.exists():
        raise ValueError('Output already exists. Choose a new directory; existing work is never overwritten.')
    main_ns = f"{c['catalog']}.{c['main_schema']}"
    app_ns = f"{c['catalog']}.{c['app_schema']}"
    user_dir = f"/Users/{c['workspace_user']}/papaeats-demo"
    refresh = (template / 'notebooks/PapaEats Feedback Refresh.py').read_text()
    app = (template / 'notebooks/PapaEats App Feedback.py').read_text()
    evaluation = (template / 'mlflow/evaluate_saved_feedback.py').read_text()
    for old, new in {
        "('catalog', 'workspace')": f"('catalog', {c['catalog']!r})",
        "('schema', 'papaeats')": f"('schema', {c['main_schema']!r})",
        "('raw_path', '/Volumes/workspace/papaeats/raw')": f"('raw_path', {c['raw_path']!r})",
    }.items():
        refresh = replace_once(refresh, old, new)
    for old, new in {
        "('catalog', 'workspace')": f"('catalog', {c['catalog']!r})",
        "('schema', 'papaeats_app_demo')": f"('schema', {c['app_schema']!r})",
        "('raw_path', '/Volumes/workspace/papaeats/raw')": f"('raw_path', {c['raw_path']!r})",
        "'workspace.papaeats_app_demo'": repr(app_ns),
        "'__LAKEBASE_ENDPOINT__'": repr(c['lakebase_endpoint']),
        "'__PG_HOST__'": repr(c['pg_host']),
        "dbname='databricks_postgres'": f"dbname={c['pg_database']!r}",
        "user='__WORKSPACE_USER__'": f"user={c['pg_user']!r}",
        "'/Users/__WORKSPACE_USER__/PapaEats App Classifications'": repr(user_dir + '/App Classifications'),
    }.items():
        app = replace_once(app, old, new)
    for old, new in {
        '"__CLI_PROFILE__"': repr(c['profile']),
        '"workspace.papaeats_app_demo.feedback_analyzed"': repr(app_ns + '.feedback_analyzed'),
        '"/Users/__WORKSPACE_USER__/PapaEats Classification Quality"': repr(user_dir + '/Classification Quality'),
        '"__WAREHOUSE_ID__"': repr(c['warehouse_id']),
        '__WORKSPACE_HOST__': c['workspace_host'].rstrip('/'),
    }.items():
        evaluation = replace_once(evaluation, old, new)
    # Detect malformed source before creating any output.
    for name, source in [('refresh', refresh), ('app', app), ('evaluation', evaluation)]:
        compile(source, name, 'exec')
    shutil.copytree(template, destination)
    (destination / 'notebooks/PapaEats Feedback Refresh.py').write_text(refresh)
    (destination / 'notebooks/PapaEats App Feedback.py').write_text(app)
    (destination / 'mlflow/evaluate_saved_feedback.py').write_text(evaluation)
    tasks = []
    previous = None
    for task, step in [('prepare_feedback', 'prepare'), ('analyze_changes', 'analyze'), ('group_and_check', 'group'), ('publish_results', 'publish')]:
        item = {'task_key': task, 'run_if': 'ALL_SUCCESS', 'max_retries': 0,
                'disable_auto_optimization': True, 'timeout_seconds': 3600,
                'environment_key': 'standard',
                'notebook_task': {'source': 'WORKSPACE', 'notebook_path': user_dir + '/PapaEats App Feedback',
                'base_parameters': {'catalog': c['catalog'], 'schema': c['app_schema'],
                    'step': step, 'refresh_run_id': '{{job.run_id}}',
                    'submission_id': '{{job.parameters.submission_id}}'}}}
        if previous:
            item['depends_on'] = [{'task_key': previous}]
        tasks.append(item)
        previous = task
    job = {'name': 'PapaEats App Feedback', 'max_concurrent_runs': 1,
           'queue': {'enabled': True}, 'timeout_seconds': 7200,
           'environments': [{'environment_key': 'standard', 'spec': {'environment_version': '5'}}],
           'parameters': [{'name': 'submission_id', 'default': ''}], 'tasks': tasks}
    (destination / 'app-job.json').write_text(json.dumps(job, indent=2) + '\n')
    main_job = json.loads(json.dumps(job))
    main_job['name'] = 'PapaEats Feedback Refresh'
    main_job['parameters'] = []
    for task in main_job['tasks']:
        notebook = task['notebook_task']
        notebook['notebook_path'] = user_dir + '/PapaEats Feedback Refresh'
        params = notebook['base_parameters']
        params.pop('submission_id')
        params['schema'] = c['main_schema']
        params['raw_path'] = c['raw_path']
    (destination / 'main-job.json').write_text(json.dumps(main_job, indent=2) + '\n')
    bootstrap = (destination / 'sql/00_bootstrap.sql').read_text()
    (destination / 'sql/00_bootstrap.sql').write_text(bootstrap.replace('workspace.papaeats', main_ns))
    dashboard = (destination / 'sql/dashboard.sql').read_text()
    (destination / 'sql/dashboard.sql').write_text(dashboard.replace('FROM feedback_with_issue_type', 'FROM ' + main_ns + '.feedback_with_issue_type'))

    clone = '\n'.join(f'CREATE TABLE {app_ns}.{name} DEEP CLONE {main_ns}.{name};'
        for name in ['feedback_clean', 'feedback_analyzed', 'feedback_with_issue_type', 'issue_summary'])
    (destination / 'prepare-app-tables.sql').write_text(
        '-- Run only after the four main tables exist. Existing app tables cause an error.\n'
        f'CREATE SCHEMA IF NOT EXISTS {app_ns};\n' + clone + '\n')
    values = {'LOCAL_DEMO_MODE': 'true', 'APP_ORIGIN': 'http://127.0.0.1:3017',
              'DATABRICKS_HOST': c['workspace_host'].rstrip('/'), 'DATABRICKS_PROFILE': c['profile'],
              'DATABRICKS_WAREHOUSE_ID': c['warehouse_id'],
              'DATABRICKS_FEEDBACK_TABLE': app_ns + '.feedback_with_issue_type',
              'FEEDBACK_BACKEND': 'sql', 'SUBMISSION_JOB_ID': '',
              'PGHOST': c['pg_host'], 'PGPORT': '5432', 'PGDATABASE': c['pg_database'],
              'PGUSER': c['pg_user'], 'PGSSLMODE': 'require',
              'LAKEBASE_ENDPOINT': c['lakebase_endpoint'], 'ENABLE_DECISIONS': 'true'}
    (destination / 'web/.env.local').write_text(
        '# Identifier-only config. Set SUBMISSION_JOB_ID after creating the job.\n' +
        '\n'.join(f'{key}={value}' for key, value in values.items()) + '\n')
    print(f'Created {destination}. No cloud resources changed. Set the newly created job ID before starting the app.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    render(json.loads(args.config.read_text()), args.output, Path(__file__).resolve().parent / 'template')
