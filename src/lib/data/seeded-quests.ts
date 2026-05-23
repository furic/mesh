// Starter quests so /quests isn't empty on first load.
//
// These are hand-written, not AI-generated, but they follow the same shape
// the Quest Generator produces (see src/lib/agents/quest-generator.ts) and
// target each suburb's weakest pillar per the seeded suburb scores.
//
// Once Supabase is wired and the DB has its own quests, these can either
// (a) live on as canonical examples seeded into the live DB or (b) move
// behind a "show example quests" toggle. For now they hydrate the in-
// memory quest store via questStore.init().

import type { GeneratedQuest } from '$lib/types'

export const SEEDED_QUESTS: Record<string, GeneratedQuest> = {
  carlton: {
    title:        'Carlton Library Friday-night kitchen swap',
    description:  'Carlton scores 27/100 on food security — the lowest of any pillar in this suburb. A weekly community-kitchen swap at the library brings residents into the same room, surfaces who has surplus, and seeds a regular food-sharing rhythm.',
    pillar:       'food_security',
    difficulty:   'medium',
    xp_reward:    300,
    steps: [
      { order: 1, description: 'Confirm the Carlton Library community room is available Friday evenings 6–8pm for the next four weeks.' },
      { order: 2, description: 'Post a one-page flyer at the library, Carlton Gardens noticeboard, and Lygon Street cafés. Include a contact number.' },
      { order: 3, description: 'Run the first session: bring one dish to share, swap surplus produce, exchange contact details. Photograph the table.' },
    ],
    participant_target: 4,
    ai_rationale:       'Carlton food-security signal is the weakest in the seeded data (27/100). A recurring third-place ritual — low-cost, library-supported — converts latent surplus into visible community capacity.',
    expires_days:       21,
  },

  fitzroy: {
    title:        'Atherton Gardens skill-swap evening',
    description:  'Fitzroy has strong third places but a thin skill-sharing layer. A two-hour skill-swap evening at the Atherton Gardens common room — bring something you can teach (knife sharpening, basic Auslan, simple bike repair) — kicks off a register of who can do what within 1 km.',
    pillar:       'skill_density',
    difficulty:   'easy',
    xp_reward:    100,
    steps: [
      { order: 1, description: 'Email Atherton Gardens residents association to book the common room for one Thursday evening.' },
      { order: 2, description: 'Run the first 90-minute session with three brought-along skills. Record each volunteer\'s name + skill on a shared list.' },
      { order: 3, description: 'Add the list to the Fitzroy noticeboard the next day so residents can request a follow-up.' },
    ],
    participant_target: 3,
    ai_rationale:       'Fitzroy\'s real social-indicator coverage shows strong social connectivity but weaker explicit skill density. A low-stakes, high-recurrence format builds the register agents will later draw on.',
    expires_days:       14,
  },

  brunswick: {
    title:        'Sydney Road tool-library at the Mechanics\' Institute',
    description:  'Brunswick already has the third-place infrastructure (Mechanics\' Institute) and a high density of renters who would borrow rather than buy. A tool-library starter kit — drill, sander, pressure washer, garden shears — turns shared capital into a recurring resource.',
    pillar:       'resource_sharing',
    difficulty:   'hard',
    xp_reward:    700,
    steps: [
      { order: 1, description: 'Approach the Brunswick Mechanics\' Institute to host the library; agree storage + opening hours.' },
      { order: 2, description: 'Crowdfund or council-grant the first six tools. Tag each with an inventory QR code.' },
      { order: 3, description: 'Recruit four founding members to staff a four-hour Saturday opening slot. Track each borrow + return.' },
      { order: 4, description: 'Publish a one-page report at the four-week mark: borrows, members, breakages, money in vs out.' },
    ],
    participant_target: 6,
    ai_rationale:       'Brunswick is data-sparse in our open feeds but the Merri-bek council has well-documented appetite for circular-economy initiatives. A tool library is a high-ceiling resource_sharing intervention with a clear venue.',
    expires_days:       45,
  },

  footscray: {
    title:        'Footscray heatwave check-in roster (>70s)',
    description:  'Footscray has the highest SEIFA disadvantage of our five suburbs (8/10) and a meaningful share of residents over 70 in walk-up flats. A volunteer-run heatwave check-in roster — pair each over-70 with a younger neighbour who calls during forecast 35°C+ days — measurably reduces heat-related ED visits in comparable suburbs.',
    pillar:       'emergency_preparedness',
    difficulty:   'medium',
    xp_reward:    300,
    steps: [
      { order: 1, description: 'Door-knock 20 over-70 residents in two adjacent streets to opt in. Get phone numbers + preferred contact times.' },
      { order: 2, description: 'Match each opted-in resident with one younger neighbour who agrees to phone on 35°C+ forecast days.' },
      { order: 3, description: 'Run a test call during the next forecast hot day. Log who answered, who didn\'t, what worked.' },
    ],
    participant_target: 5,
    ai_rationale:       'Footscray pairs high SEIFA disadvantage with an aging cohort in low-cooling housing — exactly the demographic heatwave-mortality models flag. The intervention is cheap and the evidence base is strong.',
    expires_days:       30,
  },

  richmond: {
    title:        'Bridge Road slow-Sunday walk',
    description:  'Richmond has third places but few low-friction ways for new residents to meet. A monthly Sunday-morning slow walk along the Yarra (Burnley to Hawthorn Bridge, ~3 km) — no destination, no leader, just a regular meet — creates the weak-tie connections that later become quest collaborations.',
    pillar:       'social_connectivity',
    difficulty:   'easy',
    xp_reward:    100,
    steps: [
      { order: 1, description: 'Pick a starting point (suggest: Burnley Park, 9 am). Confirm it works for prams + dogs.' },
      { order: 2, description: 'Post the date + meeting point on the Richmond community Facebook group and one physical noticeboard.' },
      { order: 3, description: 'Run the first walk. Take a group photo at the Hawthorn Bridge. Set the next month\'s date before everyone leaves.' },
    ],
    participant_target: 4,
    ai_rationale:       'Richmond\'s social-connectivity signal sits behind its third-place inventory because the existing third places are commercial (cafés, gyms). A free, recurring, low-effort ritual converts unused public space into social infrastructure.',
    expires_days:       28,
  },
}
