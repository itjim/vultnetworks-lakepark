# Development status — GitHub draft PR #1

**This branch is a preview; main/production has not been changed.** See https://github.com/itjim/vultnetworks-lakepark/pull/1. To evaluate the preview, open its Netlify Deploy Preview link, test the school and score endpoints, and compare the results to the IHSA ScoreZone. Only merge after the preview has passed. The IHSA feed is undocumented; source permissions and reliability require review before broader distribution.

Automated development checks: Node API normalization, pagination integrity, and failure handling tests passed; simulated Chrome/mobile interface smoke test passed. Live upstream accessibility from Netlify is not yet proven. Errors return **HTTP 502 with no-store caching**; inconsistent pagination refuses to publish partial datasets as complete.

---

# Vult Networks — Lake Park Sports Analytics (Revision 9)

**Independent/unofficial demonstration.** Not affiliated with IHSA, Lake Park High School, or District 108. No personal student profiles or credentials.

## Confirmed API behavior

The user successfully opened these public HTTPS endpoints in a mobile browser:

- `https://api.ihsa.org/v1/schools/1829`
- `https://api.ihsa.org/v1/scores?activityId=FB&page=1&pageSize=2`

School returns `{ "data": { "SchoolID": "1829", "Conferences": [...] } }`. Scores return `{ "data": [...], "pagination": { "currentPage": 1, "pageSize": 2, "totalRecords": 3788, "totalPages": 1894 } }` for that specific 2-record request, as of October 16, 2026. With **pageSize=500** the number of pages is expected to be much smaller; the function follows the returned actual `pagination.totalPages` rather than assuming a count.

Each contest has `ContestID`, `SchoolIDs` (pipe-delimited), `GameDate`, `Winner` (`T` = top team or `B` = bottom team), `TopScore`, `BottomScore`, `ScoreStatus`, `TourneyLevel` (stage, NOT JV/Varsity), `TopTeam.TeamName` / `TopTeam.SchoolID1`, and `BottomTeam.TeamName` / `BottomTeam.SchoolID`. `MaxPreps.Status` may identify a final game.

## Deploy to the EXISTING GitHub + Netlify site

Repository: https://github.com/itjim/vultnetworks-lakepark
Netlify project: https://app.netlify.com/projects/vultnetworks-lakepark

**Preserve these exact paths**:

```
index.html
netlify.toml
netlify/functions/ihsa.mjs
```

1. Upload `netlify.toml` to the GitHub repository root.
2. Upload `ihsa.mjs` under `netlify/functions/` (create the folders in GitHub if needed).
3. Commit both and wait for Netlify deployment to report Ready.
4. Test `https://vultnetworks-lakepark.netlify.app/.netlify/functions/ihsa?action=scores&sport=FB&season=2026` — it must return `"ok":true` with `"games"` and `"advertisedPages"` equal to `"pagesFetched"`. If it returns 502, send the exact `error` and `checkedAt`; DO NOT treat the absence of output as a zero-win season.
5. After that succeeds, update the **lowercase** `index.html` on GitHub. The new interface will use the same-origin function automatically. A GitHub commit preserves version history.

The full repository ZIP is for extraction, not for upload as a single file to GitHub. Do not commit the ZIP in place of the three files.

## Updated from Postman collection

The original Postman collection was audited, not modified. See `POSTMAN_REVIEW.md` for activity-code inventory and differences. Rev9 matches distinct activity IDs in the collection for boys/girls swimming, golf, track, tennis, soccer, cross country, and includes boys gymnastics. The all-sports overview calls the unfiltered scores endpoint on demand. Girls flag activity ID remains unverified.

## Features

- 18 sport selectors, with football split *after* selection into boys tackle and girls flag.
- Boys/girls, varsity/JV/freshman/sophomore level selectors and school years.
- Full pagination for each sport code (up to safety cap of 80 pages, no invented results).
- Normalization of scores/winners from the confirmed nested JSON structure.
- Score table, independently calculated Lake Park regular-season W/L and points.
- Unofficial DuKane varsity tackle football standings, using directory membership.
- Head-to-head and common-opponent comparisons, opponent-win totals and CSV export.
- Clear data completeness/status and API diagnostics. Missing/ambiguous level or gender is excluded rather than conflated.
- No playoff qualification guarantees or formal IHSA rankings.

## Important limitations

- The API is undocumented and was not reachable from the development environment due to DNS restrictions. Its availability **from Netlify remains untested** until deployed.
- Successful retrieval of all API pages does NOT prove each school reported every game.
- The girls flag football code `FFG` is only a **candidate based on the public IHSA sport abbreviation**; it is unverified. Certain other codes and gender partitions need independent confirmation.
- School-year options may exceed the dates contained in the current API feed.
- Games without explicit varsity/JV level are temporarily displayed in the Varsity view with a caution notice, not treated as a verified varsity classification. Sub-varsity data is not invented.
- DuKane standings use only contests between member schools and are independently calculated, not IHSA-certified.
- Results are cached for 12 minutes to reduce traffic. Review IHSA terms/permissions before broad public promotion.

## Local test

From the extracted folder, `node --test tests/ihsa.test.mjs` if you have the separately supplied tests folder; no external dependencies are required for the Netlify function.