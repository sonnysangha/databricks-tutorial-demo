"""Exercise the exported archive and its configuration renderer."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class ViewerKit(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        with zipfile.ZipFile(ROOT / 'dist/papaeats-starter.zip') as archive:
            archive.extractall(self.folder)
        self.kit = self.folder / 'papaeats-starter'
        spec = importlib.util.spec_from_file_location('exported_configure', self.kit / 'configure.py')
        self.renderer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.renderer)
        self.config = dict(workspace_host='https://example.cloud.databricks.com',
            profile='viewer-demo', workspace_user='viewer@example.com',
            warehouse_id='012345abcdef6789', catalog='viewer_catalog',
            main_schema='feedback_main', app_schema='feedback_app',
            raw_path='/Volumes/viewer_catalog/feedback_main/raw',
            lakebase_endpoint='projects/viewer/branches/production/endpoints/primary',
            pg_host='viewer.database.example.com', pg_database='viewer_db', pg_user='viewer@example.com')

    def test_export_renders_consistent_isolated_targets(self):
        target = self.folder / 'rendered'
        self.renderer.render(self.config, target, self.kit / 'template')
        app = (target / 'notebooks/PapaEats App Feedback.py').read_text()
        self.assertIn("if NS != 'viewer_catalog.feedback_app':", app)
        self.assertIn("dbname='viewer_db', user='viewer@example.com'", app)
        self.assertIn("sslmode='verify-full'", app)
        self.assertIn("'/Users/viewer@example.com/papaeats-demo/App Classifications'", app)
        job = json.loads((target / 'app-job.json').read_text())
        self.assertNotIn('schedule', job)
        main = json.loads((target / 'main-job.json').read_text())
        self.assertEqual(len(main['tasks']), 4)
        self.assertEqual(main['parameters'], [])
        for task in main['tasks']:
            params = task['notebook_task']['base_parameters']
            self.assertEqual(params['schema'], 'feedback_main')
            self.assertEqual(params['raw_path'], self.config['raw_path'])
            self.assertNotIn('submission_id', params)
            self.assertEqual(task['environment_key'], 'standard')
        bootstrap = (target / 'sql/00_bootstrap.sql').read_text()
        self.assertIn('viewer_catalog.feedback_main.feedback_clean', bootstrap)
        self.assertNotIn('workspace.papaeats', bootstrap)
        self.assertNotIn('OR REPLACE', bootstrap)
        self.assertIn('FROM viewer_catalog.feedback_main.feedback_with_issue_type',
                      (target / 'sql/dashboard.sql').read_text())

        for task in job['tasks']:
            self.assertEqual(task['notebook_task']['base_parameters']['schema'], 'feedback_app')
            self.assertEqual(task['max_retries'], 0)
        self.assertIn('DATABRICKS_FEEDBACK_TABLE=viewer_catalog.feedback_app.feedback_with_issue_type',
                      (target / 'web/.env.local').read_text())
        evaluation = (target / 'mlflow/evaluate_saved_feedback.py').read_text()
        self.assertIn('https://example.cloud.databricks.com/ml/experiments/', evaluation)
        for source in target.rglob('*.py'):
            self.assertNotIn('__WORKSPACE_', source.read_text())
            compile(source.read_text(), str(source), 'exec')

    def test_invalid_config_does_not_create_output(self):
        variants = [dict(self.config, app_schema='feedback_main'),
                    dict(self.config, pg_user='user\nPGPASSWORD=secret'),
                    dict(self.config, workspace_host='https://user:password@example.com'),
                    dict(self.config, workspace_user='../another-user'),
                    dict(self.config, raw_path='/Volumes/workspace/papaeats/raw'),
                    json.loads((self.kit / 'config.example.json').read_text())]
        for config in variants:
            with self.subTest(config=config):
                target = self.folder / 'invalid'
                with self.assertRaises(ValueError):
                    self.renderer.render(config, target, self.kit / 'template')
                self.assertFalse(target.exists())

    def test_existing_project_is_never_overwritten(self):
        target = self.folder / 'existing'
        target.mkdir()
        (target / 'keep.txt').write_text('existing work')
        with self.assertRaises(ValueError):
            self.renderer.render(self.config, target, self.kit / 'template')
        self.assertEqual((target / 'keep.txt').read_text(), 'existing work')


if __name__ == '__main__':
    unittest.main()
