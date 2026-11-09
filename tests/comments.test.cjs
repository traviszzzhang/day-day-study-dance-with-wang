const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
function fixture(snapshot){
 const nodes=new Map(),listeners={},badges=[];
 function element(){return {textContent:'',innerHTML:'',hidden:false,children:[],attrs:{},dataset:{},events:{},addEventListener(t,f){this.events[t]=f},setAttribute(k,v){this.attrs[k]=v},querySelector(){return this.frame||null},appendChild(n){this.children.push(n)},replaceChildren(){this.children=[]}}}
 function node(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)}
 for(const id of ['v00','v01','v02','v03']){const e=element(),count=element();e.dataset.commentsFor=id;e.querySelector=()=>count;badges.push(e)}
 const videos=['v00','v01','v02','v03'].map((id,i)=>({id,title:`Dance ${i}`}));let fetched=[];
 const context=vm.createContext({document:{baseURI:'https://example.com/site/index.html',hidden:false,getElementById:node,querySelectorAll:()=>badges,createElement(tag){const el=element();if(tag==='template')el.content={get textContent(){return el.innerHTML.replace(/<[^>]*>/g,'').replaceAll('&lt;','<').replaceAll('&gt;','>')}};return el}},window:{daydayLibrary:{getVideos:()=>videos},addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent(){}},location:{protocol:'https:'},URL,URLSearchParams,AbortController,CustomEvent:class{},MutationObserver:class{observe(){}disconnect(){}},setTimeout:()=>1,clearTimeout(){},setInterval(){},fetch:async url=>{fetched.push(url);return{ok:true,json:async()=>snapshot}}});
 vm.runInContext(fs.readFileSync('comments.js','utf8'),context);
 return{context,node,badges,videos,fetched};
}
const c=(id,date,body,replies=[])=>({id,author:{login:'dancer'},createdAt:date,bodyHTML:body,url:'https://github.com/owner/repo/discussions/1',replies,isMinimized:false});
(async()=>{
 const snapshot={version:1,generatedAt:'2026-01-05T00:00:00Z',videos:{
 v00:{count:2,parents:[c('old','2026-01-01T00:00:00Z','<p>Old parent</p>',[c('reply','2026-01-04T00:00:00Z','<p>Latest reply</p>')])]},
 v01:{count:1,parents:[c('middle','2026-01-03T00:00:00Z','<p>Different video</p>')]},
 v02:{count:1,parents:[{...c('hidden','2026-01-06T00:00:00Z','<p>Hidden content</p>'),isMinimized:true}]},
 v03:{count:1,parents:[c('newest','2026-01-05T00:00:00Z','<p>&lt;script&gt;plain text&lt;/script&gt;</p>')]}
 }};
 const f=fixture(snapshot);await new Promise(setImmediate);
 assert.equal(f.fetched.length,1);assert(f.fetched[0].includes('/site/comment-data.json'));
 const activity=f.node('recentComments').children;assert.equal(activity.length,3);assert.deepEqual(activity.map(a=>a.href),['video.html?id=v03#comments','video.html?id=v00#comments','video.html?id=v01#comments']);assert(!activity[0].innerHTML.includes('<script>'));assert.equal(f.badges[0].querySelector().textContent,'2');
 f.context.window.daydayComments.open(f.videos[0]);await new Promise(setImmediate);assert(f.node('videoCommentList').innerHTML.includes('Latest reply'));assert(!f.node('videoCommentList').innerHTML.includes('Different video'));
 f.context.window.daydayComments.open(f.videos[1]);await new Promise(setImmediate);assert(f.node('videoCommentList').innerHTML.includes('Different video'));assert(!f.node('videoCommentList').innerHTML.includes('Old parent'));
 f.node('composerBody').hidden=true;f.node('toggleComposer').events.click();const script=f.node('giscusMount').children[0];assert.equal(script.attrs['data-term'],'dayday-video-v01');assert.equal(script.attrs['data-input-position'],'bottom');assert(script.attrs['data-theme'].includes('giscus-compose.css'));
 f.node('composerCollapse').events.click();assert.equal(f.node('composerBody').hidden,true);
 console.log('Passed: global newest three include replies, safe text, snapshot-only requests, independent video comments, bubble counts, bottom composer.');
})().catch(e=>{console.error(e);process.exitCode=1});
