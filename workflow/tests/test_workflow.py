"""Offline safety/identity checks; does not execute Spark or invoke AI."""
import ast
import hashlib
import json
from pathlib import Path
import re
import unittest

SOURCE = Path(__file__).parents[1] / 'src' / 'PapaEats Feedback Refresh.py'
CODE = SOURCE.read_text()
TREE = ast.parse(CODE)
CONSTANTS = {}
for node in TREE.body:
    if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
        try:
            CONSTANTS[node.targets[0].id] = ast.literal_eval(node.value)
        except (ValueError, TypeError):
            pass

class WorkflowTests(unittest.TestCase):
    def test_mask_contact_formats_and_preserve_issue_numbers(self):
        def mask(s):
            for pattern, token in [('EMAIL','[EMAIL]'),('UK_PHONE','[PHONE]'),('INTL_PHONE','[PHONE]')]:
                s = re.sub(CONSTANTS[pattern],token,s)
            return s
        self.assertEqual(mask('Call 07700 900190 or person@example.com'), 'Call [PHONE] or [EMAIL]')
        self.assertEqual(mask('07700-900190 and +1-234-567-8900'), '[PHONE] and [PHONE]')
        self.assertEqual(mask('Found Pho 24. CHK-500 on 4.2.1'), 'Found Pho 24. CHK-500 on 4.2.1')

    def test_in_app_identity_preserves_distinct_messages(self):
        identity = lambda user,text,time: hashlib.md5('|'.join([user,text,time]).encode()).hexdigest()
        self.assertNotEqual(identity('u1','great','t1'),identity('u1','broken','t1'))
        self.assertNotEqual(identity('u1','great','t1'),identity('u1','great','t2'))
        self.assertEqual(identity('u1','great','t1'),identity('u1','great','t1'))
        self.assertIn("md5(concat_ws('|',uid,msg,ts))", CODE)

    def test_single_classification_call_and_materialization(self):
        self.assertEqual(CODE.count('ai_classify('),1)
        self.assertEqual(CODE.count('ai_analyze_sentiment('),1)
        self.assertLess(CODE.index("save_stage(classified, 'ai_responses')"), CODE.index("try_variant_get(try_parse_json(classification_json)"))
        self.assertIn("pending = prepared.join(reused.select(*KEYS), KEYS, 'left_anti')",CODE)

    def test_publication_merges_full_keys_without_deleting_history(self):
        sql=[]
        class Data:
            def select(self,*columns): return self
            def createOrReplaceTempView(self,name): pass
        class Spark:
            def sql(self,statement): sql.append(statement)
        node=next(n for n in TREE.body if isinstance(n,ast.FunctionDef) and n.name=='merge_rows')
        ns={'spark':Spark(),'KEYS':['source','feedback_id']}
        exec(compile(ast.Module(body=[node],type_ignores=[]),str(SOURCE),'exec'),ns)
        ns['merge_rows'](Data(),'workspace.papaeats.feedback_clean',['source','feedback_id','message_text'])
        self.assertIn('t.source=s.source AND t.feedback_id=s.feedback_id',sql[0])
        self.assertIn('WHEN MATCHED AND',sql[0])
        self.assertIn('WHEN NOT MATCHED THEN INSERT',sql[0])
        self.assertNotIn('DELETE',sql[0])
        self.assertNotIn('issue_decisions',CODE)

    def test_default_interactive_mode_cannot_process_data(self):
        self.assertIn("('step', 'review')",CODE)
        self.assertIn("if STEP == 'review':",CODE)
        self.assertIn("Use the saved job so refresh_run_id",CODE)

if __name__ == '__main__':
    unittest.main()
