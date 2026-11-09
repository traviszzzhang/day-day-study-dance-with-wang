(() => {
  'use strict';
  const videos=window.DAYDAY_VIDEOS||[],id=new URLSearchParams(location.search).get('id');
  const video=videos.find(v=>v.id===id),$=id=>document.getElementById(id);
  window.daydayLibrary={getVideos:()=>videos,openVideo:(id)=>{location.href=`video.html?id=${encodeURIComponent(id)}#comments`}};
  if(!video){$('videoDetail').hidden=true;$('invalidVideo').hidden=false;document.querySelector('.comment-composer').hidden=true;return}
  document.title=`${video.title} · Day Day 跟着王哥学舞蹈`;
  $('detailTitle').textContent=video.title;
  $('detailMeta').textContent=[video.category,...(video.category==='舞蹈教学与展示'?video.teachers:[]),video.date].join(' · ');
  $('detailPlayer').poster=video.poster;$('detailPlayer').src=video.src;$('detailDownload').href=video.src;
  const scene=video.category==='宣传视频'?'films':video.category==='日常花絮'?'moments':'classroom';$('backToVideos').href=`index.html#${scene}`;
  $('detailPlayer').addEventListener('error',()=>$('detailPlayerError').hidden=false);
  window.addEventListener('dayday:comments-ready',()=>{window.daydayComments.open(video);if(location.hash==='#giscusMount')window.daydayComments.compose();if(location.hash==='#comments')requestAnimationFrame(()=>$('comments').scrollIntoView({block:'start'}))},{once:true});
  const composer=document.querySelector('.comment-composer');
  if('ResizeObserver' in window)new ResizeObserver(entries=>{document.body.style.setProperty('--composer-gap',`${Math.ceil(entries[0].borderBoxSize?.[0]?.blockSize||composer.getBoundingClientRect().height)+24}px`)}).observe(composer);
})();
