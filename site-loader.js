(() => {
  'use strict';
  const root = document.documentElement;
  const preview = new URLSearchParams(location.search).get('intro') === 'preview';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sessionKey = 'portfolio-loader-entered-v1';
  const slowNavigationDelay = 14000;
  let visited = false;
  try { visited = sessionStorage.getItem(sessionKey) === 'yes'; } catch {}
  // Internal links and history are continuations, even if the previous page was
  // a preview, an older cached page, or unable to save its session marker.
  try { visited ||= Boolean(document.referrer) && new URL(document.referrer).origin === location.origin; } catch {}
  const navigation = performance.getEntriesByType?.('navigation')[0];
  visited ||= navigation?.type === 'back_forward' || navigation?.type === 'reload';
  try { sessionStorage.setItem(sessionKey, 'yes'); } catch {}

  const approachDuration = 950;
  const glowDuration = 260;
  const fadeDuration = 420;
  let overlay, canvas, context, controls, frame = 0, watchdog = 0, delayedStart = 0;
  let bodyObserver, contentObserver;
  let width = 0, height = 0, previous = 0, startedAt = 0, approach = 0, collisionTime = 0, loadProgress = 0;
  let running = false, ready = false, held = false, previewSlow = false, dismissed = false, mounted = false, previousFocus, locked = [];
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
  const hash = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };

  function finish() {
    dismissed = true;
    clearTimeout(delayedStart);
    bodyObserver?.disconnect();
    cleanup();
  }

  function cleanup() {
    running = false;
    cancelAnimationFrame(frame);
    clearTimeout(watchdog);
    contentObserver?.disconnect();
    root.classList.remove('intro-pending', 'intro-running');
    const restoreFocus = overlay?.contains(document.activeElement);
    overlay?.remove();
    overlay = null;
    for (const element of locked) element.inert = false;
    locked = [];
    window.removeEventListener('resize', resize);
    document.removeEventListener('keydown', onKey);
    motion.removeEventListener('change', onMotionChange);
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    if (controls) controls.querySelectorAll('[aria-pressed]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  }

  function onKey(event) { if (event.key === 'Escape') finish(); }
  function onMotionChange() {
    if (motion.matches) {
      collisionTime = 0;
      if (held) draw(false);
    }
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (held) draw(false);
  }

  function movingGridGlow(leftX, rightX) {
    const slope = height * .24 / width;
    const radius = Math.max(28, Math.min(42, width * .035));
    const left = { x: leftX - 4, y: height / 2 - (leftX - 4 - width / 2) * slope };
    const right = { x: rightX + 4, y: height / 2 - (rightX + 4 - width / 2) * slope };
    const overlap = clamp(1 - Math.hypot(left.x - right.x, left.y - right.y) / (radius * 2));
    const painted = new Set();
    // The lattice stays upright and aligned while a compact pool of light moves.
    // Draw overlapping cells once, so the merged glow never flashes brighter.
    for (const head of [left, right]) {
      for (let y = Math.floor((head.y - radius) / 5) * 5 + .5; y < head.y + radius; y += 5) {
        for (let x = Math.floor((head.x - radius) / 5) * 5 + .5; x < head.x + radius; x += 5) {
          if (x < 0 || y < 0 || x > width || y > height) continue;
          const key = `${x},${y}`;
          if (painted.has(key)) continue;
          painted.add(key);
          const leftLight = smooth(1 - Math.hypot(x - left.x, y - left.y) / radius);
          const rightLight = smooth(1 - Math.hypot(x - right.x, y - right.y) / radius);
          const strength = Math.max(leftLight, rightLight);
          if (strength < .015) continue;
          const blend = rightLight / (leftLight + rightLight);
          const meetingBlend = clamp(.5 + (x - width / 2) / (radius * 2));
          const hue = 278 - (blend * (1 - overlap) + meetingBlend * overlap) * 76;
          const texture = hash(x, y);
          context.globalAlpha = strength * (.7 + texture * .3) * .44;
          context.fillStyle = `hsl(${hue} 60% ${53 + texture * 6}%)`;
          context.beginPath(); context.roundRect(x, y, 3.5, 3.5, 1); context.fill();
        }
      }
    }
    context.globalAlpha = 1;
  }

  function comet(x, direction, colour, opacity) {
    const slope = height * .24 / width;
    const y = height / 2 - (x - width / 2) * slope;
    const tailX = x - direction * Math.min(width * .46, 520);
    const tailY = height / 2 - (tailX - width / 2) * slope;
    const trail = context.createLinearGradient(tailX, tailY, x, y);
    trail.addColorStop(0, `rgba(${colour},0)`);
    trail.addColorStop(1, `rgba(${colour},${opacity * .9})`);
    context.strokeStyle = trail;
    context.lineWidth = 1.4;
    context.beginPath(); context.moveTo(tailX, tailY); context.lineTo(x, y); context.stroke();
    const glow = context.createRadialGradient(x, y, 0, x, y, 19);
    glow.addColorStop(0, `rgba(${colour},${opacity * .2})`);
    glow.addColorStop(1, `rgba(${colour},0)`);
    context.fillStyle = glow; context.fillRect(x - 19, y - 19, 38, 38);
    context.fillStyle = `rgba(224,224,242,${opacity})`;
    context.beginPath(); context.arc(x, y, 3.1, 0, Math.PI * 2); context.fill();
  }

  function draw(isReady) {
    context.clearRect(0, 0, width, height);
    context.globalAlpha = 1;
    context.fillStyle = '#121212';
    context.fillRect(0, 0, width, height);

    if (motion.matches) {
      context.fillStyle = '#9a98b0';
      context.beginPath(); context.arc(width / 2, height / 2, 3.1, 0, Math.PI * 2); context.fill();
      canvas.style.opacity = isReady ? String(1 - smooth(collisionTime / 250)) : '1';
      return;
    }

    const progress = smooth(approach);
    const x = -12 + (width / 2 + 12) * progress;
    const opacity = .9 * (1 - smooth((collisionTime - 180) / 350));
    movingGridGlow(x, width - x);
    comet(x, 1, '173,125,216', opacity);
    comet(width - x, -1, '100,178,205', opacity);

    // Keep the glow compact, then dissolve the whole overlay into the real page.
    canvas.style.opacity = String(1 - smooth((collisionTime - glowDuration) / fadeDuration));
  }

  function tick(now) {
    if (!running || held) return;
    try {
      const delta = Math.min(64, now - previous);
      previous = now;
      const animationTime = now - startedAt;
      const loadingTime = previewSlow ? animationTime : now;
      const isReady = ready && (!previewSlow || animationTime >= 6000);
      const progress = previewSlow ? Math.min(.9, animationTime / 6500) : loadProgress;

      if (motion.matches) {
        collisionTime = isReady ? collisionTime + delta : 0;
      } else if (approach < 1) {
        if (isReady) approach = Math.min(1, approach + delta / approachDuration);
        else {
          // Resource completion moves the target closer. Motion slows gently as
          // it approaches that target and never collides before the page is ready.
          const target = Math.min(.96, .68 + progress * .26 + (1 - Math.exp(-loadingTime / 6500)) * .025);
          const step = Math.min(delta / approachDuration, Math.max(0, target - approach) * (1 - Math.exp(-delta / 550)));
          approach += step;
        }
      } else collisionTime += delta;

      overlay.dataset.state = !isReady ? 'loading' : approach < 1 ? 'approaching' : collisionTime < glowDuration ? 'collision' : 'revealing';
      overlay.dataset.approach = approach.toFixed(4);
      overlay.querySelector('.intro-loading-label').hidden = isReady || loadingTime < 4000;
      draw(isReady);
      if (isReady && collisionTime >= (motion.matches ? 250 : glowDuration + fadeDuration)) finish();
      else frame = requestAnimationFrame(tick);
    } catch { finish(); }
  }

  function lockContent() {
    for (const element of document.body.children) {
      if (element === controls || element === overlay || element.inert || ['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName)) continue;
      element.inert = true; locked.push(element);
    }
  }

  function play(moment, slow = false) {
    cleanup();
    dismissed = false;
    previousFocus = document.activeElement;
    held = Number.isFinite(moment);
    previewSlow = slow;
    approach = held ? Math.min(1, moment) : 0;
    collisionTime = held && moment >= 1 ? 180 : 0;
    overlay = document.createElement('div');
    overlay.className = 'portfolio-intro';
    overlay.dataset.state = 'loading';
    overlay.innerHTML = '<canvas aria-hidden="true"></canvas><span class="intro-status" role="status">Loading portfolio</span><span class="intro-loading-label" aria-hidden="true" hidden>Loading…</span><button type="button" class="intro-skip">Continue to site</button>';
    canvas = overlay.querySelector('canvas');
    context = canvas.getContext('2d');
    if (!context) { finish(); return; }
    document.body.append(overlay);
    lockContent();
    // The overlay mounts as soon as <body> exists, before the page finishes parsing.
    contentObserver = new MutationObserver(lockContent);
    contentObserver.observe(document.body, { childList: true });
    overlay.querySelector('button').addEventListener('click', finish);
    root.classList.add('intro-pending', 'intro-running');
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', onKey);
    motion.addEventListener('change', onMotionChange);
    resize();
    running = true;
    startedAt = previous = performance.now();
    if (held) draw(false);
    else {
      watchdog = setTimeout(finish, 10000);
      frame = requestAnimationFrame(tick);
    }
  }

  function showPreviewControls() {
      if (preview && !controls) {
        controls = document.createElement('div');
        controls.className = 'intro-preview';
        controls.setAttribute('role', 'group');
        controls.setAttribute('aria-label', 'Loader preview controls');
        controls.innerHTML = '<span>Loader preview</span><button type="button" class="intro-preview-replay">Replay</button><button type="button" data-moment="0.55" aria-pressed="false">Comets</button><button type="button" data-moment="1" aria-pressed="false">Collision</button><button type="button" class="intro-preview-slow" title="Preview a six-second load" aria-pressed="false">Slow load</button><a href="' + location.pathname + '">Done</a>';
        controls.querySelector('.intro-preview-replay').addEventListener('click', () => play());
        controls.querySelectorAll('[data-moment]').forEach(button => button.addEventListener('click', () => {
          play(Number(button.dataset.moment));
          button.setAttribute('aria-pressed', 'true');
        }));
        controls.querySelector('.intro-preview-slow').addEventListener('click', event => {
          play(undefined, true);
          event.currentTarget.setAttribute('aria-pressed', 'true');
        });
        document.body.append(controls);
      }
  }

  function mount() {
    if (mounted || dismissed) return;
    mounted = true;
    bodyObserver?.disconnect();
    try {
      showPreviewControls();
      play();
    } catch { finish(); }
  }

  function inViewport(element) {
    const bounds = element.getBoundingClientRect();
    return bounds.width && bounds.height && bounds.top < innerHeight && bounds.bottom > 0 && bounds.left < innerWidth && bounds.right > 0;
  }

  function firstVideoFrame(video) {
    if (video.readyState >= 2 || video.error || (!video.currentSrc && !video.getAttribute('src') && !video.querySelector('source'))) return Promise.resolve();
    return new Promise(resolve => {
      const settled = () => {
        video.removeEventListener('loadeddata', settled);
        video.removeEventListener('error', settled);
        resolve();
      };
      video.addEventListener('loadeddata', settled, { once: true });
      video.addEventListener('error', settled, { once: true });
    });
  }

  const domReady = document.readyState === 'loading'
    ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }))
    : Promise.resolve();
  const pageLoaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));

  // Styles, scripts, eager resources, fonts, and visible lazy media must settle
  // before the comets can meet. Below-fold lazy media continues on demand.
  domReady.then(async () => {
    // Preview controls remain available for an explicit replay, but visiting
    // this URL must not restart the loader during normal or back navigation.
    showPreviewControls();
    const images = [...document.images].filter(image => image.loading !== 'lazy' || inViewport(image));
    const videos = [...document.querySelectorAll('video')].filter(inViewport);
    const resources = [pageLoaded, document.fonts?.ready,
      ...images.map(image => image.decode()), ...videos.map(firstVideoFrame)];
    let settled = 0;
    const completed = () => { loadProgress = ++settled / resources.length; };
    await Promise.allSettled(resources.map(resource => Promise.resolve(resource).then(completed, completed)));
    ready = true;
    clearTimeout(delayedStart);
    if (overlay) overlay.querySelector('.intro-status').textContent = 'Portfolio ready';
  }).catch(finish);

  function begin() {
    if (dismissed || (visited && ready)) return;
    root.classList.add('intro-pending');
    // Recover if parsing or a required resource stalls indefinitely.
    watchdog = setTimeout(finish, 10000);
    if (document.body) mount();
    else {
      bodyObserver = new MutationObserver(() => { if (document.body) mount(); });
      bodyObserver.observe(root, { childList: true });
    }
  }

  window.addEventListener('pagehide', finish);
  window.addEventListener('pageshow', event => { if (event.persisted) finish(); });
  // Show the entrance once per tab session. Later pages remain immediately usable;
  // only an unfinished load lasting fourteen seconds brings the loader back.
  if (!visited) begin();
  else delayedStart = setTimeout(begin, Math.max(0, slowNavigationDelay - performance.now()));
})();
