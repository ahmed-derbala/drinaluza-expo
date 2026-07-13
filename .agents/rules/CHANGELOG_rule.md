---
trigger: always_on
---

# RULE: AUTOMATIC CHANGELOG UPDATE (CONTEXT-BASED)

## Context
You are an AI development agent. Whenever a feature, bug fix, or refactor is completed or explicitly requested, you must automatically log it in `CHANGELOG.md`. Do NOT use or reference Git history, commits, or diffs for this task. Rely strictly on the immediate context of the files changed in this session or direct user instructions.

## Operational Rules

1. **Format Standard:** - Follow the "Keep a Changelog" standard.
   - Use the standard categories: `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`.

2. **Triggering the Update:**
   - Automatically append to the `CHANGELOG.md` when you complete a multi-file feature implementation.
   - group changes under an `## [version from package.json] day month year` block at the top of the file.

3. **Writing Style:**
   - Use the imperative mood (e.g., "Add business_owner role dashboard" instead of "Added dashboard").
   - Be concise and focus on the user-facing impact of the change, not low-level code implementation details (e.g., say "Fix token expiration issue" instead of "Change jwt.sign timeout variable").

4. **Preservation:**
   - **CRITICAL:** Do not overwrite, modify, or delete any existing historical versions in `CHANGELOG.md`. 
   - prepend a new `## [X.Y.Z] - day month year` block directly beneath the main title description.
   - file size is 50 lines maximum
   - do not update version in package.json, i will update it manually

## Target File Structure Example
Ensure your modifications look exactly like this structure:

```markdown
## [1.26.6] - 27 june 2026
### Added
- Feature description here.

### Fixed
- Bug fix description here.

## [1.0.0] - 1 may 2026
... historical logs ...
```