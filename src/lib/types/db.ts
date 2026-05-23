// Hand-typed mirror of the Supabase schema (supabase/migrations/*).
// Replace with `supabase gen types typescript --linked > src/lib/types/db.ts`
// once Sprint 2's Supabase project is provisioned. Until then, keep these in
// sync with the migrations by hand.
//
// PostGIS geography(point, 4326) columns are typed as `string | null` (WKT)
// because `supabase gen types` doesn't model PostGIS structurally.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type QuestPillarEnum =
  | 'food_security'
  | 'skill_density'
  | 'resource_sharing'
  | 'social_connectivity'
  | 'emergency_preparedness';

export type QuestDifficultyEnum = 'easy' | 'medium' | 'hard';
export type QuestStatusEnum     = 'draft' | 'active' | 'completed' | 'expired';
export type QuestSourceEnum     = 'ai_generated' | 'resident_proposed' | 'council';
export type SubmissionVerdictEnum = 'pending' | 'approved' | 'needs_more' | 'rejected';
export type ResourceTypeEnum     = 'offer' | 'need';
export type ResourceCategoryEnum =
  | 'food' | 'tools' | 'skills' | 'space' | 'materials' | 'transport' | 'other';
export type ResourceStatusEnum   = 'open' | 'matched' | 'closed';
export type SuburbDataSource     = 'real' | 'partial' | 'mock';

type SuburbRow = {
  id:               string;
  slug:             string;
  name:             string;
  postcode:         string | null;
  lga:              string | null;
  location:         string | null;          // geography(point, 4326) WKT
  geojson:          Json | null;
  seifa_score:      number | null;
  population:       number | null;
  score_food:       number;
  score_skills:     number;
  score_resources:  number;
  score_social:     number;
  score_emergency:  number;
  r_index:          number;                  // generated column
  xp_total:         number;
  level:            number;
  data_source:      SuburbDataSource;
  updated_at:       string;
}

type SuburbInsert = {
  id?:              string;
  slug:             string;
  name:             string;
  postcode?:        string | null;
  lga?:             string | null;
  location?:        string | null;
  geojson?:         Json | null;
  seifa_score?:     number | null;
  population?:      number | null;
  score_food?:      number;
  score_skills?:    number;
  score_resources?: number;
  score_social?:    number;
  score_emergency?: number;
  xp_total?:        number;
  level?:           number;
  data_source?:     SuburbDataSource;
  updated_at?:      string;
}

type SuburbUpdate = Partial<SuburbInsert>;

type ProfileRow = {
  id:            string;
  display_name:  string | null;
  avatar_url:    string | null;
  suburb_id:     string | null;
  xp_total:      number;
  level:         number;
  badges:        string[];
  is_admin:      boolean;
  created_at:    string;
}

type ProfileInsert = {
  id:            string;
  display_name?: string | null;
  avatar_url?:   string | null;
  suburb_id?:    string | null;
  xp_total?:     number;
  level?:        number;
  badges?:       string[];
  is_admin?:     boolean;
  created_at?:   string;
}

type ProfileUpdate = Partial<Omit<ProfileInsert, 'id'>>;

type QuestRow = {
  id:                  string;
  suburb_id:           string;
  title:               string;
  description:         string;
  pillar:              QuestPillarEnum;
  difficulty:          QuestDifficultyEnum;
  source:              QuestSourceEnum;
  xp_reward:           number;
  steps:               Json;                              // QuestStep[]
  participant_target:  number;
  status:              QuestStatusEnum;
  expires_at:          string | null;
  ai_rationale:        string | null;
  data_snapshot:       Json | null;
  created_at:          string;
  updated_at:          string;
}

type QuestInsert = {
  id?:                 string;
  suburb_id:           string;
  title:               string;
  description:         string;
  pillar:              QuestPillarEnum;
  difficulty:          QuestDifficultyEnum;
  source?:             QuestSourceEnum;
  xp_reward:           number;
  steps:               Json;
  participant_target?: number;
  status?:             QuestStatusEnum;
  expires_at?:         string | null;
  ai_rationale?:       string | null;
  data_snapshot?:      Json | null;
  created_at?:         string;
  updated_at?:         string;
}

