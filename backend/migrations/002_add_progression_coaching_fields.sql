-- Migration 002: Add Progression Coaching Fields
-- Adds advanced diagnostic fields, re-adds issue_tags with a GIN index,
-- and restores range_of_motion_score as a direct parameter score.

-- 1. Re-add issue_tags as TEXT[] and create a GIN index on it
ALTER TABLE public.form_analysis_results ADD COLUMN IF NOT EXISTS issue_tags TEXT[];
CREATE INDEX IF NOT EXISTS idx_form_analysis_results_issue_tags ON public.form_analysis_results USING GIN (issue_tags);

-- 2. Add JSONB columns for advanced diagnostics and progression
ALTER TABLE public.form_analysis_results ADD COLUMN IF NOT EXISTS faults_detected JSONB;
ALTER TABLE public.form_analysis_results ADD COLUMN IF NOT EXISTS fault_confidence JSONB;
ALTER TABLE public.form_analysis_results ADD COLUMN IF NOT EXISTS causal_chains JSONB;
ALTER TABLE public.form_analysis_results ADD COLUMN IF NOT EXISTS fault_detail JSONB;
ALTER TABLE public.form_analysis_results ADD COLUMN IF NOT EXISTS trends JSONB;

-- 3. Restore range_of_motion_score now that v3.0 uses ROM (35% weight)
ALTER TABLE public.form_analysis_results ADD COLUMN IF NOT EXISTS range_of_motion_score INT4;
