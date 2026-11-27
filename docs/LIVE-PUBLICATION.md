# Live publication and shared editing

## Runtime contract

A published link refers to a project, not a frozen camera array. The exact previously distributed fragment is hashed and resolved through a private R2 alias. New share links use `#project=<32 lowercase hex>`. One private R2 object `projects/<id>/latest.json` is the authoritative current publication. No CDN TTL or stale fallback is permitted on this mutable object. Old v1/v2 records remain compatible until migrated; the deployment must convert the actual distributed link to a live alias.

Separate binary raster and GLB objects use SHA-256 names. The browser downloads the current raster once, checks its digest and dimensions, and reuses it for unchanged asset revisions; GLB is fetched when 3D is opened. Every asset request checks the current ACL and current asset list, not just knowledge of its hash. No public R2 endpoint, static copy, service-worker cache, or persistent private browser autosave. The current authorised in-memory drawing is labelled offline if revalidation fails. No old snapshot is shown while access or current publication is pending. An unregistered portable link remains a clearly marked position study.

## Save and synchronisation

Viewers (including Drive commenters) may not save to the shared project. Assign editors explicitly. A Save publishes the camera array, routes, dimensions, next-number and sheet settings with the current ETag as If-Match; the Worker validates the payload and uses R2 conditional put. The sequence is assigned by the server. Source drawing, asset references, source scale, identity and revision remain under controlled publication. An attempt to change them locally requires exporting a copy or publishing a revised source. This is save-based collaboration, not simultaneous keystroke CRDT editing.

A SQLite-backed Durable Object named ProjectEvents broadcasts invalidation only. Each client fetches the actual current publication with independent authorisation; sockets never carry private geometry or project payloads. Poll with conditional GET every three seconds when a socket is unavailable; when connected, revalidate periodically and immediately on notification/focus. Preserve selection and zoom on unchanged coordinate frames. A remote update must not overwrite an unsaved draft; show the conflict, allow local export, then explicitly load latest. A 412 cannot be overridden by a force-save. No write permission is inferred from a viewer link.

## Deploy using the artifacts already at the edge

The deployment session has the current R04 package. Choose a random project ID once and retain it for every later revision. Build a release outside the repository:

    node tools/build-live-project.mjs <private-project.json> <private-output-dir> --project <id> --sequence <n> --revision R04 <legacy-link-or-digest>

Optionally add `--glb <registered-export.glb>` when the actual static GLB exists. Validate source and exported assets. Read the live pointer and choose the next sequence; upload new content-addressed assets first. Use conditional writes on latest.json with its previous ETag; reject stale/conflicting publication, including administrative publications. Populate its custom metadata `assets` from publication.json. Put a separate private `projects/<id>/access.json` object (body may be empty JSON) with custom metadata `readers` and `editors`, JSON arrays of individually approved email addresses. Editors must also be readers. Preserve access independently of publication, so a concurrent Save cannot resurrect an old ACL. Upload only privately. Replace the exact legacy object(s) with alias.json and metadata `projectId=<id>` only after verifying the current pointer and ACL. All later revisions replace the single pointer, not old deep links.

Deploy the existing origin with its new SQLite Durable Object binding and migration. The canonical TSG proxy must pass HTTP 101/WebSocket responses through intact (return the upstream response when response.webSocket exists; do not reconstruct it), preserve Upgrade, Origin, Cookie and CF-Access-Jwt-Assertion, and bypass caching on the whole /sightline/context/* route. Ensure Access covers manifests, assets, event upgrades and writes, and that the browser returns to the same tab after sign-in. Current published assets must not be exposed through the origin's public static binding. If socket upgrade is unavailable, the bounded polling fallback still syncs.

Test using two authorised sessions and one unauthorised session against the actual original Singapore link. Verify latest R04 venue drawing, scale, camera counts, save propagation, conflicts, revocation, no anonymous bytes, iOS touch behaviour, no raw JSON auth page and preserved viewport. Revalidate the correct revision after subsequent publication. Do not claim real-world 3D or optical verification merely because a synthetic fixture passed.
