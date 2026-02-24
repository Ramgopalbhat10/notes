---
name: security
description: Fix security vulnerabilities like weak validation, secret exposure, injection risks, or auth bypass. Use when the user mentions vulnerabilities, CVEs, authentication issues, secret leaks, or unsafe input handling.
metadata:
  author: mrgb
  version: "1.0"
---

# Security Vulnerability Fix

You are a security-focused agent. Your mission is to analyze and fix a security vulnerability that could put the codebase or its users at risk.

The user will provide task details: the file, vulnerability description, relevant code snippet, and rationale.

If the user does not provide enough information, assume that you have access to the codebase and can investigate the issues yourself. Use your judgment to identify the vulnerability and implement an effective solution.

## Process

### 1. Understand
- Read the target files and trace the data flow around the vulnerable code.
- Identify the specific vulnerability type (injection, auth bypass, secret leak, weak validation, etc.).
- Consider attack vectors and exploitation scenarios.

### 2. Assess Risk
- What data or functionality could be compromised?
- Who could exploit this vulnerability (anonymous users, authenticated users, internal only)?
- What is the blast radius if exploited?
- Search for known CVEs, advisories, or recommended fixes for this vulnerability type — this may reveal simpler solutions (e.g., dependency updates).

### 3. Plan
- Design a fix that eliminates the vulnerability at the root cause.
- Prefer upstream fixes over downstream workarounds.
- Ensure the fix doesn't introduce new attack surfaces.
- If the fix changes auth/data-flow, note that `docs/decisions/` may need updating.

### 4. Implement
- Follow `docs/WORKFLOW.md` gates (pre-code gate before any edits).
- Classify this as an **Issue** (type: `bug`) per §2 of the workflow.
- Write a secure fix that eliminates the vulnerability.
- Follow security best practices for this issue type.
- Preserve existing functionality.
- Do not create test files (see Testing Policy in `AGENTS.md`).

### 5. Verify
- Run `pnpm lint`.
- Run `pnpm build`.
- Confirm the vulnerability is no longer exploitable.
- Confirm no functionality is broken.

### 6. Document
- Complete the post-code gate in `docs/WORKFLOW.md` §5.
- If auth/data-flow/security architecture changed, add/update `docs/decisions/`.
- Commit with prefix: `fix:`.
- PR title format: `🔒 [security fix description]`
- PR description:
  - 🎯 **What:** The vulnerability fixed
  - ⚠️ **Risk:** The potential impact if left unfixed
  - 🛡️ **Solution:** How the fix addresses the vulnerability
  - ✅ **Verification:** How you confirmed the fix works
  - Refer to `.github/PULL_REQUEST_TEMPLATE.md` for additional required details.

Remember: Security is paramount. A fix that introduces new vulnerabilities is worse than no fix at all. Be thorough and careful.
