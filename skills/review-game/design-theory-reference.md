# Design Theory Reference

Quick reference for game design principles used in the audit. These are tools for understanding, not checklists to enforce. Apply the ones that are relevant to the creator's goals.

## Core Loop (Koster)

"Fun is the feedback the brain gives when absorbing patterns."

A core loop needs:
- **Verb** — a clear action (jump, collect, fight, build, explore)
- **Feedback** — the player knows it worked (visual, audio, score, physics)
- **Mastery curve** — the pattern gets more complex over time
- **Reward** — something that reinforces the behavior

**Red flag:** The loop exists but never changes. The brain masters it and moves on.

## Flow (Csikszentmihalyi)

Fun lives in the channel between boredom (too easy) and anxiety (too hard).

- Challenge must match skill level
- As skill increases, challenge must increase proportionally
- The player should feel "I can do this, but I have to try"

**Red flag:** Difficulty is flat, random, or front-loaded.

## Feedback (Schell, Lens #46)

"What is the minimum feedback that will make the player understand what's happening?"

Every player action should have a visible/audible response:
- Success: particles, score increment, sound, animation
- Failure: screen shake, death animation, loss message
- Progress: UI update, world change, unlocked area

**Red flag:** Player does something and nothing visibly happens.

## Stakes

A game without consequences is a toy — fun for a moment, forgotten quickly.

Stakes can be:
- **Loss** — you can die, lose points, lose time
- **Investment** — you've built something you don't want to lose
- **Social** — leaderboard, competition, reputation
- **Curiosity** — "what's behind that door?" (low stakes but compelling)

**Red flag:** Nothing is at risk. The player can't fail meaningfully.

## Onboarding (Nintendo Philosophy)

"If you need a tutorial, your design has failed."

The first level IS the tutorial. Players learn by doing:
- First action should be obvious from the environment
- Introduce one mechanic at a time
- Safe space to experiment before stakes kick in
- Visual cues > text instructions

**Red flag:** Player spawns with no idea what to do. Text tutorial required.

## Pacing

Great games alternate tension and release:
- Action → calm → action (not constant intensity)
- Each section should feel different from the last
- Dead zones (long sections with nothing happening) break engagement

**Red flag:** Long stretches with no events, decisions, or discoveries.

## Spatial Design

- **Sightlines** — players follow their eyes. Big/bright objects are magnets.
- **Breadcrumbs** — objects leading toward the intended path
- **Dead ends** — every path should lead somewhere meaningful
- **Affordances** — if it looks interactive, it should be. If it's not interactive, it shouldn't look like it is.

## Social Design (Roblox-specific)

Roblox's core value is social play:
- Is there a reason to play WITH others? (cooperation, competition, shared discovery)
- Can players see each other's progress?
- Are there moments that create stories players would share?

## The 113 Lenses (Schell)

The Art of Game Design provides 113 "lenses" — questions to ask about your design. Key ones for Roblox experiences:

- **Lens #1 (Emotion):** What emotions should the player feel?
- **Lens #2 (Essential Experience):** What is the experience you're trying to create?
- **Lens #7 (Endogenous Value):** Why do items/scores matter within the game world?
- **Lens #34 (Skill):** Does the game demand genuine skill that improves with practice?
- **Lens #46 (Feedback):** What's the minimum feedback needed?
- **Lens #56 (Accessibility):** Can someone who's never played figure it out?
- **Lens #72 (Projection):** Where does the player look first?
- **Lens #79 (Freedom):** Does the player feel in control of their experience?
