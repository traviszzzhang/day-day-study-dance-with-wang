(() => {
  const videos=window.DAYDAY_VIDEOS||[];
  const video=videos.find(v=>v.id===new URLSearchParams(location.search).get('id'));
  const target=new URL('index.html',location.href);
  if(video){target.searchParams.set('video',video.id);target.searchParams.set('comments','1');target.hash=video.category==='宣传视频'?'films':video.category==='日常花絮'?'moments':'classroom'}
  const session=new URLSearchParams(location.search).get('giscus');if(session)target.searchParams.set('giscus',session);
  location.replace(target.href);
})();
