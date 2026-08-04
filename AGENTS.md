## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## ObsidianMind work log

ObsidianMind replaces `handoff.md` as the current-session handoff source.

- Record prompt, completed work, decisions, validation, and next steps through `record_work`.
- Write concise Korean sentences ending in `~함`, `~했음`, or `~필요함`.
- Do not save full AI responses. Save only context needed to resume the work.
- Use `search`/`recall` at session start instead of relying on `handoff.md`.
- Use `reason` for important design decisions.
- Keep `handoff.md` and `handoff_history.md` as legacy references only; do not update them for new work.

## Project working rules

- Keep `src/augments.json` limited to UI-facing data. Do not add internal condition or effect fields.
- Put developer-only augment details in `.documents/augments_explaination.md`.
- Insert `<br><br>` directly into augment descriptions when a line break is needed.
- Before implementing a feature, write or update the implementation plan and explain the mechanism.
- Before broad or structural changes, pause and ask for approval.
- Follow the applicable specialized agent skill under `.agents/skills/`.
- Do not commit, push, or deploy unless explicitly requested.
- Before any requested commit, inspect the complete diff and status, then write a concise Korean commit message.

At response completion, call ObsidianMind `record_work` with only a concise summary, changed files, decisions, validation, and next steps. Use Korean endings such as `~함`, `~했음`, and `~필요함`.
