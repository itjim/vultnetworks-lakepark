import test from 'node:test';
import assert from 'node:assert/strict';
const url = new URL('../netlify/functions/ihsa.mjs',import.meta.url);
let seq=0;
function fresh(){return import(url.href+'?isolated='+ ++seq);}
function game(id,code='FB',category='Football',day='10/23/2026',lp=19,other=41){
  return {ContestID:id,SchoolIDs:'1829|0102',ActivityID:code,SportCategory:category,GameDate:day,TourneyLevel:'Regular Season',
    Winner:lp>other?'T':'B',TopScore:lp,BottomScore:other,ScoreStatus:'verified',MaxPreps:{Status:'Final'},
    TopTeam:{SchoolID1:'1829',TeamName:'Lake Park'},BottomTeam:{SchoolID:'0102',TeamName:'Example opponent'}};
}
function response(rows){return new Response(JSON.stringify({data:rows,pagination:{currentPage:1,pageSize:500,totalPages:1,totalRecords:rows.length}}),{status:200,headers:{'content-type':'application/json'}});}
test('FB season results strictly exclude nonfootball games even if returned from an FB request',async()=>{
  const {default:handler}=await fresh();
  const rows=[game(1,'FB','Football','08/21/2026',15,22),game(2,'FB','Football','08/28/2026',41,6),
              game(3,'SC','Boys Soccer','10/19/2026',5,1),game(4,'VB','Girls Volleyball','10/23/2026',1,3),
              game(5,'SC','Boys Soccer','10/27/2026',1,0)];
  globalThis.fetch=async()=>response(rows);
  const res=await handler(new Request('https://preview.netlify.app/.netlify/functions/ihsa?action=scores&sport=FB&season=2026'));
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.matchedSeasonCount,2);
  assert.equal(body.excludedActivityCount,3);
  assert.deepEqual(body.unexpectedActivityCodes,{SC:2,VB:1});
  assert(body.games.every(x=>x.activityId==='FB'));
});
test('FB record with mismatching sport category is excluded',async()=>{
  const {default:handler}=await fresh();
  globalThis.fetch=async()=>response([game(1),game(2,'FB','Girls Soccer'),game(3,'FB','Girls Flag Football')]);
  const res=await handler(new Request('https://preview.netlify.app/.netlify/functions/ihsa?action=scores&sport=FB&season=2026'));
  const body=await res.json();
  assert.equal(body.matchedSeasonCount,1);
  assert.equal(body.excludedCategoryCount,2);
});
test('unfiltered overview retains different activities',async()=>{
  const {default:handler}=await fresh();
  globalThis.fetch=async()=>response([game(1,'FB'),game(2,'SC','Boys Soccer')]);
  const res=await handler(new Request('https://preview.netlify.app/.netlify/functions/ihsa?action=overview&season=2026'));
  const body=await res.json();
  assert.equal(body.lakeParkContests,2);
  assert.deepEqual(body.byActivity,{FB:1,SC:1});
});