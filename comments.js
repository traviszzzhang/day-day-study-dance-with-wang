(() => {
  'use strict';
  const config = {
    repo: 'traviszzzhang/day-day-study-dance-with-wang',
    repoId: 'R_kgDOVoMm0w',
    category: 'Announcements',
    categoryId: 'DIC_kwDOVoMm084DKvB4',
  };
  const origin = 'https://giscus.app';
  const mount = document.getElementById('giscusMount');
  const status = document.getElementById('commentsStatus');
  const retry = document.getElementById('commentsRetry');
  let currentVideo = null;
  let frame = null;
  let initialized = false;
  let observer = null;
  let timeout = null;
  let ready = false;
  const term = () => `dayday-video-${currentVideo.id}`;

  function showError() {
    clearTimeout(timeout);
    status.textContent = '评论暂时无法加载，你可以稍后重试。';
    retry.hidden = false;
  }
  function updateThread() {
    if (!frame || !ready || !currentVideo) return;
    frame.contentWindow.postMessage({ giscus: { setConfig: {
      term: term(),
      description: currentVideo.title,
      strict: true,
      emitMetadata: true,
      theme: 'transparent_dark',
      lang: 'zh-CN',
    } } }, origin);
  }
  function attachFrame() {
    const found = mount.querySelector('iframe.giscus-frame');
    if (!found || found === frame) return;
    frame = found;
    frame.title = '视频评论';
    frame.addEventListener('load', () => {
      ready = true;
      clearTimeout(timeout);
      status.textContent = '';
      retry.hidden = true;
      updateThread();
    });
  }
  function initialize() {
    if (location.protocol === 'file:') {
      status.textContent = '评论区需要在线访问，请打开已发布的网站参与讨论。';
      return;
    }
    initialized = true;
    ready = false;
    status.textContent = '正在连接评论区…';
    retry.hidden = true;
    observer = new MutationObserver(attachFrame);
    observer.observe(mount, { childList: true, subtree: true });
    const script = document.createElement('script');
    script.src = `${origin}/client.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    const attrs = {
      repo: config.repo, 'repo-id': config.repoId,
      category: config.category, 'category-id': config.categoryId,
      mapping: 'specific', term: term(), strict: '1',
      'reactions-enabled': '1', 'emit-metadata': '1',
      'input-position': 'top', theme: 'transparent_dark',
      lang: 'zh-CN', loading: 'eager',
    };
    Object.entries(attrs).forEach(([name, value]) => script.setAttribute(`data-${name}`, value));
    script.addEventListener('error', showError);
    mount.appendChild(script);
    timeout = setTimeout(showError, 30000);
  }
  function open(video) {
    currentVideo = video;
    document.getElementById('commentsVideoTitle').textContent = video.title;
    if (!initialized) initialize();
    else updateThread();
  }
  retry.addEventListener('click', () => {
    observer?.disconnect();
    clearTimeout(timeout);
    mount.replaceChildren();
    frame = null;
    initialized = false;
    if (currentVideo) initialize();
  });
  window.addEventListener('message', event => {
    if (event.origin !== origin || !frame || event.source !== frame.contentWindow) return;
    const message = event.data?.giscus;
    if (!message) return;
    if (message.error && !/discussion not found/i.test(String(message.error))) showError();
    else if (message.discussion || message.resizeHeight) {
      clearTimeout(timeout);
      status.textContent = '';
      retry.hidden = true;
    }
  });
  window.daydayComments = { open };
})();
