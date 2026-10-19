# Personal Notes HTTP API reference

Use `NOTES_BASE_URL` plus the exact path below and `Authorization: Bearer <NOTES_API_KEY>`. No browser cookie or GitHub session is required. All mutation bodies are JSON (`Content-Type: application/json`); query values must be URL-encoded. There are six routes and nine supported method/path pairs.

## Endpoints

| Method and path | Query or JSON body | Success |
|---|---|---|
| `GET /api/fs/list` | Query: optional `prefix`, `continuationToken` | 200 listing JSON below |
| `GET /api/fs/file` | Query: `key` | 200 `{key, content, etag?, lastModified?}`; conditional reads can return 304 with no body |
| `PUT /api/fs/file` | JSON: `key`, string `content`, optional `ifMatchEtag` | 200 `{etag?}` for both create and replace |
| `DELETE /api/fs/file` | JSON: `key`, optional `ifMatchEtag` | 204, no body |
| `POST /api/fs/mkdir` | JSON: `prefix` | 201 `{success: true}` |
| `DELETE /api/fs/folder` | JSON: `prefix`, optional boolean `recursive` (false by default) | 204, no body |
| `POST /api/fs/move` | JSON: `fromKey`, `toKey`, optional boolean `overwrite` (false by default), optional `ifMatchEtag` | 200 `{etag?}`; folder result normally `{}` |
| `GET /api/fs/meta` | Query: `key` | 200 `{public: boolean}` |
| `PUT /api/fs/meta` | JSON: `key`, boolean `public` | 200 `{public: boolean}` |

Keys such as `Projects/Plan.md` are relative to the vault root, not the bucket root. Do not prepend the server's configured storage prefix. Prefer lowercase `.md` extensions: file validation accepts `.MD`, but listing currently filters lowercase `.md`. No attachments or arbitrary binary files are supported.

## Listing and pagination

Example response for `prefix=Projects/`:

```json
{
  "prefix": "Projects/",
  "folders": ["Archive/"],
  "files": [
    {"key": "Projects/Plan.md", "etag": "\"opaque-etag\"", "lastModified": "2026-10-19T10:00:00.000Z", "size": 120}
  ],
  "nextContinuationToken": null
}
```

- File keys already include the vault-relative prefix. Use them as returned, not `Projects/Projects/Plan.md`.
- Folder strings are child-relative. List `Projects/Archive/`, not just `Archive/`, when recursing from this page.
- Omit `prefix` (or use empty string) to list the root. Listing is not recursive; filenames/paths are case-sensitive.
- Pass the opaque `nextContinuationToken` back as `continuationToken` with the **same prefix**. Continue until absent/null, even for a page with no matching files. Do not decode/modify the token or claim the listing is complete early. Detect a repeatedly returned token and report pagination failure rather than loop forever.
- Do not invent `page`, `limit`, recursive flags, or search query parameters.

## ETags and safe updates

A normal file read returns a JSON body like:

```json
{"key":"Projects/Plan.md","content":"# Plan\nCurrent text.","etag":"opaque-etag","lastModified":"2026-10-19T10:00:00.000Z"}
```

For a requested edit, send the complete resulting Markdown and the read's body ETag:

```json
{"key":"Projects/Plan.md","content":"# Plan\nUpdated text.","ifMatchEtag":"opaque-etag"}
```

`ifMatchEtag` is a **JSON field**, not an `If-Match` HTTP header in this API. Prefer the file GET's body ETag as returned; list/header ETags can include quotes. Optional conditional GET uses `If-None-Match` (the HTTP ETag header) or `If-Modified-Since`; a 304 requires a previously cached body. For an initial read/edit workflow, omit conditional GET headers so you receive content.

File PUT forwards the condition to storage. File delete and file move check the ETag separately before the mutation and are **not atomic**; folder operations have no ETag precondition. There is no create-only flag or endpoint: PUT without `ifMatchEtag` can replace an existing note. Do not infer race-free create, guaranteed rollback, or a transactional cross-store operation.

## Other mutation bodies

Use these only for the user's requested action; they are not connectivity checks.

- Create a folder: `POST /api/fs/mkdir` with `{"prefix":"Projects/Archive/"}`. Existing folder: 409. Create required ancestors explicitly if needed; don't assume note creation creates empty folder markers.
- Move a note: `POST /api/fs/move` with `{"fromKey":"Projects/Plan.md","toKey":"Projects/Archive/Plan.md","overwrite":false,"ifMatchEtag":"opaque-etag"}`. Destination exists: 409 by default. Preserve requested path casing.
- Move a folder: same route with `{"fromKey":"Projects/Archive/","toKey":"Archive/","overwrite":false}`. Both paths must end `/`. Cannot move a folder into itself/its subtree. This copies descendants then deletes sources; partial failure is possible. `ifMatchEtag` does not protect a folder move.
- Delete a note: `DELETE /api/fs/file` with `{"key":"Projects/Plan.md","ifMatchEtag":"opaque-etag"}`. File history is also removed; the API has no undo route.
- Delete an empty folder: `DELETE /api/fs/folder` with `{"prefix":"Projects/Archive/","recursive":false}`. A nonempty folder fails with 400. `recursive:true` destroys descendants too; require explicit authorization for that exact subtree. Never delete the vault root.
- Publish/unpublish: `PUT /api/fs/meta` with `{"key":"Projects/Plan.md","public":true}` or `false`. Publishing enables anonymous public-file reads. Re-read metadata to verify; unpublishing cannot recall external cached/downloaded copies. Metadata defaults to `{public:false}` when missing, so this is **not a file-existence check**.