type QuestUpdate = Partial<QuestInsert>;

type QuestParticipantRow = {
  id:         string;
  quest_id:   string;
  user_id:    string;
  joined_at:  string;
}

type QuestParticipantInsert = {
  id?:        string;
  quest_id:   string;
  user_id:    string;
  joined_at?: string;
}

type QuestParticipantUpdate = Partial<QuestParticipantInsert>;

type QuestSubmissionRow = {
  id:                  string;
  quest_id:            string;
  user_id:             string;
  description:         string;
  photo_urls:          string[];
  participant_count:   number;
  verdict:             SubmissionVerdictEnum;
  ai_confidence:       number | null;
  ai_reason:           string | null;
  xp_multiplier:       number;
  xp_awarded:          number | null;
  needs_human_review:  boolean;
  reviewed_by:         string | null;
  reviewed_at:         string | null;
  created_at:          string;
}

type QuestSubmissionInsert = {
  id?:                 string;
  quest_id:            string;
  user_id:             string;
  description:         string;
  photo_urls?:         string[];
  participant_count?:  number;
  verdict?:            SubmissionVerdictEnum;
  ai_confidence?:      number | null;
  ai_reason?:          string | null;
  xp_multiplier?:      number;
  xp_awarded?:         number | null;
  needs_human_review?: boolean;
  reviewed_by?:        string | null;
  reviewed_at?:        string | null;
  created_at?:         string;
}

type QuestSubmissionUpdate = Partial<QuestSubmissionInsert>;

type ResourceRow = {
  id:             string;
  user_id:        string;
  suburb_id:      string | null;
  type:           ResourceTypeEnum;
  category:       ResourceCategoryEnum;
  title:          string;
  description:    string;
  quantity:       string | null;
  is_perishable:  boolean;
  expires_at:     string | null;
  status:         ResourceStatusEnum;
  match_ids:      string[];
  location:       string | null;
  created_at:     string;
}

type ResourceInsert = {
  id?:            string;
  user_id:        string;
  suburb_id?:     string | null;
  type:           ResourceTypeEnum;
  category:       ResourceCategoryEnum;
  title:          string;
  description:    string;
  quantity?:      string | null;
  is_perishable?: boolean;
  expires_at?:    string | null;
  status?:        ResourceStatusEnum;
  match_ids?:     string[];
  location?:      string | null;
  created_at?:    string;
}

type ResourceUpdate = Partial<ResourceInsert>;

type ResourceMatchRow = {
  id:            string;
  resource_a:    string;
  resource_b:    string;
  ai_reason:     string | null;
  intro_message: string | null;
  suburb_a:      string | null;
  suburb_b:      string | null;
  created_at:    string;
}

type ResourceMatchInsert = {
  id?:           string;
  resource_a:    string;
  resource_b:    string;
  ai_reason?:    string | null;
  intro_message?: string | null;
  suburb_a?:     string | null;
  suburb_b?:     string | null;
  created_at?:   string;
}

type ResourceMatchUpdate = Partial<ResourceMatchInsert>;

type SuburbNarrativeRow = {
  id:           string;
  suburb_id:    string;
  week_start:   string;
  narrative:    string;
  score_delta:  Json | null;
  focus_pillar: QuestPillarEnum | null;
  created_at:   string;
}

type SuburbNarrativeInsert = {
  id?:          string;
  suburb_id:    string;
  week_start:   string;
  narrative:    string;
  score_delta?: Json | null;
  focus_pillar?: QuestPillarEnum | null;
  created_at?:  string;
}

type SuburbNarrativeUpdate = Partial<SuburbNarrativeInsert>;

type DataSnapshotRow = {
  id:         string;
  suburb_id:  string | null;
  snapshot:   Json;
  synced_at:  string;
}

type DataSnapshotInsert = {
  id?:        string;
  suburb_id?: string | null;
  snapshot:   Json;
  synced_at?: string;
}

type DataSnapshotUpdate = Partial<DataSnapshotInsert>;

type XpLedgerRow = {
  id:            string;
  user_id:       string | null;
  suburb_id:     string | null;
  amount:        number;
  reason:        string;
  reference_id:  string | null;
  created_at:    string;
}

