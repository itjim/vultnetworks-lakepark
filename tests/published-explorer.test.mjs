import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
test('redesigned page contains parsable JavaScript and the core application selectors',()=>{
  assert(js,'Missing main script');
  assert.doesNotThrow(()=>new Script(js));
  for(const id of ['featuredPrograms','sportCatalog','teamExplorer','sportButtons','otherSportButtons','records',
                   'level','program','season','publishedRecordBlock','publishedRecordValue','gamesBody',
                   'sourceBadge','officialReference','maxprepsReference','allSportsOverview','openSources','overviewStatus']){
    assert(html.includes('id="'+id+'"'),id+' selector missing');
  }
});
test('four published IHSA school-record reference cards are present and dated',()=>{
  assert(html.includes('October 25, 2026'));
  for(const [code,record] of [['FB','2–8'],['FFG','14–5'],['SOB','13–8–1'],['VBG','20–11']]){
    assert(html.includes('data-feature="'+code+'"'));
    assert(html.includes(record));
  }
});
test('the primary Explorer does not expose inferred JV, sophomore or freshman season results',()=>{
  assert(html.includes('setOptions(\'level\',[\'Varsity\'])'));
  assert(html.includes('class="level-hidden" hidden'));
  assert(!html.includes('SUBVARSITY_SNAPSHOTS'));
  assert(!html.includes('99–13'));
  assert(!html.includes('drawSubvarsityReference'));
});
test('team scoring sport identifiers and snapshot labeling are preserved',()=>{
  for(const code of ['FB','FFG','SOB','SOG','VBG','VBB','BKB','BKG','BA','SBG','WPB','WPG','LCB','LCG']){
    assert(html.includes("code:'"+code+"'"),'Missing scoring sport '+code);
  }
  assert(html.includes('IHSA school overview'));
  assert(html.includes('not a live'));
  assert(html.includes('Not affiliated'));
});
test('source data diagnostics retained and independent demos remain noindexed',()=>{
  assert(html.includes('noindex,nofollow'));
  assert(html.includes("getAPI({action:'scores'"));
  assert(html.includes('action:\'coverage\''));
  assert(html.includes('sourceDrawer'));
  assert(html.includes('drawOfficialReference'));
  assert(html.includes('drawMaxprepsReference'));
});
