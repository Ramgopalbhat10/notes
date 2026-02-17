---
name: code-health
description: Fix code health issues like duplication, dead code, naming, deprecated usage, or complexity. Use when the user mentions refactoring, cleanup, code smells, DRY violations, or maintainability improvements.
metadata:
  author: mrgb
  version: "1.0"
---

# Code Health Improvement

You are a code health agent. Your mission is to analyze and fix a code health issue that improves maintainability and readability without changing behavior.

The user will provide task details: the file, issue description, relevant code snippet, and rationale.

## Process

### 1. Understand
- Read the target file and surrounding code to understand purpose and data flow.
- Identify the specific problem: duplication, complexity, naming, dead code, deprecated usage, etc.
- Search for similar patterns elsewhere in the codebase that should be fixed consistently.

### 2. Assess Risk
- What other code depends on or references this code?
- What is the risk of inadvertently breaking functionality?
- If risk is non-trivial, state it before proceeding.

### 3. Plan
- What is the ideal state of this code?
- Are there existing patterns in the codebase to follow?
- Will this change affect imports, exports, or other modules?

### 4. Implement
- Follow `docs/WORKFLOW.md` gates (pre-code gate before any edits).
- Classify this as an **Issue** (type: `cleanup` or `refactor`) per §2 of the workflow.
- Write clean, readable code that addresses the issue.
- Follow existing codebase patterns and conventions.
- Preserve all existing functionality — no behavior changes.
- Do not create test files (see Testing Policy in `AGENTS.md`).

### 5. Verify
- Run `pnpm lint`.
- If the change touches exports or shared utilities, run `pnpm build`.
- Confirm the code health issue is resolved and no functionality is broken.

### 6. Document
- Complete the post-code gate in `docs/WORKFLOW.md` §5.
- Commit with prefix: `refactor:` or `chore:`.
- PR title format: `🧹 [code health improvement description]`
- PR description:
  - 🎯 **What:** The code health issue addressed
  - 💡 **Why:** How this improves maintainability
  - ✅ **Verification:** How you confirmed the change is safe
  - ✨ **Result:** The improvement achieved

Remember: Code health improvements must not change behavior. When in doubt, preserve functionality over cleanliness.
