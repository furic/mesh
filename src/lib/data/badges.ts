// Badge catalogue. profiles.badges (text[]) holds badge IDs; this map gives
// each ID a label + one-line description for display. Earnable conditions are
// enforced by the agents (Verifier / Matchmaker), not by the UI.

export interface BadgeDef {
  id:          string;
  label:       string;
  description: string;
  // Single capital letter rendered as the badge mark — keeps the visual
  // language consistent with the pillar tags on /pitch.
  glyph:       string;
  hue:         string;
}

export const BADGES: Record<string, BadgeDef> = {
  first_quest: {
    id:          'first_quest',
    label:       'First Quest',
    description: 'Joined your first MESH quest.',
    glyph:       '1',
    hue:         '#8bb6ff',
  },
  five_quests: {
    id:          'five_quests',
    label:       'Five Strong',
    description: 'Completed five quests across any pillar.',
    glyph:       '5',
    hue:         '#caa5d6',
  },
  pillar_food: {
    id:          'pillar_food',
    label:       'Food Folk',
    description: 'Three completed food-security quests in your suburb.',
    glyph:       'F',
    hue:         '#7fc497',
  },
  pillar_social: {
    id:          'pillar_social',
    label:       'Weaver',
    description: 'Connected two residents who needed each other.',
    glyph:       'C',
    hue:         '#e8a23e',
  },
  pioneer: {
    id:          'pioneer',
    label:       'Pioneer',
    description: 'Top-50 resident in your suburb in the first month.',
    glyph:       'P',
    hue:         '#e8a23e',
  },
  generous: {
    id:          'generous',
    label:       'Generous',
    description: 'Three resources offered to neighbours.',
    glyph:       'G',
    hue:         '#7fc497',
  },
  swift: {
    id:          'swift',
    label:       'Swift Response',
    description: 'Submitted a quest within 24h of accepting it.',
    glyph:       'S',
    hue:         '#8bb6ff',
  },
  prep: {
    id:          'prep',
    label:       'Prepared',
    description: 'Completed an emergency-preparedness quest.',
    glyph:       'E',
    hue:         '#d76f5b',
  },
  skill_share: {
    id:          'skill_share',
    label:       'Skill Share',
    description: 'Hosted a free skill-sharing session.',
    glyph:       'S',
    hue:         '#caa5d6',
  },
};

export function badgeDef(id: string): BadgeDef {
  return (
    BADGES[id] ?? {
      id,
      label:       id,
      description: 'Custom badge',
      glyph:       (id[0] ?? '?').toUpperCase(),
      hue:         '#8bb6ff',
    }
  );
}
