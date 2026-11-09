(() => {
  'use strict';
  const config = {repo:'traviszzzhang/day-day-study-dance-with-wang',repoId:'R_kgDOVoMm0w',category:'Announcements',categoryId:'DIC_kwDOVoMm084DKvB4'};
  const origin='https://giscus.app', $=id=>document.getElementById(id);
  const cache=new Map(), pendingUpdates=new Map();let snapshotRequest=null,snapshotLoadedAt=0,snapshotGeneratedAt=null,snapshotFailed=false;
  const mount=$('giscusMount'), status=$('commentsStatus'), retry=$('commentsRetry');
  const theme=new URL('giscus-compose.css?v=4',document.baseURI).href;
  let currentVideo=null,frame=null,frameVideoId=null,frameGeneration=0,timer=null,syncTimer=null,syncAttempts=0,refreshing=false,visibleComments=20;
  const videos=()=>window.daydayLibrary?.getVideos()||[];
  const authorName=author=>author?.name?.trim()||author?.login||'GitHub 用户';
  const term=id=>`dayday-video-${id}`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function text(html){const t=document.createElement('template');t.innerHTML=String(html||'').replace(/<\/(p|div|li|blockquote|h[1-6])>|<br\s*\/?\s*>/gi,'\n');return t.content.textContent.trim()}
  function safeURL(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='github.com'?u.href:'#'}catch{return '#'}}
  function dateLabel(value){const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})}
  function visible(c){return !c.deletedAt&&!c.isMinimized}
  function normalized(c,videoId,isReply=false){return{id:c.id,videoId,author:authorName(c.author),createdAt:c.createdAt,url:safeURL(c.url),body:text(c.bodyHTML),isReply}}
  async function loadSnapshot(force=false){
    if(location.protocol==='file:')return;
    if(snapshotRequest)return snapshotRequest;
    if(!force&&Date.now()-snapshotLoadedAt<60000)return;
    snapshotRequest=(async()=>{
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
      try{
        const url=new URL('comment-data.json',document.baseURI);if(force)url.searchParams.set('t',String(Date.now()));
        const response=await fetch(url.href,{signal:controller.signal,cache:'no-cache'});
        if(!response.ok)throw new Error('Comments unavailable');const snapshot=await response.json();
        if(snapshot.version!==1||!snapshot.videos)throw new Error('Invalid comment data');
        for(const video of videos()){
          const data=snapshot.videos[video.id];if(!data||!Array.isArray(data.parents)||!Number.isFinite(data.count))continue;
          const parents=data.parents.filter(visible);const comments=parents.flatMap(c=>[normalized(c,video.id),...(c.replies||[]).filter(visible).map(r=>normalized(r,video.id,true))]);
          cache.set(video.id,{...data,parents,comments,loadedAt:Date.now()});
          if(pendingUpdates.get(video.id)===data.count)pendingUpdates.delete(video.id);
        }
        snapshotLoadedAt=Date.now();snapshotGeneratedAt=snapshot.generatedAt;snapshotFailed=false;
      }catch(error){snapshotFailed=true}
      finally{clearTimeout(timeout)}
    })();
    try{await snapshotRequest}finally{snapshotRequest=null;paintBadges();paintActivity();if(currentVideo)paintComments()}
  }
  async function loadVideo(id,force=false){await loadSnapshot(force);return cache.get(id)}
  function paintBadges(){document.querySelectorAll('[data-comments-for]').forEach(button=>{const result=cache.get(button.dataset.commentsFor);const count=Number.isFinite(result?.count)?result.count:null;const node=button.querySelector('[data-comment-count]');if(node)node.textContent=count===null?'评论':String(count);button.setAttribute('aria-label',`查看评论${count===null?'':`，${count} 条`}`)})}
  function paintActivity(){const host=$('recentComments');if(!host)return;const entries=[...cache.values()].flatMap(v=>v.comments||[]).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,3);host.replaceChildren();
    if(!entries.length){const empty=document.createElement('p');empty.className='activity-empty';empty.textContent=refreshing?'正在读取近期评论…':snapshotFailed?'动态暂时无法加载，请稍后刷新。':'还没有留言，来聊聊你喜欢的舞蹈吧。';host.appendChild(empty)}
    entries.forEach(entry=>{const video=videos().find(v=>v.id===entry.videoId);if(!video)return;const button=document.createElement('a');button.href=`index.html?video=${entry.videoId}&comments=1#${video.category==='宣传视频'?'films':video.category==='日常花絮'?'moments':'classroom'}`;button.className='activity-item';button.dataset.activityVideo=entry.videoId;button.innerHTML=`<span class="activity-avatar">${esc(entry.author.slice(0,1).toUpperCase())}</span><span class="activity-copy"><span class="activity-meta"><strong>${esc(entry.author)}</strong><time>${esc(dateLabel(entry.createdAt))}</time></span><span class="activity-body">${esc(entry.body||'分享了一条评论')}</span><span class="activity-video">${entry.isReply?'回复于':'评论于'} · ${esc(video.title)} ↗</span></span>`;host.appendChild(button)});
    const incomplete=snapshotFailed;if($('activityStatus'))$('activityStatus').textContent=refreshing?'更新中…':incomplete?'部分动态暂不可用':snapshotGeneratedAt?'最近 3 条评论 · 更新于 '+dateLabel(snapshotGeneratedAt):'最近 3 条评论 · 含回复';if($('refreshActivity'))$('refreshActivity').disabled=refreshing;
  }
  async function refreshAll(force=false){if(refreshing||location.protocol==='file:'||!$('recentComments'))return;refreshing=true;paintActivity();await loadSnapshot(force);refreshing=false;paintActivity()}
  function commentHTML(c,reply=false){return `<article class="read-comment ${reply?'is-reply':''}"><div class="read-comment-meta"><strong>${esc(authorName(c.author))}</strong><time>${esc(dateLabel(c.createdAt))}</time></div><p>${esc(text(c.bodyHTML))}</p><a href="${esc(safeURL(c.url))}" target="_blank" rel="noopener">查看原文 / 回复 ↗</a></article>`}
  function paintComments(){if(!currentVideo)return;const data=cache.get(currentVideo.id);const host=$('videoCommentList');
    if(location.protocol==='file:'){host.innerHTML='<p class="comment-empty">请在线访问网站查看评论。</p>';return}
    if(!data){host.innerHTML=snapshotFailed?'<p class="comment-empty">评论暂时无法读取，可点击刷新重试。</p>':'<p class="comment-empty">正在读取评论…</p>';return}
    if(data.error&&!data.parents){host.innerHTML='<p class="comment-empty">评论暂时无法读取，可点击刷新重试。</p>';return}
    const parents=[...(data.parents||[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));$('videoCommentCount').textContent=Number.isFinite(data.count)?`${data.count} 条`:'';
    host.innerHTML=parents.length?parents.slice(0,visibleComments).map(c=>commentHTML(c)+(c.replies||[]).filter(visible).map(r=>commentHTML(r,true)).join('')).join(''):'<p class="comment-empty">还没有评论，来做第一个留言的人吧。</p>';
    $('moreVideoComments').hidden=parents.length<=visibleComments;
    $('videoCommentNotice').textContent=snapshotFailed?'暂时显示上次发布的评论，可刷新重试。':pendingUpdates.has(currentVideo.id)?'评论已提交，正在自动同步最新评论…':'';
    $('videoDiscussionLink').href=data.discussionURL||`https://github.com/${config.repo}/discussions`;
  }
  function showError(){clearTimeout(timer);status.textContent='评论输入框暂时无法加载，请稍后重试。';retry.hidden=false}
  function destroyEditor(){frameGeneration++;clearTimeout(timer);frameVideoId=null;const old=frame;frame=null;if(old){old.src='about:blank';old.remove()}mount.replaceChildren()}
  function readSession(){
    const url=new URL(location.href);let session=url.searchParams.get('giscus')||'';
    try{if(session)localStorage.setItem('giscus-session',JSON.stringify(session));else session=JSON.parse(localStorage.getItem('giscus-session')||'""')}catch{session=''}
    if(url.searchParams.has('giscus')){url.searchParams.delete('giscus');history.replaceState(null,'',url.href)}
    return typeof session==='string'?session:'';
  }
  // The widget URL follows the official giscus/client.ts embed protocol.
  // Each iframe owns exactly one immutable video term; never retarget a live editor.
  function initialize(){
    if(!currentVideo)return;
    if(location.protocol==='file:'){status.textContent='请通过已发布的网站登录并评论。';return}
    destroyEditor();const generation=frameGeneration,id=currentVideo.id;frameVideoId=id;
    status.textContent='正在加载评论输入框…';retry.hidden=true;
    const cleanURL=new URL(location.href);cleanURL.searchParams.delete('giscus');cleanURL.hash='giscusMount';
    const params=new URLSearchParams({origin:cleanURL.href,session:readSession(),theme,reactionsEnabled:'0',emitMetadata:'1',inputPosition:'bottom',repo:config.repo,repoId:config.repoId,category:config.category,categoryId:config.categoryId,strict:'1',term:term(id),description:currentVideo.title,backLink:cleanURL.href});
    const editor=document.createElement('iframe');editor.className='giscus-frame';editor.title='聊聊这支舞：'+currentVideo.title;editor.setAttribute('allow','clipboard-write');editor.setAttribute('scrolling','no');editor.src=`${origin}/zh-CN/widget?${params}`;editor.style.height='260px';frame=editor;
    editor.addEventListener('load',()=>{if(generation!==frameGeneration||frame!==editor||frameVideoId!==currentVideo?.id)return;clearTimeout(timer);status.textContent='';retry.hidden=true});
    editor.addEventListener('error',()=>{if(generation===frameGeneration)showError()});mount.appendChild(editor);timer=setTimeout(()=>{if(generation===frameGeneration)showError()},30000);
  }
  function scheduleSync(){
    if(syncTimer||!pendingUpdates.size)return;
    syncTimer=setTimeout(async()=>{syncTimer=null;await loadSnapshot(true);syncAttempts++;if(pendingUpdates.size&&syncAttempts<120)scheduleSync()},3000);
  }
  function open(video){const changed=currentVideo?.id!==video.id;currentVideo=video;visibleComments=20;$('commentsVideoTitle').textContent=video.title;$('composerVideoName').textContent='正在评论：'+video.title;paintComments();if(changed||!frame)initialize();loadVideo(video.id)}
  function close(){destroyEditor();currentVideo=null}
  retry.addEventListener('click',initialize);
  $('refreshVideoComments').addEventListener('click',()=>{if(currentVideo)loadVideo(currentVideo.id,true)});$('moreVideoComments').addEventListener('click',()=>{visibleComments+=20;paintComments()});
  $('refreshActivity')?.addEventListener('click',()=>refreshAll(true));$('recentComments')?.addEventListener('click',event=>{const link=event.target.closest('[data-activity-video]');if(!link||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();window.daydayLibrary.openVideo(link.dataset.activityVideo,{comments:true})});
  window.addEventListener('dayday:cards-rendered',paintBadges);
  window.addEventListener('message',event=>{
    // Source identity and immutable frameVideoId reject late messages from an old video.
    if(event.origin!==origin||!frame||event.source!==frame.contentWindow||frameVideoId!==currentVideo?.id)return;
    const message=event.data?.giscus;if(!message)return;
    if(message.resizeHeight){const height=Number(message.resizeHeight);if(Number.isFinite(height))frame.style.height=`${Math.max(120,Math.min(height,4000))}px`}
    if(message.signOut){try{localStorage.removeItem('giscus-session')}catch{}initialize();return}
    if(message.error&&!/discussion not found/i.test(String(message.error))){showError();return}
    if(message.discussion||message.resizeHeight){clearTimeout(timer);status.textContent='';retry.hidden=true}
    if(message.discussion){const d=message.discussion,cached=cache.get(frameVideoId),count=(d.totalCommentCount||0)+(d.totalReplyCount||0);
      if(cached?.discussionURL&&cached.discussionURL!==safeURL(d.url)){showError();return}
      if(cached&&cached.count!==count){pendingUpdates.set(frameVideoId,count);syncAttempts=0;paintComments();loadSnapshot(true);scheduleSync()}
    }
  });
  setInterval(()=>{if(!document.hidden&&location.protocol!=='file:')loadSnapshot(true)},60000);
  window.daydayComments={open,close,compose:()=>{if(currentVideo&&!frame)initialize()}};window.dispatchEvent(new CustomEvent('dayday:comments-ready'));
  if(location.protocol==='file:'){if($('activityStatus'))$('activityStatus').textContent='在线访问后展示评论动态';if($('recentComments'))$('recentComments').textContent='本地预览不连接评论服务。';if($('refreshActivity'))$('refreshActivity').disabled=true}else refreshAll();
})();
