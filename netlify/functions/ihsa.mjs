/**
 * Vult Networks Lake Park Sports Analytics — independent public-data demonstration.
 * The IHSA API is undocumented. No credentials, privileged endpoints or student data.
 * No claims of completeness beyond successfully retrieved API pages.
 */
const ORIGIN = 'https://api.ihsa.org/v1';
const SCHOOL_ID = '1829';
const PAGE_SIZE = 500;
const MAX_PAGES = 80;
const CONCURRENCY = 5;
const TIMEOUT_MS = 11000;
const CACHE_MS = 12 * 60 * 1000;
const SPORT_CODE = /^[A-Z]{2,4}$/;
const memoryCache = new Map();

function jsonResponse(body, status = 200) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  };
  if (status >= 400) {
    // Never cache transient upstream errors as if they were healthy results.
    headers['cache-control'] = 'no-store';
    headers['netlify-cdn-cache-control'] = 'no-store';
  } else {
    headers['cache-control'] = 'public, max-age=120';
    headers['netlify-cdn-cache-control'] = 'public, s-maxage=720, stale-while-revalidate=360';
  }
  return new Response(JSON.stringify(body), {status, headers});
}
export function normId(value) {
  if (value == null) return '';
  return String(value).trim().replace(/^0+(?=\d)/, '');
}
export function parseDate(value) {
  const str = String(value || '').trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month=Number(m[1]), day=Number(m[2]), year=Number(m[3]);
    const iso=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const date = new Date(`${iso}T12:00:00Z`);
    return date.getUTCFullYear()===year && date.getUTCMonth()+1===month && date.getUTCDate()===day ? iso : null;
  }
  if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(str)) return str.slice(0,10);
  return null;
}
export function academicSeason(iso) {
  if (!iso) return null;
  const year = Number(iso.slice(0,4));
  const month = Number(iso.slice(5,7));
  return month>=7 ? year : year-1;
}
function numberScore(x) {
  if (x===null || x===undefined || String(x).trim()==='') return null;
  const v=Number(x);
  return Number.isFinite(v) && v>=0 ? v : null;
}
function shortName(node, fallback) {
  if (!node || typeof node !== 'object') return fallback;
  return String(node.TopTeamNameShort || node.BottomTeamNameShort || node.TeamName || node.Name || fallback).trim();
}
export function normalizeScore(r) {
  if (!r || typeof r !== 'object') return null;
  const ids=String(r.SchoolIDs || '').split('|').map(x=>x.trim());
  const top=r.TopTeam || {};
  const bottom=r.BottomTeam || {};
  const topId=String(top.SchoolID1 || top.SchoolID || ids[0] || '').trim();
  const bottomId=String(bottom.SchoolID || bottom.SchoolID1 || ids[1] || '').trim();
  if (!topId || !bottomId) return null;
  const topScore=numberScore(r.TopScore ?? top.TopScore);
  const bottomScore=numberScore(r.BottomScore ?? bottom.BottomScore);
  const winnerCode=String(r.Winner||'').toUpperCase();
  const scoreStatus=String(r.ScoreStatus||'').toLowerCase();
  const providerStatus=String(r.MaxPreps?.Status||'').toLowerCase();
  const timeRemaining=String(r.TimeRemaining||'').toLowerCase();
  const isFinal=Boolean(
    scoreStatus==='verified' || scoreStatus==='final' ||
    providerStatus==='final' || timeRemaining==='final'
  );
  const hasScore=topScore!==null && bottomScore!==null;
  let winner=null;
  if(isFinal && hasScore) {
    if(winnerCode==='T') winner='top';
    else if(winnerCode==='B') winner='bottom';
    else if(String(top.TopTeamWin||top.TopMPResult||'').toUpperCase()==='Y'||String(top.TopMPResult||'').toUpperCase()==='W') winner='top';
    else if(String(bottom.BottomTeamWin||bottom.BottomMPResult||'').toUpperCase()==='Y'||String(bottom.BottomMPResult||'').toUpperCase()==='W') winner='bottom';
    else if(topScore===bottomScore) winner='tie';
    // Do not infer winners from greater numeric score: golf and other sports differ.

  }
  let level=null;
  for(const candidate of [r.ContestLevel,r.TeamLevel,r.Level,r.DivisionLevel]) {
    if(typeof candidate==='string' && candidate.trim()) {level=candidate.trim(); break;}
  }
  // TourneyLevel is a competition stage (e.g. "Regular Season"), NOT Varsity/JV.
  const category=String(r.SportCategory||'').trim();
  const gender=String(r.Gender||r.GenderCategory||'').trim();
  // MaxPreps metadata is relayed by IHSA; it is a secondary signal, not an independent request.
  const mpTopScore=numberScore(top.TopMPScore);
  const mpBottomScore=numberScore(bottom.BottomMPScore);
  const mpScoreMatch=mpTopScore!==null&&mpBottomScore!==null&&hasScore
    ? mpTopScore===topScore&&mpBottomScore===bottomScore : null;
  const mpReportedAgreement=typeof r.MaxPreps?.Agrees==='boolean'?r.MaxPreps.Agrees:null;
  const date=parseDate(r.GameDate);
  const contestId=String(r.ContestID ?? r.Slug ?? `${date}-${topId}-${bottomId}`);
  return {
    contestId, date, season:academicSeason(date), activityId:String(r.ActivityID||'').toUpperCase(),
    category, gender, stage:String(r.TourneyLevel||'').trim(),
    top:{id:topId,name:shortName(top,'School '+topId),score:topScore},
    bottom:{id:bottomId,name:shortName(bottom,'School '+bottomId),score:bottomScore},
    site:String(r.Site||'').trim(), scoreStatus, providerStatus,
    winner, isFinal, hasScore, source:String(r.ScoreSource||r.GameSource||'unreported'),
    sourceVerified:scoreStatus==='verified', level, updated:r.LastUpdate||null,
    maxpreps: {
      ihsaReportedAgreement:mpReportedAgreement,
      embeddedScoreMatch:mpScoreMatch,
      mpContestId:r.MaxPreps?.MPContestID||null,
      status:String(r.MaxPreps?.Status||'').trim(),
    },
  };
}
export function normalizeSchool(s) {
  if(!s || typeof s!=='object')return null;
  const id=String(s.SchoolID||'').trim();if(!id)return null;
  const conferences=Array.isArray(s.Conferences)?s.Conferences.map(c=>typeof c==='string'?c:c?.ConferenceName).filter(Boolean):[];
  return {id,name:String(s.NameShort||s.NameIHSA||s.NameFormal||`School ${id}`),conference:conferences,colors:[s.Color1,s.Color2].filter(Boolean)};
}
function getData(obj) {
  if(Array.isArray(obj))return obj;
  if(Array.isArray(obj?.data))return obj.data;
  if(Array.isArray(obj?.records))return obj.records;
  return null;
}
async function upstream(path) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const response=await fetch(ORIGIN+path,{headers:{accept:'application/json','user-agent':'VultNetworksSportsAnalytics/0.8 (public-data prototype)'},signal:controller.signal});
    if(!response.ok)throw new Error(`IHSA returned HTTP ${response.status}`);
    const contentType=response.headers.get('content-type')||'';
    const body=await response.text();
    let parsed;try{parsed=JSON.parse(body)}catch{throw new Error(`IHSA response is not JSON (${contentType||'unknown content type'})`)}
    return parsed;
  }finally{clearTimeout(timer)}
}
function cacheGet(key){const v=memoryCache.get(key);return v&&Date.now()-v.ts<CACHE_MS?v.body:null;}
function cacheSet(key,body){memoryCache.set(key,{ts:Date.now(),body});}
async function loadSchoolDirectory() {
  const key='schools';let cached=cacheGet(key);if(cached)return {...cached,cache:'memory'};
  const raw=await upstream('/schools');const data=getData(raw);
  if(!data)throw new Error('Schools endpoint did not return data array');
  const schools=data.map(normalizeSchool).filter(Boolean);
  const response={ok:true,source:'IHSA API',endpoint:'/v1/schools',schools,total:schools.length,checkedAt:new Date().toISOString()};
  cacheSet(key,response);return response;
}
async function loadSchool() {
  const raw=await upstream('/schools/'+SCHOOL_ID);
  if(!raw?.data || typeof raw.data!=='object')throw new Error('School endpoint did not return data object');
  return {ok:true,source:'IHSA API',school:normalizeSchool(raw.data),details:{enrollment:raw.data.Enrollment,city:raw.data.City,colors:raw.data.Colors},checkedAt:new Date().toISOString()};
}
async function loadScores(code,season) {
  const key=`scores:${code}:${season}`;const cached=cacheGet(key);
  if(cached)return {...cached,cache:'memory'};
  const url=p=>`/scores?${code==='ALL'?'':`activityId=${encodeURIComponent(code)}&`}page=${p}&pageSize=${PAGE_SIZE}`;
  const first=await upstream(url(1));
  const firstData=getData(first);
  if(!firstData)throw new Error('Scores endpoint returned JSON without data array');
  const pagination=first.pagination||{};
  const advertisedPages=Number(pagination.totalPages);
  const totalRecords=Number(pagination.totalRecords);
  const reportedSize=Number(pagination.pageSize)||PAGE_SIZE;
  if(!Number.isInteger(advertisedPages)||advertisedPages<1)throw new Error('Missing pagination.totalPages; cannot prove full retrieval');
  if(advertisedPages>MAX_PAGES) {
    return {ok:false,error:`${advertisedPages} pages exceed the safe ${MAX_PAGES}-page query limit for this sport. No partial results represented as complete.`,source:'IHSA API',code,season,advertisedPages,totalRecords,maxPages:MAX_PAGES};
  }
  const pages=new Array(advertisedPages);pages[0]=firstData;
  const failures=[];
  let index=2;
  async function worker(){while(true){const page=index++;if(page>advertisedPages)return;try{const data=await upstream(url(page));const list=getData(data);if(!list)throw new Error('data array not found');
      const info=data.pagination||{};
      if(Number(info.currentPage)!==page)throw new Error(`pagination.currentPage ${info.currentPage} did not match ${page}`);
      if(Number(info.totalPages)!==advertisedPages)throw new Error(`pagination.totalPages changed from ${advertisedPages} to ${info.totalPages}`);
      pages[page-1]=list;}catch(e){failures.push({page,error:String(e.message||e)})}}}
  await Promise.all(Array.from({length:Math.min(CONCURRENCY,Math.max(0,advertisedPages-1))},()=>worker()));
  let complete=failures.length===0&&pages.every(Array.isArray);
  const map=new Map();let rawCount=0,invalidCount=0;
  for(const page of pages){if(!page)continue;rawCount+=page.length;for(const row of page){const normalized=normalizeScore(row);if(!normalized){invalidCount++;continue;}map.set(normalized.contestId,normalized)}}
  if(complete && Number.isFinite(totalRecords) && rawCount!==totalRecords) {
    complete=false;
    failures.push({page:'all',error:`pagination reported ${totalRecords} records but retrieved ${rawCount}; refusing to call the dataset complete`});
  }
  const all=Array.from(map.values());
  // Upstream activityId query responses can contain unrelated sports. Filtering
  // only the URL allowed three other-sport regional games into Lake Park football
  // (3-9 vs the verified 2-8). Enforce row-level classification independently.
  const allSeason=all.filter(r=>r.season===season);
  const mismatchedActivity=code==='ALL'?[]:allSeason.filter(r=>r.activityId!==code);
  const activityMatched=code==='ALL'?allSeason:allSeason.filter(r=>r.activityId===code);
  function categoryConflicts(row) {
    const category=String(row.category||'').trim().toLowerCase();
    if(!category)return false;
    if(code==='FB')return !category.includes('football')||category.includes('flag');
    if(code==='FFG')return !category.includes('flag');
    return false;
  }
  const mismatchedCategory=code==='ALL'?[]:activityMatched.filter(categoryConflicts);
  const matched=activityMatched.filter(r=>!categoryConflicts(r));
  const unexpectedCodes={};
  for(const row of mismatchedActivity){const key=row.activityId||'MISSING';unexpectedCodes[key]=(unexpectedCodes[key]||0)+1;}
  const availableSeasons=Array.from(new Set(all.map(r=>r.season).filter(Boolean))).sort((a,b)=>b-a);
  const result={ok:complete,source:'IHSA API',endpoint:'/v1/scores',code,season,requestedPageSize:PAGE_SIZE,reportedPageSize:reportedSize,advertisedPages,pagesFetched:pages.filter(Boolean).length,allPagesFetched:complete,reportedTotalRecords:Number.isFinite(totalRecords)?totalRecords:null,rawCount,normalizedCount:all.length,sourceSeasonCount:allSeason.length,excludedActivityCount:mismatchedActivity.length,excludedCategoryCount:mismatchedCategory.length,unexpectedActivityCodes:unexpectedCodes,matchedSeasonCount:matched.length,availableSeasons,invalidCount,failures,games:matched,checkedAt:new Date().toISOString(),notes:'Rows are strictly filtered by ActivityID; untrusted upstream activityId queries may return unrelated sports. Retrieved pages do not guarantee complete school reporting.'};
  if(complete)cacheSet(key,result);
  return result;
}
export default async function handler(request){
  const url=new URL(request.url);
  const action=url.searchParams.get('action')||'scores';
  const code=String(url.searchParams.get('sport')||'FB').toUpperCase();
  const season=Number(url.searchParams.get('season')||'2026');
  if(!['scores','overview','schools','school'].includes(action))return jsonResponse({ok:false,error:'Unsupported action'},400);
  if((action==='scores'||action==='overview')&&(!SPORT_CODE.test(code)||!Number.isInteger(season)||season<2010||season>2040))return jsonResponse({ok:false,error:'Invalid sport code or season'},400);
  try{
    if(action==='schools')return jsonResponse(await loadSchoolDirectory());
    if(action==='school')return jsonResponse(await loadSchool());
    if(action==='overview') {
      const data=await loadScores('ALL',season);
      if(!data.ok)return jsonResponse(data,502);
      const byActivity={};let lakeParkTotal=0;
      for(const game of data.games){
        if([game.top.id,game.bottom.id].some(id=>normId(id)===SCHOOL_ID)){
          lakeParkTotal++;
          const key=game.activityId||'UNKNOWN';
          byActivity[key]=(byActivity[key]||0)+1;
        }
      }
      return jsonResponse({ok:true,source:data.source,season,checkedAt:data.checkedAt,
        totalReportedGames:data.matchedSeasonCount,reportedTotalRecords:data.reportedTotalRecords,
        advertisedPages:data.advertisedPages,pagesFetched:data.pagesFetched,allPagesFetched:true,
        lakeParkContests:lakeParkTotal,byActivity,
        notes:'Counts of reported Lake Park contests; not an all-sport W/L standings table.'});
    }
    const data=await loadScores(code,season);
    return jsonResponse(data,data.ok?200:502);
  }catch(error){
    return jsonResponse({ok:false,error:String(error.message||error).slice(0,380),action,code,season,endpoint:ORIGIN,checkedAt:new Date().toISOString(),hint:'Failure from Netlify, not evidence the source lacks games. The API may be unavailable, timeout, or restrict automated access.'},502);
  }
}