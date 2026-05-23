// Domain types for the MESH frontend.
// During Sprint 0–2 these are hand-authored. Once Sprint 2 lands and we run
// `supabase gen types`, generated DB types will live alongside this file and
// the domain types will narrow to view-models.

export type QuestPillar =
  | 'food_security'
  | 'skill_density'
  | 'resource_sharing'
  | 'social_connectivity'
  | 'emergency_preparedness'

export interface PillarScores {
  food: number
  skills: number
  resources: number
  social: number
  emergency: number
}

export interface Suburb {
  id: string
  name: string
  postcode: string
  lat: number
  lng: number
  seifa_score: number    // 1–10, 10 = most disadvantaged
  population: number
  scores: PillarScores   // each 0–100
  r_index: number        // average of pillar scores
  xp_total: number
  level: number
}

export const PILLAR_LABELS: Record<QuestPillar, string> = {
  food_security:          'Food security',
  skill_density:          'Skill density',
  resource_sharing:       'Resource sharing',
  social_connectivity:    'Social connectivity',
  emergency_preparedness: 'Emergency preparedness',
}

export type QuestDifficulty = 'easy' | 'medium' | 'hard'

export interface QuestStep {
  order:       number
  description: string
}

// Snapshot of the inputs the Quest Generator saw at generation time. Optional
// because seeded starter quests don't carry one. Persists with the quest in
// localStorage so the "how was this created" panel survives a refresh.
export interface QuestDataSnapshot {
  suburb_name:    string
  postcode:       string
  seifa_score:    number
  population:     number
  season:         'summer' | 'autumn' | 'winter' | 'spring'
  pillar_scores:  PillarScores
  weakest_pillar: QuestPillar
  weakest_score:  number
}

export interface GeneratedQuest {
  title:              string
  description:        string
  pillar:             QuestPillar
  difficulty:         QuestDifficulty
  xp_reward:          number          // easy=100, medium=300, hard=700
  steps:              QuestStep[]     // 3–5 steps
  participant_target: number
  ai_rationale:       string
  expires_days:       number
  // ── Optional generation metadata (set by /api/quests; not on seeded starters) ──
  data_snapshot?:     QuestDataSnapshot
  model?:             string
  generated_at?:      string          // ISO timestamp
}

// Persisted DB row shapes — re-exported from the hand-typed db.ts so that
// components can import everything they need from $lib/types. Replace these
// with `supabase gen types` output once the Supabase project is provisioned.
export type {
  DbQuest as Quest,
  DbQuestParticipant as QuestParticipant,
  DbQuestSubmission as QuestSubmission,
  DbResource as Resource,
  DbResourceMatch as ResourceMatch,
  DbSuburbNarrative as SuburbNarrative,
  DbProfile as Profile,
  DbXpLedger as XpLedger,
  SubmissionVerdictEnum as SubmissionVerdict,
  QuestStatusEnum as QuestStatus,
  QuestSourceEnum as QuestSource,
  ResourceTypeEnum as ResourceType,
  ResourceCategoryEnum as ResourceCategory,
  ResourceStatusEnum as ResourceStatus,
  SuburbDataSource,
} from './db'
