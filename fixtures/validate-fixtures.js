#!/usr/bin/env node
/**
 * validate-fixtures.js
 * Run: node src/fixtures/validate-fixtures.js
 * Validates all Kinetic fixture files against S1-W5-04 / FE_Response_Schemas.md
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

function check(label, obj, fields) {
  if (!obj && obj !== false && obj !== 0) throw new Error(`${label} is null/undefined`);
  const missing = fields.filter(f => !(f in obj));
  if (missing.length) throw new Error(`${label} — missing: ${missing.join(', ')}`);
}

function validateFormAnalysis(fixture) {
  check('root', fixture, [
    'analysis_id', 'session_id', 'user_id', 'exercise_id', 'exercise_slug',
    'display_name', 'weight_value', 'weight_unit', 'created_at', 'processed_at',
    'status', 'annotated_frame_url', 'summary', 'reps', 'coaching', 'progression',
  ]);

  check('summary', fixture.summary, [
    'overall_form_score', 'movement_quality_score', 'stability_score',
    'posture_score', 'tempo_score', 'rep_count', 'avg_rep_duration_s',
  ]);

  check('coaching', fixture.coaching, ['summary_paragraph', 'parameters']);
  check('coaching.parameters', fixture.coaching.parameters, ['posture', 'stability', 'movement_quality', 'tempo']);

  ['posture', 'stability', 'movement_quality', 'tempo'].forEach(p => {
    check(`coaching.parameters.${p}`, fixture.coaching.parameters[p], ['score', 'affirmation', 'observation', 'correction']);
  });

  check('progression', fixture.progression, [
    'recommendation', 'recommendation_score',
    'current_weight_value', 'current_weight_unit',
    'suggested_weight_value', 'suggested_weight_unit', 'reasoning',
  ]);

  const validRec = ['hold', 'progress', 'drop_weight'];
  if (!validRec.includes(fixture.progression.recommendation)) {
    throw new Error(`progression.recommendation must be one of [${validRec.join(', ')}], got: ${fixture.progression.recommendation}`);
  }

  fixture.reps.forEach((r, i) => {
    check(`reps[${i}]`, r, ['rep_number', 'form_score', 'movement_quality_score', 'stability_score', 'posture_score', 'tempo_score']);
  });
}

function validateFormAnalysisFailed(fixture) {
  if (!Array.isArray(fixture)) throw new Error('form-analysis.failed must be an array');
  const validRetryable = ['true', 'false', 'partial'];
  fixture.forEach((scenario, i) => {
    check(`[${i}]`, scenario, ['analysis_id', 'status', 'error_code', 'error_stage', 'retryable', 'title', 'message']);
    if (!validRetryable.includes(scenario.retryable)) {
      throw new Error(`[${i}].retryable must be one of [${validRetryable.join(', ')}], got: ${scenario.retryable}`);
    }
  });
}

function validateFormComparison(fixture) {
  check('root', fixture, ['has_comparison', 'empty_state_message', 'current', 'previous', 'comparison_coaching']);
}

function validateFormComparisonEmpty(fixture) {
  check('root', fixture, ['has_comparison', 'empty_state_message', 'current', 'previous', 'comparison_coaching']);
  if (fixture.has_comparison !== false) throw new Error('has_comparison must be false');
  if (fixture.current !== null) throw new Error('current must be null');
  if (fixture.previous !== null) throw new Error('previous must be null');
  if (fixture.comparison_coaching !== null) throw new Error('comparison_coaching must be null');
  const expected = 'Sorry you do not have any past form analysis done before this session. Try the next time you do a form analysis';
  if (fixture.empty_state_message !== expected) throw new Error('empty_state_message does not match exact copy from spec');
}

function validateSSE(fixture) {
  check('root', fixture, ['analysis_id', 'session_id', 'user_id', 'video_filename', 'video_size_mb', 'events', 'error_scenario']);

  const validEvents = new Set([
    'upload_received', 'mediapipe_started', 'mediapipe_complete',
    'biomechanics_complete', 'nemotron_started', 'nemotron_complete',
    'frames_extracting', 'frames_ready', 'rag_started', 'rag_complete',
    'claude_started', 'claude_complete', 'analysis_complete', 'error',
  ]);

  fixture.events.forEach((e, i) => {
    check(`events[${i}]`, e, ['seq', 'delay_ms', 'event', 'progress_pct', 'data']);
    if (!validEvents.has(e.event)) throw new Error(`events[${i}].event unknown: ${e.event}`);
  });

  if (!fixture.events.find(e => e.event === 'analysis_complete')) {
    throw new Error('Missing required analysis_complete event');
  }

  const errData = fixture.error_scenario?.event?.data;
  if (!errData) throw new Error('error_scenario.event.data missing');
  check('error_scenario.event.data', errData, ['error_code', 'error_stage', 'retryable']);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const FIXTURES = [
  { file: 'form-analysis.with-issues.json',      fn: validateFormAnalysis },
  { file: 'form-analysis.clean.json',            fn: validateFormAnalysis },
  { file: 'form-analysis.failed.json',           fn: validateFormAnalysisFailed },
  { file: 'form-comparison.json',                fn: validateFormComparison },
  { file: 'form-comparison.empty.json',          fn: validateFormComparisonEmpty },
  { file: 'sse-upload-progress.sequence.json',   fn: validateSSE },
];

let passed = 0;
let failed = 0;

console.log('\n🔍  Validating Kinetic fixtures (S1-W5-04 · FE_Response_Schemas.md)\n');

for (const { file, fn } of FIXTURES) {
  try {
    const fixture = JSON.parse(readFileSync(join(__dir, file), 'utf8'));
    fn(fixture);
    console.log(`  ✅  ${file}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${file}\n      ${err.message}`);
    failed++;
  }
}

console.log(`\n${passed + failed} fixtures checked — ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
