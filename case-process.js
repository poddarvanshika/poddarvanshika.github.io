(() => {
  const tabs = [...document.querySelectorAll('.process-tabs [role="tab"]')];
  function selectTab(index) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = i !== index;
    });
    tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectTab(next); tabs[next].focus(); }
    });
  });
  const viewer = document.getElementById('process-viewer');
  const image = document.getElementById('process-full-image');
  const zoom = document.getElementById('process-zoom');
  function setZoom(zoomed) {
    image.classList.toggle('zoomed', zoomed);
    const label = zoomed ? 'Zoom out' : 'Zoom in';
    zoom.setAttribute('aria-label', label);
    zoom.setAttribute('title', label);
    zoom.setAttribute('aria-pressed', String(zoomed));
  }
  document.querySelectorAll('.process-board').forEach(button => button.addEventListener('click', () => {
    const path = 'assets/process/' + button.dataset.board + '-full.png';
    image.src = path;
    image.alt = button.dataset.title;
    setZoom(false);
    document.getElementById('process-viewer-title').textContent = button.dataset.title;
    viewer.showModal();
    document.querySelector('.process-viewer-scroll').scrollTo(0, 0);
  }));
  zoom.addEventListener('click', () => {
    setZoom(!image.classList.contains('zoomed'));
  });
  document.getElementById('process-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
})();
