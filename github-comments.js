/* Public, read-only GitHub REST access. No tokens or build snapshots are used. */
(() => {
  'use strict';
  function createSource({repo, videos, onUpdate=()=>{}, fetchImpl=fetch}) {
    const apiRoot=`https://api.github.com/repos/${repo}`;
    const cache=new Map(), discussions=new Map(), names=new Map(), requests=new Map(), dirty=new Set();
    let loaded=false, loading=null, lastError=null, loadedAt=null, blockedUntil=0;
    const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const known=new Set(videos.map(v=>v.id));
    async function json(url) {
      if(Date.now()<blockedUntil)throw new Error(`GitHub 读取次数已达上限，请在 ${new Date(blockedUntil).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 后刷新。`);
      const target=new URL(url);
      if(target.origin!=='https://api.github.com'||(!target.pathname.startsWith(`/repos/${repo}/`)&&!/^\/users\/[A-Za-z0-9-]+$/.test(target.pathname)))throw new Error('无效的评论接口');
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      try {
        const response=await fetchImpl(target.href,{headers:{Accept:'application/vnd.github.v3.full+json'},cache:'no-store',credentials:'omit',signal:controller.signal});
        if(!response.ok) {
          if(response.status===429||(response.status===403&&response.headers.get('x-ratelimit-remaining')==='0')) {
            blockedUntil=Number(response.headers.get('x-ratelimit-reset'))*1000||Date.now()+60000;
            throw new Error(`GitHub 读取次数已达上限，请在 ${new Date(blockedUntil).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 后刷新。`);
          }
          throw new Error(`评论读取失败（HTTP ${response.status}），请稍后刷新。`);
        }
        return {data:await response.json(),link:response.headers.get('link')||''};
      } catch(error) {
        if(error.name==='AbortError')throw new Error('GitHub 评论读取超时，请稍后刷新。');
        if(error instanceof TypeError)throw new Error('暂时无法连接 GitHub，请检查网络后刷新。');
        throw error;
      } finally {clearTimeout(timer)}
    }
    async function list(path) {
      let url=`${apiRoot}/${path}${path.includes('?')?'&':'?'}per_page=100`,rows=[];
      while(url) {const result=await json(url);if(!Array.isArray(result.data))throw new Error('GitHub 评论数据格式无效');rows.push(...result.data);url=result.link.match(/<([^>]+)>;\s*rel="next"/)?.[1]||null}
      return rows;
    }
    async function hash(text) {const bytes=await crypto.subtle.digest('SHA-1',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
    async function author(user) {
      if(!user?.login)return {login:'GitHub 用户',name:null};
      const login=user.login;
      if(!names.has(login))names.set(login,(async()=>{try{return (await json(`https://api.github.com/users/${encodeURIComponent(login)}`)).data.name||null}catch{return null}})());
      return {login,name:await names.get(login)};
    }
    async function comments(thread) {
      if(thread.comments===0)return {count:0,parents:[],discussionURL:thread.html_url,number:thread.number};
      const rows=(await list(`discussions/${thread.number}/comments`)).filter(c=>!c.deleted_at&&!c.is_minimized),nodes=new Map();
      for(const row of rows)nodes.set(String(row.id),{id:row.node_id||String(row.id),author:await author(row.user),createdAt:row.created_at,url:row.html_url,bodyHTML:row.body_html||`<p>${escape(row.body_text??row.body??'')}</p>`,bodyText:row.body_text??row.body??null,deletedAt:null,isMinimized:false,isReply:row.parent_id!=null,replies:[]});
      const parents=[];
      for(const row of rows) {
        const node=nodes.get(String(row.id));let rootId=row.parent_id==null?null:String(row.parent_id),visited=new Set([String(row.id)]);
        while(rootId&&nodes.has(rootId)&&!visited.has(rootId)) {visited.add(rootId);const parent=rows.find(r=>String(r.id)===rootId);if(parent?.parent_id==null)break;rootId=String(parent.parent_id)}
        if(rootId&&nodes.has(rootId)&&rootId!==String(row.id))nodes.get(rootId).replies.push(node);else parents.push(node);
      }
      return {count:rows.length,parents,discussionURL:thread.html_url,number:thread.number};
    }
    const threadData=new Map();
    function combine(id) {
      const threads=discussions.get(id)||[],parts=threads.map(t=>threadData.get(t.number));
      if(parts.some(p=>!p||p.error)){cache.set(id,{...(cache.get(id)||{}),error:true,errorMessage:'部分评论暂时无法读取，请稍后刷新。'});return}
      const parents=parts.flatMap(p=>p.parents),count=parts.reduce((sum,p)=>sum+p.count,0);
      cache.set(id,{count,parents,discussionURL:parts.at(-1)?.discussionURL,threadNumbers:threads.map(t=>t.number)});
    }
    async function loadAll(force=false) {
      if(loading)return loading;if(loaded&&!force)return;
      loading=(async()=>{
        try {
          const hashes=new Map(await Promise.all(videos.map(async v=>[await hash(`dayday-video-${v.id}`),v.id])));
          const rows=await list('discussions'),mapping=new Map();
          for(const thread of rows) {
            const title=String(thread.title||'').match(/^dayday-video-(v\d+)$/);
            const body=String(thread.body||thread.body_text||'');
            const digest=body.match(/<!--\s*sha1:\s*([a-f0-9]{40})\s*-->/i)?.[1]?.toLowerCase();
            const id=hashes.get(digest)||(title&&known.has(title[1])?title[1]:null);
            if(!id)continue;if(!mapping.has(id))mapping.set(id,[]);mapping.get(id).push(thread);
          }
          discussions.clear();mapping.forEach((value,key)=>discussions.set(key,value));threadData.clear();lastError=null;
          const queue=[...mapping.values()].flat();
          await Promise.all(Array.from({length:3},async()=>{while(queue.length){const thread=queue.shift();try{threadData.set(thread.number,await comments(thread))}catch(error){threadData.set(thread.number,{error:true});lastError=error}}}));
          // Replace the entire view, including deleted discussions and zero-comment threads.
          for(const video of videos)combine(video.id);
          loaded=true;loadedAt=new Date().toISOString();
        }catch(error){lastError=error;loaded=true}
      })();
      try{await loading}finally{loading=null;onUpdate()}
    }
    async function loadVideo(id,{force=false,number=null}={}) {
      if(!known.has(id))return;
      if(!loaded||loading)await loadAll();
      if(!force)return cache.get(id);
      if(requests.has(id)){dirty.add(id);return requests.get(id)}
      const request=(async()=>{
        do {
          dirty.delete(id);
          const threads=[...(discussions.get(id)||[])];
          if(Number.isInteger(number)&&number>0&&!threads.some(t=>t.number===number))threads.push({number,html_url:`https://github.com/${repo}/discussions/${number}`});
          discussions.set(id,threads);
          if(!threads.length){await loadAll(true);return cache.get(id)}
          try{for(const thread of threads)threadData.set(thread.number,await comments(thread));combine(id);lastError=null;loadedAt=new Date().toISOString()}
          catch(error){lastError=error;cache.set(id,{...(cache.get(id)||{}),error:true,errorMessage:error.message})}
          onUpdate();
        }while(dirty.has(id));
        return cache.get(id);
      })();
      requests.set(id,request);try{return await request}finally{requests.delete(id)}
    }
    return {cache,loadAll,loadVideo,get error(){return lastError?.message||null},get loadedAt(){return loadedAt}};
  }
  window.DaydayCommentSource={create:createSource};
})();
