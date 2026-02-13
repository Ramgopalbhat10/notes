# Learnings

Log agent-relevant lessons so future sessions avoid repeats.

Use this when:
- A bug required multiple iterations to fix.
- The first implementation was wrong or incomplete.
- A hidden constraint/gotcha caused failures.
- A workflow detail (branching/docs/tests) was easy to miss.

Format (append newest at top):
```
YYYY-MM-DD | area | symptom | root cause | fix | guardrail
```

Example:
```
2026-02-13 | header nav | buttons enabled wrong | counted folders as files | filter to file nodes only | test mixed folder/file case
```
