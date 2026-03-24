# Mediocre Obby — Intentional Design Flaws

This test game is deliberately bad. Each flaw should be caught by one of the game design skills.

## Flaw List

| # | Flaw | Should be caught by | How to verify |
|---|------|---------------------|---------------|
| 1 | Spawn faces a wall (rotated 180 degrees) | `/spatial-flow` | Spawn orientation report shows player faces wall |
| 2 | No visual breadcrumb to first platform | `/spatial-flow` | Sightline analysis shows no large objects in spawn direction |
| 3 | First jump is the hardest (18 studs) | `/playtest-audit` | Difficulty curve shows inverted progression |
| 4 | Model named "MysteryDoor" with no script | `/spatial-flow` | Affordance trap detection flags it |
| 5 | No score, collectibles, or reward system | `/game-design-audit` | Core loop rated red, no score/reward scripts found |
| 6 | All jumps after the first are identical (8 studs) | `/game-design-audit` | Progression rated red, no escalation |
| 7 | Falling into void has no respawn message | `/playtest-audit` | Player dies with no feedback |
| 8 | 20-stud flat section with nothing on it | `/playtest-audit` | Pacing dead zone detected |

## Build Instructions (Roblox Studio)

1. Create a new Baseplate place
2. Delete the default baseplate
3. Add a SpawnLocation — rotate it to face a wall (set Orientation Y to 180)
4. Place a tall wall Part 5 studs in front of spawn (this is what the player sees first)
5. Behind the player (the "correct" direction), place platforms:
   - Platform 1: 18 studs from spawn (the hard jump)
   - Platforms 2-6: each 8 studs apart (identical, no escalation)
   - One 20-stud long flat platform with nothing on it (pacing dead zone)
6. Add a Model named "MysteryDoor" near the path — give it a door-like shape but NO scripts, NO ClickDetector
7. Do NOT add any scripts for scoring, collectibles, or UI
8. Leave the void open below platforms (no kill brick, no respawn script — just the default void behavior)
9. Save as `test-games/mediocre-obby.rbxl`
