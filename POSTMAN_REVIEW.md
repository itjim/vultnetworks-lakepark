# IHSA Postman collection audit — Lake Park

**Scope:** Uploaded Postman Collection v2.1, preserved unmodified. Review performed on October 24, 2026. The collection supplies request definitions and scripts, **not a downloadable archive of actual score responses**.

## Confirmed configuration

- `baseUrl = https://api.ihsa.org/v1` and `schoolId = 1829`.
- School request: `/schools/1829`; all schools: `/schools`.
- Scores: `/scores?activityId=CODE` or `/scores` for an unfiltered feed.
- Football examples use `FB` and filter `SchoolIDs` using `split('|').includes('1829')`.
- The previously supplied scores response establishes `data[]` and `pagination.currentPage/pageSize/totalRecords/totalPages`, with `Winner: T/B`, `TopTeam.SchoolID1`, and `BottomTeam.SchoolID`.

## Inventory

- 34 exported HTTP requests: 27 within the Sports folder and six elsewhere.
- 27 per-sport examples; many implement nearly identical W/L Postman test scripts and visualizers.
- Export contains no saved responses, so no full score dataset or historical snapshot is included.
- The All-Sports Standings Dashboard **has no attached pre-request/test scripts**, although its description claims it paginates and renders a dashboard. Treat that feature as unimplemented in the supplied export.
- Multiple Postman scripts process `pm.response.json().data` **from only one page** and calculate W/L using those rows; this is not a full-season record. Some scripts treat all non-wins as losses once a winner is present, without considering ties, uncertainty, or sport-specific scoring.
- The Conference Standings script filters only Lake Park games; it does **not** independently establish each DuKane school's conference W/L or restrict matchups to verified member-vs-member contests.
- `TourneyLevel` means regular season/playoffs, **not** Varsity/JV/Freshman. No dependable sub-varsity classification is demonstrated by the export.
- Girls flag football is **not included** in the uploaded collection, so its code must remain unverified pending separate testing.
- Current-season / historical `season` query support is not demonstrated; game dates must be filtered carefully.

## Exact sports folder mappings

| Postman request | Activity ID |
|---|---|
| Football | (none) |
| Water Polo | WP |
| Boys Volleyball | BVB |
| Competitive Dance | DA |
| Competitive Cheer | CH |
| Lacrosse | LA |
| Bowling | BW |
| Girls Gymnastics | GGY |
| Boys Gymnastics | GY |
| Girls Swimming | GSW |
| Boys Swimming | SW |
| Girls Tennis | GTE |
| Boys Tennis | TE |
| Girls Golf | GGO |
| Boys Golf | GO |
| Girls Track & Field | GTF |
| Boys Track & Field | TF |
| Girls Cross Country | GCC |
| Boys Cross Country | CC |
| Wrestling | WR |
| Volleyball | VB |
| Girls Soccer | GSC |
| Boys Soccer | SC |
| Softball | SB |
| Baseball | BS |
| Girls Basketball | GBB |
| Boys Basketball | BB |

## Changes incorporated in Rev 9

1. Use collection-specific gendered activity codes rather than combining Boys and Girls for swimming, golf, tennis, soccer, track, and cross country.
2. Add an explicit All-Sports API overview using unfiltered `/scores`, paginated with `pageSize=500`; compute Lake Park counts from the returned contest list. This is a *reported-contests overview*, not W/L standings for all individual sports.
3. Retain Netlify server-side score retrieval with deduplication, status checks, source timestamps and failure-visible diagnostics.
4. Keep the girls flag choice visually separate but classify its activity code as **unverified** rather than claiming verified coverage.
5. Preserve the Vult Networks independent, unofficial-use and data provenance disclaimers.

## Remaining verification

- Verify actual HTTP responses **from deployed Netlify infrastructure**, including the 500-record page-size behavior and unfiltered all-sports paging.
- Verify which IHSA activity code carries girls flag football. Do not silently blend with boys tackle.
- Validate school/conference membership and official postseason formats before using projections.
- Confirm whether the API provides reliable levels and older seasons.
- Check third-party API usage terms before running recurring large-scale harvesting.