type XpLedgerInsert = {
  id?:           string;
  user_id?:      string | null;
  suburb_id?:    string | null;
  amount:        number;
  reason:        string;
  reference_id?: string | null;
  created_at?:   string;
}

type XpLedgerUpdate = Partial<XpLedgerInsert>;

type SuburbLeaderboardRow = {
  id:                string | null;
  slug:              string | null;
  name:              string | null;
  r_index:           number | null;
  level:             number | null;
  xp_total:          number | null;
  active_residents:  number | null;
  active_quests:     number | null;
}

// Each Tables entry below is hand-written with the `Relationships: []` field
// that postgrest-js's GenericTable constraint requires for select-query type
// inference. (Wrapping these in a `type Table<R,I,U>` helper breaks postgrest-
// js's conditional-type unwrapping — keep them inlined.)

type CommunityFacilityRow = {
  id:         string;
  suburb_id:  string | null;
  source:     string;
  source_id:  string | null;
  theme:      string;
  sub_theme:  string | null;
  name:       string;
  location:   string;
  created_at: string;
}
type CommunityFacilityInsert = {
  id?:        string;
  suburb_id?: string | null;
  source:     string;
  source_id?: string | null;
  theme:      string;
  sub_theme?: string | null;
  name:       string;
  location:   string;
  created_at?: string;
}
type CommunityFacilityUpdate = Partial<Omit<CommunityFacilityInsert, 'source'>>;

export type Database = {
  public: {
    Tables: {
      suburbs:              { Row: SuburbRow;             Insert: SuburbInsert;             Update: SuburbUpdate;             Relationships: [] };
      community_facilities: { Row: CommunityFacilityRow;  Insert: CommunityFacilityInsert;  Update: CommunityFacilityUpdate;  Relationships: [] };
      profiles:             { Row: ProfileRow;            Insert: ProfileInsert;            Update: ProfileUpdate;            Relationships: [] };
      quests:               { Row: QuestRow;              Insert: QuestInsert;              Update: QuestUpdate;              Relationships: [] };
      quest_participants:   { Row: QuestParticipantRow;   Insert: QuestParticipantInsert;   Update: QuestParticipantUpdate;   Relationships: [] };
      quest_submissions:    { Row: QuestSubmissionRow;    Insert: QuestSubmissionInsert;    Update: QuestSubmissionUpdate;    Relationships: [] };
      resources:            { Row: ResourceRow;           Insert: ResourceInsert;           Update: ResourceUpdate;           Relationships: [] };
      resource_matches:     { Row: ResourceMatchRow;      Insert: ResourceMatchInsert;      Update: ResourceMatchUpdate;      Relationships: [] };
      suburb_narratives:    { Row: SuburbNarrativeRow;    Insert: SuburbNarrativeInsert;    Update: SuburbNarrativeUpdate;    Relationships: [] };
      data_snapshots:       { Row: DataSnapshotRow;       Insert: DataSnapshotInsert;       Update: DataSnapshotUpdate;       Relationships: [] };
      xp_ledger:            { Row: XpLedgerRow;           Insert: XpLedgerInsert;           Update: XpLedgerUpdate;           Relationships: [] };
    };
    Views: {
      suburb_leaderboard: { Row: SuburbLeaderboardRow; Relationships: [] };
    };
    Enums: {
      quest_pillar:       QuestPillarEnum;
      quest_difficulty:   QuestDifficultyEnum;
      quest_status:       QuestStatusEnum;
      quest_source:       QuestSourceEnum;
      submission_verdict: SubmissionVerdictEnum;
      resource_type:      ResourceTypeEnum;
      resource_category:  ResourceCategoryEnum;
      resource_status:    ResourceStatusEnum;
    };
    Functions:      Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience aliases for common Row shapes — easier to import in components.
export type DbSuburb           = SuburbRow;
export type DbProfile          = ProfileRow;
export type DbQuest            = QuestRow;
export type DbQuestParticipant = QuestParticipantRow;
export type DbQuestSubmission  = QuestSubmissionRow;
export type DbResource         = ResourceRow;
export type DbResourceMatch    = ResourceMatchRow;
export type DbSuburbNarrative  = SuburbNarrativeRow;
export type DbXpLedger         = XpLedgerRow;
