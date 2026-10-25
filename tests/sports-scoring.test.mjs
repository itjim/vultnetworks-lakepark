import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const moduleURL=new URL('../netlify/functions/ihsa.mjs',import.meta.url);
let nonce=0;
const fresh=()=>import(moduleURL.href+'?test='+ ++nonce);
function fixture(id,code='FB',category='Football',lp=10,opp=3,date='10/16/2026'){
  return {ContestID:id,SchoolIDs:'1829|0102',ActivityID:code,SportCategory:category,GameDate:date,
    TourneyLevel:'Regular Season',Winner:lp>=opp?'T':'B',TopScore:lp,BottomScore:opp,ScoreStatus:'verified',
    MaxPreps:{Status:'Final',Agrees:true},
    TopTeam:{SchoolID1:'1829',TeamName:'Lake Park',TopTeamNameShort:'Lake Park'},
    BottomTeam:{SchoolID:'0102',TeamName:'Example school',BottomTeamNameShort:'Example school'}};
}
const reply=(rows,page=1,pages=1,total=rows.length)=>new Response(JSON.stringify({
  data:rows,pagination:{currentPage:page,totalPages:pages,pageSize:500,totalRecords:total}
}),{status:200,headers:{'content-type':'application/json'}});
test('IHSA scoreboard code map uses current scoring-sport identifiers',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const code of ['FB','FFG','BKB','BKG','SOB','SOG','VBB','VBG','BA','SBG','WPB','WPG','LCB','LCG']){
    assert(html.includes("code:'"+code+"'"),'Missing IHSA activity '+code);
  }
});
test('Soccer final regular-season draw is a tie, Winner T means top team in non-ties',async()=>{
  const {normalizeScore}=await fresh();
  const tied=normalizeScore({...fixture(1,'SOB','Boys Soccer',2,2),Winner:'T'});
  assert.equal(tied.winner,'tie');
  const win=normalizeScore({...fixture(2,'SOB','Boys Soccer',3,2),Winner:'T'});
  assert.equal(win.winner,'top');
});
test('Girls flag football with generic Football category is preserved using FFG code',async()=>{
  const {default:handler}=await fresh();
  globalThis.fetch=async()=>reply([fixture(1,'FFG','Football',19,7),fixture(2,'FB','Football',41,7)]);
  const res=await handler(new Request('https://preview.netlify.app/.netlify/functions/ihsa?action=coverage&sport=FFG&season=2026'));
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.lakeParkContests,1);assert.equal(body.finalWins,1);
  assert.equal(body.excludedActivityCount,1);assert.equal(body.games[0].activityId,'FFG');
});
test('Boys soccer and girls volleyball requested independently with true activity codes',async()=>{
  for(const [code,cat,lp,opp] of [['SOB','Boys Soccer',5,1],['VBG','Girls Volleyball',2,1]]){
    const {default:handler}=await fresh();
    globalThis.fetch=async()=>reply([fixture(1,code,cat,lp,opp),fixture(2,'FB','Football',49,0)]);
    const res=await handler(new Request('https://preview.netlify.app/.netlify/functions/ihsa?action=coverage&sport='+code+'&season=2026'));
    const body=await res.json();
    assert.equal(res.status,200);
    assert.equal(body.completedContests,1);
    assert.equal(body.finalWins,1);
    assert.equal(body.games[0].activityId,code);
  }
});
test('Per-sport source rejects cross-sport contamination even when API search returns extra rows',async()=>{
  const {default:handler}=await fresh();
  const rows=[fixture(1,'FB','Football',15,22),fixture(2,'FB','Football',41,6),fixture(3,'SOB','Boys Soccer',5,1),
              fixture(4,'VBG','Girls Volleyball',1,3),fixture(5,'SOB','Boys Soccer',0,2)];
  globalThis.fetch=async()=>reply(rows);
  const res=await handler(new Request('https://preview.netlify.app/.netlify/functions/ihsa?action=scores&sport=FB&season=2026'));
  const body=await res.json();
  assert.equal(body.matchedSeasonCount,2);
  assert.equal(body.excludedActivityCount,3);
  assert.deepEqual(body.unexpectedActivityCodes,{SOB:2,VBG:1});
  assert(body.games.every(g=>g.activityId==='FB'));
});
test('A partially retrieved scores dataset fails closed and cannot be used for a false season record',async()=>{
  const {default:handler}=await fresh();
  globalThis.fetch=async()=>reply([fixture(1)],1,1,500);
  const res=await handler(new Request('https://preview.netlify.app/.netlify/functions/ihsa?action=scores&sport=FB&season=2026'));
  assert.equal(res.status,502);
  const body=await res.json();
  assert.equal(body.ok,false);
  assert.match(body.failures[0].error,/reported 500 records but retrieved 1/);
});
