const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
function fixture(snapshot){
 const nodes=new Map(),listeners={},badges=[],timers=[],sourceCalls=[];let notify=()=>{},loaded=false;const source={cache:new Map(),error:null,loadedAt:snapshot.generatedAt,async loadAll(force=false){if(loaded&&!force)return;sourceCalls.push('all');source.cache.clear();Object.entries(snapshot.videos).forEach(([id,data])=>source.cache.set(id,structuredClone(data)));loaded=true;notify()},async loadVideo(id,options={}){if(!loaded)await source.loadAll();if(options.force){sourceCalls.push('video:'+id);source.cache.set(id,structuredClone(snapshot.videos[id]));notify()}return source.cache.get(id)}};
 function element(){return {textContent:'',innerHTML:'',hidden:false,children:[],attrs:{},dataset:{},events:{},style:{},contentWindow:{},remove(){this.removed=true},addEventListener(t,f){this.events[t]=f},setAttribute(k,v){this.attrs[k]=v},querySelector(){return this.frame||null},appendChild(n){this.children.push(n)},replaceChildren(){this.children=[]}}}
 function node(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)}
 for(const id of ['v00','v01','v02','v03']){const e=element(),count=element();e.dataset.commentsFor=id;e.querySelector=()=>count;badges.push(e)}
 const videos=['v00','v01','v02','v03'].map((id,i)=>({id,title:`Dance ${i}`}));let fetched=[];
 const context=vm.createContext({document:{baseURI:'https://example.com/site/index.html',hidden:false,getElementById:node,querySelectorAll:()=>badges,createElement(tag){const el=element();if(tag==='template')el.content={get textContent(){return el.innerHTML.replace(/<[^>]*>/g,'').replaceAll('&lt;','<').replaceAll('&gt;','>')}};return el}},window:{DaydayCommentSource:{create(options){notify=options.onUpdate;return source}},daydayLibrary:{getVideos:()=>videos},addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent(){}},location:{protocol:'https:',href:'https://example.com/site/index.html?video=v00'},history:{replaceState(){}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},URL,URLSearchParams,AbortController,CustomEvent:class{},MutationObserver:class{observe(){}disconnect(){}},setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length},clearTimeout(){},setInterval(){},fetch:async url=>{fetched.push(url);return{ok:true,json:async()=>snapshot}}});
 vm.runInContext(fs.readFileSync('comments.js','utf8'),context);
 return{context,node,badges,videos,fetched,listeners,timers,sourceCalls};
}
const c=(id,date,body,replies=[])=>({id,author:{login:'dancer',name:'Dance Friend'},createdAt:date,bodyHTML:body,url:'https://github.com/owner/repo/discussions/1',replies,isMinimized:false});
(async()=>{
 const snapshot={version:1,generatedAt:'2026-01-05T00:00:00Z',videos:{
 v00:{count:2,parents:[c('old','2026-01-01T00:00:00Z','<p>Old parent</p>',[c('reply','2026-01-04T00:00:00Z','<p>Latest reply</p>')])]},
 v01:{count:1,threadNumbers:[2],parents:[c('middle','2026-01-03T00:00:00Z','<p>Different video</p>')]},
 v02:{count:1,parents:[{...c('hidden','2026-01-06T00:00:00Z','<p>Hidden content</p>'),isMinimized:true}]},
 v03:{count:1,parents:[c('newest','2026-01-05T00:00:00Z','<p>&lt;script&gt;plain text&lt;/script&gt;</p>')]}
 }};
 const f=fixture(snapshot);await new Promise(setImmediate);
 assert.deepEqual(f.sourceCalls,['all']);assert.equal(f.fetched.length,0);
 const activity=f.node('recentComments').children;assert.equal(activity.length,3);assert.deepEqual(activity.map(a=>a.href),['index.html?video=v03&comments=1#classroom','index.html?video=v00&comments=1#classroom','index.html?video=v01&comments=1#classroom']);assert(!activity[0].innerHTML.includes('<script>'));assert.equal(f.badges[0].querySelector().textContent,'2');
 f.context.window.daydayComments.open(f.videos[0]);await new Promise(setImmediate);assert(f.node('videoCommentList').innerHTML.includes('Latest reply'));assert(!f.node('videoCommentList').innerHTML.includes('Different video'));
 f.context.window.daydayComments.open(f.videos[1]);await new Promise(setImmediate);assert(f.node('videoCommentList').innerHTML.includes('Different video'));assert(!f.node('videoCommentList').innerHTML.includes('Old parent'));
 // Each video owns a fresh immutable iframe; no setConfig retargeting is used.
 const firstFrame=f.node('giscusMount').children[0];
 assert.equal(new URL(firstFrame.src).searchParams.get('term'),'dayday-video-v01');
 f.context.window.daydayComments.open(f.videos[0]);const secondFrame=f.node('giscusMount').children[0];
 assert(firstFrame.removed);assert.equal(firstFrame.src,'about:blank');assert.equal(new URL(secondFrame.src).searchParams.get('term'),'dayday-video-v00');
 f.listeners.message({origin:'https://giscus.app',source:firstFrame.contentWindow,data:{giscus:{discussion:{url:'https://github.com/a/b/discussions/3',totalCommentCount:999}}}});
 assert(!f.node('videoCommentNotice').textContent.includes('正在自动同步'));
 f.context.window.daydayComments.open(f.videos[1]);const current=f.node('giscusMount').children[0];
 f.listeners.message({origin:'https://giscus.app',source:current.contentWindow,data:{giscus:{discussion:{url:'https://github.com/traviszzzhang/day-day-study-dance-with-wang/discussions/2',totalCommentCount:1,totalReplyCount:0}}}});
 assert(!f.sourceCalls.includes('video:v01'),'initial metadata for an existing discussion must not reread comments');
 snapshot.videos.v01={count:2,threadNumbers:[2],parents:[...snapshot.videos.v01.parents,c('submitted','2026-01-07T00:00:00Z','<p>Automatically refreshed</p>')]};
 f.listeners.message({origin:'https://giscus.app',source:current.contentWindow,data:{giscus:{discussion:{url:'https://github.com/traviszzzhang/day-day-study-dance-with-wang/discussions/2',totalCommentCount:2,totalReplyCount:0}}}});
 await new Promise(setImmediate);assert.equal(f.sourceCalls.filter(x=>x==='video:v01').length,1);assert(!f.timers.some(t=>t.delay===3000));assert(f.node('videoCommentList').innerHTML.includes('Automatically refreshed'));assert(f.node('videoCommentList').innerHTML.includes('Dance Friend'));
 f.context.window.daydayComments.close();assert(current.removed);assert.equal(f.node('giscusMount').children.length,0);
 console.log('Passed: global newest three include replies, safe text, page-load-only REST source, independent video comments, bubble counts, immutable editor isolation, late message rejection, automatic post-submit refresh, and display names.');
})().catch(e=>{console.error(e);process.exitCode=1});
