Read and follow the skill at `skills/build/SKILL.md`.

This is a CONVERSATIONAL world builder. Ask the creator about their vision before placing anything.

Uses `add-asset` skill internally for each object. Uses `screenshot` skill to screenshot and verify after each batch.

Use `insert_from_creator_store` MCP tool to search and insert Creator Store models in a single call. It returns a GUID tag to reference the inserted model via `CollectionService:GetTagged("Assistant:<GUID>")`.

Use `screen_capture` MCP tool to capture the Studio viewport for visual verification.

If Creator Store has nothing suitable, try `generate_mesh` to create a custom mesh before falling back to primitives.

`execute_luau` returns the script's **return value** (not print output).

Before making any changes, always check if Studio is in play mode: `execute_luau` with `return tostring(game:GetService("RunService"):IsRunning())`.
