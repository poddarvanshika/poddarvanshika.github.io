const links = [...document.querySelectorAll('.section-nav a')];
const sections = links.map(link => document.querySelector(link.getAttribute('href')));
let scheduled = false;
function updateSection() {
  const threshold = window.innerWidth <= 760 ? 110 : 120;
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= threshold) current = section;
  }
  for (const link of links) {
    if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  scheduled = false;
}
function queueSectionUpdate() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateSection); }
}
window.addEventListener('scroll', queueSectionUpdate, { passive: true });
window.addEventListener('resize', queueSectionUpdate);
window.addEventListener('hashchange', queueSectionUpdate);
window.addEventListener('load', updateSection);
updateSection();
const hero = document.querySelector('.case-hero');
const motionToggle = document.querySelector('.motion-toggle');
motionToggle?.addEventListener('click', () => {
  const paused = hero.classList.toggle('paused');
  motionToggle.setAttribute('aria-pressed', String(paused));
  motionToggle.textContent = paused ? 'Play animation' : 'Pause animation';
});
const track = document.querySelector('.flow-track');
const flowButtons = [...document.querySelectorAll('[data-scroll]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
for (const button of flowButtons) button.addEventListener('click', () => {
  const step = track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
  track.scrollBy({left: Number(button.dataset.scroll) * step, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
});
function updateFlowButtons() {
  flowButtons[0].disabled = track.scrollLeft < 2;
  flowButtons[1].disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
}
track.addEventListener('scroll', updateFlowButtons, {passive:true});
window.addEventListener('resize', updateFlowButtons);
updateFlowButtons();
let toastTimer;
document.querySelectorAll('[data-pending]').forEach(button => button.addEventListener('click', () => {
  const toast = document.querySelector('.toast');
  toast.textContent = button.dataset.pending;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}));

// Autoplay silently, and release decoding work when a clip is off-screen.
const videos = [...document.querySelectorAll('video')];
const videoObserver = new IntersectionObserver(entries => {
  for (const {target:video,isIntersecting} of entries) {
    if (isIntersecting) {
      video.muted = true;
      video.play().catch(() => { video.controls = true; });
    } else video.pause();
  }
}, {threshold: 0.05});
videos.forEach(video => videoObserver.observe(video));
