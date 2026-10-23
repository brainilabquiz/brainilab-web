/* A passive check on return. Reading is never replaced or reloaded automatically. */
(() => {
  const root = document.querySelector('[data-news-revision]');
  const link = root?.querySelector('[data-news-refresh]');
  const label = link?.querySelector('[data-news-refresh-label]');
  const status = root?.querySelector('[data-news-update-status]');
  if (!root || !link || !label || !status) return;
  const original = root.dataset.newsRevision;
  const originalTime = Date.parse(root.dataset.newsGeneratedAt) || 0;
  let checkedAt = Date.now(), pending = false, announced = '';
  async function check() {
    if (document.hidden || pending || Date.now() - checkedAt < 300000) return;
    pending = true;
    checkedAt = Date.now();
    try {
      const response = await fetch('/api/breaking-news/status', {
        credentials: 'omit', cache: 'no-store',
        headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(4000)
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return;
      const data = await response.json(), time = Date.parse(data?.generatedAt);
      if (!/^[a-f0-9]{16}$/.test(data?.revision) || !Number.isFinite(time) || time < originalTime || time > Date.now()) return;
      const changed = data.revision !== original;
      label.textContent = changed ? 'Updated brief ready' : 'Check latest';
      link.toggleAttribute('data-news-new', changed);
      if (changed && announced !== data.revision) {
        status.textContent = 'An updated brief is available. Follow the update link to read it.';
        announced = data.revision;
      } else if (!changed) status.textContent = '';
    } catch { /* Offline and failed checks leave the current reading and link intact. */ }
    finally { pending = false; }
  }
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pageshow', check);
  window.addEventListener('focus', check);
})();
