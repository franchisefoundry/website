/**
 * CRM pipeline helpers — the single source of truth for stage vocabulary in the
 * ported admin CRM. Everything here is wired to the REAL database, verified
 * against the live check constraints (2026-08-23):
 *
 *   franchisee_profiles.pipeline_stage  (the franchisee journey — 8 stages)
 *     new_enquiry → profile_complete → matches_sent → brand_shortlisted →
 *     meeting_booked → intro_made → agreement_sent → signed
 *
 *   matches.pipeline_stage              (per matched-brand — 5 stages)
 *     match_assigned → match_approved → meeting_booked → agreement_sent →
 *     agreement_signed
 *
 * IMPORTANT — leads vs franchisees are TWO different records (do NOT merge, as
 * the standalone CRM demo did):
 *   • `leads`             = pre-portal quiz submissions (no auth user yet).
 *                           Not on this pipeline; they get converted → franchisee.
 *   • `franchisee_profiles` = real portal users (via `profiles`). These are the
 *                           records the journey stepper below applies to.
 * A "franchisee record" in the CRM is a franchisee_profile; a "lead" is a lighter
 * record with its own (much shorter) lifecycle. Keep them distinct at the port.
 */
import {
  FRANCHISEE_PIPELINE_STAGES,
  MATCH_PIPELINE_STAGES,
  type FranchiseePipelineStage,
  type MatchPipelineStage,
} from '@/lib/supabase/types'

export { FRANCHISEE_PIPELINE_STAGES, MATCH_PIPELINE_STAGES }
export type { FranchiseePipelineStage, MatchPipelineStage }

/** Zero-based position of a franchisee stage in the journey (defaults to first). */
export function franchiseeStageIndex(stage: FranchiseePipelineStage | null | undefined): number {
  const i = FRANCHISEE_PIPELINE_STAGES.findIndex(s => s.value === (stage ?? 'new_enquiry'))
  return i === -1 ? 0 : i
}

/** The franchisee stage descriptor (value/label/emoji) for a given stage. */
export function franchiseeStage(stage: FranchiseePipelineStage | null | undefined) {
  return FRANCHISEE_PIPELINE_STAGES[franchiseeStageIndex(stage)]
}

/** The next franchisee stage in the journey, or null if already at the end. */
export function nextFranchiseeStage(
  stage: FranchiseePipelineStage | null | undefined,
): FranchiseePipelineStage | null {
  const i = franchiseeStageIndex(stage)
  return FRANCHISEE_PIPELINE_STAGES[i + 1]?.value ?? null
}

/** True when the franchisee has reached the final stage (`signed`). */
export function isFranchiseeStageTerminal(stage: FranchiseePipelineStage | null | undefined): boolean {
  return franchiseeStageIndex(stage) >= FRANCHISEE_PIPELINE_STAGES.length - 1
}

/** Progress through the franchisee journey as a 0–1 fraction. */
export function franchiseeStageProgress(stage: FranchiseePipelineStage | null | undefined): number {
  return franchiseeStageIndex(stage) / (FRANCHISEE_PIPELINE_STAGES.length - 1)
}

/** Zero-based position of a match stage (defaults to first). */
export function matchStageIndex(stage: MatchPipelineStage | null | undefined): number {
  const i = MATCH_PIPELINE_STAGES.findIndex(s => s.value === (stage ?? 'match_assigned'))
  return i === -1 ? 0 : i
}
