(() => {
  const key = 'portfolio-theme-v2';
  let current = 'dark';
  try { current = localStorage.getItem(key) === 'light' ? 'light' : 'dark'; } catch {}
  function sync() {
    document.documentElement.dataset.theme = current;
    document.body?.classList.toggle('dark', current === 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = current === 'dark' ? '#121212' : '#ffffff';
  }
  window.portfolioTheme = {
    set(value) {
      const next = value === 'light' ? 'light' : 'dark';
      const changed = next !== current;
      current = next;
      try { localStorage.setItem(key, current); } catch {}
      sync();
      if (changed) window.dispatchEvent(new Event('portfolio-theme-change'));
    },
    get() { return current; }
  };
  sync();
  document.addEventListener('DOMContentLoaded', sync);
  function restore() {
    let saved = current;
    try { saved = localStorage.getItem(key) || current; } catch {}
    window.portfolioTheme.set(saved);
  }
  window.addEventListener('pageshow', restore);
  window.addEventListener('storage', event => { if (event.key === key) restore(); });
})();
