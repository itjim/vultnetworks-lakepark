# Lake Park Sports Explorer — Revision 10 Review Notes

**Status:** Draft Netlify deploy preview only. No production merge, no school contact, no claim of official status.

## What changed
- Replaced the technical-first homepage with four **IHSA-published fall 2026 school records** as a dated source snapshot: boys tackle football 2–8, girls flag 14–5, boys soccer 13–8–1, girls volleyball 20–11.
- Featured cards link to the corresponding available sport feed. The underlying IHSA JSON does not consistently identify team level; only 2026 varsity tackle football has ten published varsity fixtures cross-checked date/opponent/score against a separate MaxPreps varsity schedule.
- Main catalog shows eight team-scoring sports (14 separate boys/girls programs); meet-based, event-based and other programs remain optional and do not receive invented W–L.
- Removed unverified JV/Sophomore/Freshman options and stale partial sub-varsity score samples from the main demonstration.
- Preserved season filtering, scored match table, regular-season versus overall record distinction, DuKane opponent comparisons, head-to-head and common-opponent views, CSV export, and postseason results where the API reports them.
- Moved deeper source reconciliation tables and 14-program coverage checks into a collapsible source-diagnostics drawer.
- Retained independent-not-affiliated language, dated attribution, user-origin source links and noindex/no-follow.

## Data-confidence policy
1. **Published school snapshot:** Historical citation/record from the public IHSA school overview as of Oct 25, 2026; not an automatically refreshed live value.
2. **Varsity independently cross-checked:** Ten 2026 Lake Park varsity tackle games matched against a dated MaxPreps varsity schedule, with score and opponent match. Both organizations may share underlying data; cross-check is not proof of independent score reporting.
3. **API results available:** SchoolID-filtered matches returned by a successful full advertised-page import, with exact ActivityID validation. May omit unreported school contests, or lack team-level designation.
4. **Not yet complete:** If published school total and API-derived score count differ, show the published reference and mark API-derived metrics as *reported games only*. Never fill games with guessed scores or call unreported games losses.
5. **Conference:** A completed game against a school assigned to DuKane is not automatically a verified official conference game. Label those tables as provisional member-matchup comparisons.
6. **Meet/tournament sports:** Track placements, heats, points or event results with their own sport-specific data model; do not force Win/Loss onto sports without bilateral game results.

## Review checklist before merging
- [ ] On desktop and mobile, confirm featured program cards are visible at the top; program selection opens correct sport and reports source.
- [ ] Boys tackle FB 2026: 10 reported games, 2–7 regular-season, 2–8 overall, 188 PF, 314 PA; separate ten-game MaxPreps fixture check matches 10/10.
- [ ] Girls flag FFG 2026: show published IHSA 14–5 snapshot. If source has only 3 games, label partial and do NOT show 3-game count as school's final record.
- [ ] Boys soccer SOB 2026: show published 13–8–1 snapshot and compare row-level API; handle regular-season ties properly.
- [ ] Girls volleyball VBG 2026: show published 20–11 snapshot, set scores counted as sets; confirm missing scores not fabricated.
- [ ] Winter/spring programs: check real matches only where season started and source has scores; absence of reports does not mean 0–0.
- [ ] Confirm correct Season selection (2024–25, 2025–26, 2026–27), sport/gender separation and navigation.
- [ ] Check source drawer diagnostics, CSV export, conference comparisons, no student personal information, no school/IHSA logos.
- [ ] Ask Lake Park Athletics to review program offerings, correct JV/Freshman schedule sources, sanctioned conference matches and any inaccuracies; do not imply endorsement.

## Source review references
- IHSA School details: https://www.ihsa.org/schools/details/1829SS
- IHSA school JSON: https://api.ihsa.org/v1/schools/1829
- IHSA score API: https://api.ihsa.org/v1/scores
- MaxPreps 2026 Varsity football schedule: https://www.maxpreps.com/il/roselle/lake-park-lancers/football/schedule/

## Release workflow
- Development branch: `development/lakepark-published-rev10`.
- Draft PR #2 targets `main`.
- Build command runs Node regression tests and publishes only `dist/index.html`; Netlify function is published separately.
- Production is unchanged until user approves merge.
