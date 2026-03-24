Read and follow the skill at `skills/add-asset/SKILL.md`.

Use the `insert_from_creator_store` MCP tool to search and insert Creator Store models in a single call. It returns a GUID tag to reference the inserted model via `CollectionService:GetTagged("Assistant:<GUID>")`.

If the first result isn't right, use the alternative asset IDs returned by the tool, or search again with a different query.

`execute_luau` returns the script's **return value** (not print output).

Before making any changes, always check if Studio is in play mode: `execute_luau` with `return tostring(game:GetService("RunService"):IsRunning())`.
