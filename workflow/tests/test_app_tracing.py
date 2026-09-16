"""Tracing failures must not repeat AI execution or hide processing failures."""
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch


class TracingTests(unittest.TestCase):
    def setUp(self):
        self.span = SimpleNamespace(set_inputs=Mock(), set_outputs=Mock(),
                                    set_attributes=Mock(), trace_id='tr-test')
        self.context = Mock()
        self.context.__enter__ = Mock(return_value=self.span)
        self.context.__exit__ = Mock(return_value=False)
        self.mlflow = SimpleNamespace(set_tracking_uri=Mock(),
            set_experiment=Mock(return_value=SimpleNamespace(experiment_id='123')),
            start_span=Mock(return_value=self.context), update_current_trace=Mock(),
            flush_trace_async_logging=Mock())
        self.result = Mock()
        self.result.select.return_value.collect.return_value = [
            {'classification_json': '{"category":"BUG_REPORT"}', 'sentiment': 'negative'}]
        self.fresh = Mock()
        self.fresh.select.return_value.collect.return_value = [SimpleNamespace(
            asDict=lambda: {'source': 'app_submission', 'feedback_id': 'saved-id',
                            'message_text': 'Payment failed. Contact [EMAIL].'})]
        self.save = Mock(return_value=self.result)
        self.env = dict(json=json, save_stage=self.save, spark=Mock(),
                        CLASSIFIER_VERSION='test-v1', SUBMISSION='saved-id', RUN='456')
        source = Path(__file__).resolve().parents[1] / 'app-submissions/tracing.py.fragment'
        exec(compile(source.read_text(), str(source), 'exec'), self.env)
        self.metrics = {}

    def run_helper(self):
        with patch.dict(sys.modules, mlflow=self.mlflow):
            return self.env['materialize_ai_traced']('lazy-ai-plan', self.fresh, self.metrics)

    def test_trace_has_masked_input_saved_output_and_identity(self):
        self.assertIs(self.run_helper(), self.result)
        self.span.set_inputs.assert_called_once_with({'messages': [
            {'source': 'app_submission', 'feedback_id': 'saved-id',
             'message_text': 'Payment failed. Contact [EMAIL].'}]})
        self.span.set_outputs.assert_called_once_with({'results': [
            {'classification': {'category': 'BUG_REPORT'}, 'sentiment': 'negative'}]})
        self.assertEqual(self.metrics['mlflow_trace_id'], 'tr-test')
        self.assertEqual([c.args[1] for c in self.save.call_args_list], ['ai_responses', 'trace'])

    def test_unavailable_tracking_still_materializes_exactly_once(self):
        self.mlflow.set_experiment.side_effect = RuntimeError('tracking unavailable')
        self.assertIs(self.run_helper(), self.result)
        self.save.assert_called_once_with('lazy-ai-plan', 'ai_responses')
        self.assertNotIn('mlflow_trace_id', self.metrics)

    def test_export_failure_never_repeats_classification(self):
        self.mlflow.flush_trace_async_logging.side_effect = RuntimeError('export unavailable')
        self.assertIs(self.run_helper(), self.result)
        self.save.assert_called_once_with('lazy-ai-plan', 'ai_responses')
        self.assertEqual(self.metrics['trace_warning'], 'RuntimeError')

    def test_ai_failure_propagates_without_retry(self):
        self.save.side_effect = ValueError('AI response write failed')
        with self.assertRaisesRegex(ValueError, 'AI response write failed'):
            self.run_helper()
        self.save.assert_called_once_with('lazy-ai-plan', 'ai_responses')
        self.assertEqual(self.context.__exit__.call_args.args[0], ValueError)


if __name__ == '__main__':
    unittest.main()
