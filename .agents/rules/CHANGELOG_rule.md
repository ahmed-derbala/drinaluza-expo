---
trigger: always_on
---

# Rule: CHANGELOG.md Management

## Trigger
- Evaluate and update `CHANGELOG.md` whenever a feature is completed, a bug is fixed, a breaking change is introduced, or a new release/tag is prepared.
- Do NOT update the changelog for trivial changes (e.g., fixing typos in code comments, updating internal `.gitignore` rules, or updating agent instructions).

## Formatting Standards
1. **File Format:** Keep changes at the very top of the file, directly under the current version heading, 
2. **Changelog Format:** Strictly adhere to the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) standard.
3. **Allowed Groupings:** Categorize changes using *only* these exact subheadings:
   - `### Added` - For new features.
   - `### Changed` - For changes in existing functionality.
   - `### Deprecated` - For soon-to-be-removed features.
   - `### Removed` - For now-removed features.
   - `### Fixed` - For any bug fixes.
   - `### Security` - In case of vulnerabilities.

## Writing Style & Guidelines
- **Be Concise but Descriptive:** Write clear, one-line bullet points explaining *what* changed and *why*, from a developer/user perspective (not a raw commit message dump).
- **No Technical Jargon Overload:** Avoid pasting raw stack traces or internal variable names unless necessary for context.
- **Link Issues/PRs:** If the context or git history implies a specific issue number or Pull Request, append it to the end of the line (e.g., `(#123)`).
- **Do Not Invent Versions:** If modifying the `[Unreleased]` section, keep it as `## [Unreleased]`. Only create a new version heading (e.g., `## [1.2.0] - 2026-06-02`) if explicitly instructed to cut a new release.

## File length
max 100 lines