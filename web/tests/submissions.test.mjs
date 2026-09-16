import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSubmission,submissionId,terminalRun,failedRun,requestToken,currentTasks} from '../lib/submission-model.ts';
const id='d0b34f11-5578-4a1f-a12b-2651092b1087';
test('progress shows the latest task attempt even when the API returns old failures',()=>{
  const tasks=[{task_key:'prepare',attempt_number:1,state:{life_cycle_state:'RUNNING'}},{task_key:'prepare',attempt_number:0,state:{result_state:'FAILED'}}];
  assert.deepEqual(currentTasks(tasks),[{key:'prepare',state:'RUNNING'}]);
});
test('validate server input, normalize message, preserve stable identity',()=>{
  assert.deepEqual(validateSubmission({id,message:'  Payment fails every time.  ',rating:1}),{id,message:'Payment fails every time.',rating:1});
  assert.equal(validateSubmission({id,message:'A sufficiently long message.'}).rating,null);
  for (const bad of [{id,message:'short'},{id,message:'x'.repeat(2001)},{id,message:'Feedback with \0 null'},{id,message:[]},{id,message:'Feedback is valid.',rating:6},{id,message:'Feedback is valid.',rating:'1'},{id:'../etc',message:'Feedback is valid.'}])
    assert.throws(()=>validateSubmission(bad));
});
test('an uncertain run state must not allow a second run',()=>{
  for (const state of [undefined,{life_cycle_state:'RUNNING'},{life_cycle_state:'QUEUED'},{life_cycle_state:'PENDING'}]) assert.equal(terminalRun(state),false);
  assert.equal(failedRun({life_cycle_state:'TERMINATED',result_state:'FAILED'}),true);
  assert.equal(failedRun({life_cycle_state:'TERMINATED',result_state:'SUCCESS'}),false);
});
test('idempotency tokens survive retries and change only for a confirmed new attempt',()=>{
  assert.equal(submissionId(id),true);
  assert.equal(requestToken(id,0),requestToken(id,0));
  assert.notEqual(requestToken(id,0),requestToken(id,1));
  assert.ok(requestToken(id,100).length<=64);
});