Do not send `"false"` as a string: folder deletion and move flags are interpreted by JavaScript truthiness, so that string behaves as true. Always send JSON booleans.

## Errors and retries

Errors normally contain `{"error":"message"}`; reverse proxies can return non-JSON bodies. Check status before using the body. Validation errors are not normalized consistently across every handler; some invalid-input failures can appear as 500.

| Status/outcome | Agent behavior |
|---|---|
| 301/302/307/308 | Do not follow with the key. Ask the owner to verify the configured deployment origin. |
| 400 | Correct request fields/types/path; do not repeatedly send the same invalid request. |
| 401/403 | Stop; ask the owner to check server key configuration, caller secret, and destination. No login/auth bypass attempts. |
| 404 | The requested resource is absent; do not automatically create it unless requested. |
| 409/412 | Conflict (destination exists or ETag mismatch/precondition failure). Re-read and reconcile; do not force overwrite. |
| 5xx or timeout/disconnect | A mutation's outcome may be unknown or partial. Reconcile via read/list/metadata and stop if ambiguous; don't blindly retry. |
| 204/304 | No JSON body. For 304, reuse only the body associated with that prior conditional request. |

A returned success and a later read can be affected by caching; an immediate stale read alone does not justify replaying a mutation. Never promise strong consistency or atomic multi-object operations. A key grants no history, restore, AI, settings, browser, or tree/refresh API access.

## Python request example

Optional transport pattern using Python 3's standard library. The two variables must already be configured privately in the caller's environment. This example accepts HTTPS only, refuses redirects, validates the route/method pair, serializes JSON safely, does not print credentials/content, and does not retry mutations. No repository code or package install is needed.

```python
import json
import os
import urllib.error
import urllib.parse
import urllib.request

base = os.environ.get("NOTES_BASE_URL", "").strip()
key = os.environ.get("NOTES_API_KEY", "").strip()
origin = urllib.parse.urlsplit(base)
if (not key or origin.scheme != "https" or not origin.hostname
        or origin.username is not None or origin.password is not None
        or origin.path not in ("", "/") or origin.query or origin.fragment):
    raise RuntimeError("Configure a trusted HTTPS NOTES_BASE_URL origin and secret NOTES_API_KEY.")
base = base.rstrip("/")

allowed = {
    "/api/fs/file": {"GET", "PUT", "DELETE"},
    "/api/fs/list": {"GET"},
    "/api/fs/mkdir": {"POST"},
    "/api/fs/folder": {"DELETE"},
    "/api/fs/move": {"POST"},
    "/api/fs/meta": {"GET", "PUT"},
}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirect())

def notes_request(method, path, params=None, body=None):
    if method not in allowed.get(path, set()):
        raise ValueError("Unsupported notes API operation")
    query = urllib.parse.urlencode(params or {})
    url = base + path + ("?" + query if query else "")
    headers = {"Authorization": "Bearer " + key, "Accept": "application/json"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with opener.open(request, timeout=30) as response:
            raw = response.read()
            result = None if response.status in (204, 304) or not raw else json.loads(raw)
            return response.status, result
    except urllib.error.HTTPError as error:
        # Preserve status for the workflow, not raw requests, headers, or note text.
        status = error.code
        error.close()
        raise RuntimeError("Notes API HTTP " + str(status) + "; follow the status guidance above.") from None
    except urllib.error.URLError:
        raise RuntimeError("Notes API transport failure; a mutation outcome may be unknown.") from None

# Read-only example; adjust the folder to the user's requested scope.
status, page = notes_request("GET", "/api/fs/list", {"prefix": "Inbox/"})
# Use page["files"], page["folders"], and page.get("nextContinuationToken").
```

For an **explicitly requested** append/edit, after defining the helper above:

```python
note_key = "Inbox/Example.md"  # Resolve from the user's request.
status, current = notes_request("GET", "/api/fs/file", {"key": note_key})
if not current.get("etag"):
    raise RuntimeError("No ETag available; do not silently overwrite without a precondition.")
updated = current["content"] + "\n\nRequested addition.\n"
status, saved = notes_request("PUT", "/api/fs/file", body={
    "key": note_key,
    "content": updated,
    "ifMatchEtag": current["etag"],
})
```

The helper intentionally surfaces errors rather than trying to merge, change origins, remove preconditions, retry writes, or publish notes on its own. Apply the workflow in `SKILL.md` and the status guidance above before taking further action.
