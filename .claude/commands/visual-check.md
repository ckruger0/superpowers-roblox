Read and follow the skill at `skills/visual-check/SKILL.md`.

Use Roblox Studio MCP tools to position the camera and gather metadata. `execute_luau` returns the script's **return value** (not print output).

After positioning the camera and gathering metadata, use the `screen_capture` MCP tool to capture the Studio viewport. It returns the image directly — no file paths or shell commands needed.

Before making any changes, always check if Studio is in play mode: `execute_luau` with `return tostring(game:GetService("RunService"):IsRunning())`.
