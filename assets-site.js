(() => {
  'use strict';
  const main = document.getElementById('main');
  const cursor = document.querySelector('.site-cursor');
  const curtain = document.querySelector('.page-curtain');
  const routeStatus = document.getElementById('route-status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const motion = window.PortfolioMotion;
  let cleanupPage = () => {};
  let navigating = false;
  const homePath = '/yuzineda.github.io/';
  let currentPath = location.pathname;
  let keyboardMode = false;
  const pageCache = new Map();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  document.documentElement.classList.add('js-ready');
  history.scrollRestoration = 'manual';

  function setupCursor() {
    const sync = () => {
      document.body.classList.toggle('has-custom-cursor', finePointer.matches && !reducedMotion.matches && !keyboardMode);
      if (!finePointer.matches || reducedMotion.matches || keyboardMode) cursor.style.opacity = '0';
    };
    finePointer.addEventListener('change', sync);
    reducedMotion.addEventListener('change', sync);
    sync();
    document.addEventListener('pointermove', event => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
      if (keyboardMode) { keyboardMode = false; sync(); }
      const target = event.target instanceof Element ? event.target : null;
      const mode = target?.closest('[data-cursor]')?.getAttribute('data-cursor');
      cursor.className = 'site-cursor' + (mode ? ' cursor-' + mode : target?.closest('a,button') ? ' cursor-link' : '');
      cursor.textContent = mode === 'view' ? 'VIEW ↗' : mode === 'drag' ? 'DRAG' : mode === 'play' ? 'PLAY' : '';
      cursor.style.transform = 'translate3d(' + event.clientX + 'px,' + event.clientY + 'px,0) translate(-50%,-50%)';
      cursor.style.opacity = navigating ? '0' : '1';
    }, { passive: true });
    document.addEventListener('pointerout', event => { if (!event.relatedTarget) cursor.style.opacity = '0'; });
    document.addEventListener('keydown', event => {
      if (event.key === 'Tab') { keyboardMode = true; sync(); }
    });
  }

  function setupPlayground() {
    const stage = main.querySelector('.hero-stage');
    if (!stage) return () => {};
    const hero = main.querySelector('.hero');
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const nodes = Array.from(stage.querySelectorAll('[data-object]'));
    let width = stage.clientWidth;
    let height = stage.clientHeight;
    let frame = 0;
    let lastTime = 0;
    let held = null;
    let mouse = null;
    let visible = true;
    let disposed = false;
    let manualUntil = 0;
    let paletteIndex = 0;
    const backgrounds = ['#f4f3ec', '#e8e2ef', '#eaf0d9', '#f5e7db'];
    const objects = nodes.map((el, index) => ({
      el, homeX: Number(el.dataset.homeX), homeY: Number(el.dataset.homeY),
      x: 0, y: 0, w: el.offsetWidth, h: el.offsetHeight,
      vx: 0, vy: 0, angle: el.dataset.kind === 'magnifier' ? 0 : [-14, 13, -14, -10, 9][index], spin: 0,
      initialAngle: el.dataset.kind === 'magnifier' ? 0 : [-14, 13, -14, -10, 9][index], color: 0,
    }));
    function placeAtHome(item) {
      item.w = item.el.offsetWidth;
      item.h = item.el.offsetHeight;
      item.x = clamp(item.homeX * width - item.w / 2, 2, Math.max(2, width - item.w - 2));
      const homeY = item.el.dataset.kind === 'magnifier' && width < 600 ? .43 : item.homeY;
      item.y = clamp(homeY * height - item.h / 2, 2, Math.max(2, height - item.h - 2));
      item.vx = item.vy = item.spin = 0;
      item.angle = item.initialAngle;
      item.el.style.left = '0px';
      item.el.style.top = '0px';
    }
    function draw(item) {
      if (item.el.dataset.kind === 'magnifier') item.angle = item.spin = 0;
      item.el.style.transform = 'translate3d(' + item.x.toFixed(2) + 'px,' + item.y.toFixed(2) + 'px,0) rotate(' + item.angle.toFixed(2) + 'deg)';
    }
    objects.forEach(item => { placeAtHome(item); draw(item); });
    const lens = motion?.heroLens(stage);
    const autoEnabled = () => !reducedMotion.matches && !document.body.classList.contains('motion-paused');
    function tick(time) {
      frame = 0;
      if (disposed || document.hidden || !visible) { lastTime = 0; return; }
      const dt = lastTime ? clamp((time - lastTime) / 16.667, .35, 2) : 1;
      lastTime = time;
      let activity = false;
      const drifting = autoEnabled();
      for (const item of objects) {
        if (item.el.dataset.kind === 'orb' && drifting && !held && time > manualUntil) {
          const targetX = item.homeX * width - item.w / 2 + Math.sin(time / 5000) * Math.min(75, width * .06);
          const targetY = item.homeY * height - item.h / 2 + Math.cos(time / 6800) * Math.min(28, height * .06);
          item.vx += (clamp((targetX - item.x) * .018, -.35, .35) - item.vx) * .035;
          item.vy += (clamp((targetY - item.y) * .018, -.25, .25) - item.vy) * .035;
        }
        if (!held || held.item !== item) {
          item.x += item.vx * dt;
          item.y += item.vy * dt;
          item.angle += item.spin * dt;
          const damp = Math.pow(reducedMotion.matches ? .72 : .965, dt);
          item.vx *= damp; item.vy *= damp; item.spin *= Math.pow(.94, dt);
        }
        const maxX = Math.max(0, width - item.w);
        const maxY = Math.max(0, height - item.h);
        if (item.x < 0) { item.x = 0; item.vx = Math.abs(item.vx) * .67; }
        if (item.x > maxX) { item.x = maxX; item.vx = -Math.abs(item.vx) * .67; }
        if (item.y < 0) { item.y = 0; item.vy = Math.abs(item.vy) * .67; }
        if (item.y > maxY) { item.y = maxY; item.vy = -Math.abs(item.vy) * .67; }
        activity ||= Math.abs(item.vx) + Math.abs(item.vy) + Math.abs(item.spin) > .055;
      }
      for (let a = 0; a < objects.length; a++) {
        for (let b = a + 1; b < objects.length; b++) {
          const one = objects[a], two = objects[b];
          const dx = two.x + two.w / 2 - one.x - one.w / 2;
          const dy = two.y + two.h / 2 - one.y - one.h / 2;
          const distance = Math.hypot(dx, dy);
          const radius = Math.min(one.w, one.h) * .43 + Math.min(two.w, two.h) * .43;
          if (distance > 0 && distance < radius) {
            const nx = dx / distance, ny = dy / distance;
            const overlap = radius - distance;
            const oneHeld = held?.item === one, twoHeld = held?.item === two;
            if (!oneHeld) { one.x -= nx * overlap * (twoHeld ? 1 : .5); one.y -= ny * overlap * (twoHeld ? 1 : .5); }
            if (!twoHeld) { two.x += nx * overlap * (oneHeld ? 1 : .5); two.y += ny * overlap * (oneHeld ? 1 : .5); }
            const relative = (one.vx - two.vx) * nx + (one.vy - two.vy) * ny;
            if (relative > 0) {
              if (!oneHeld) { one.vx -= relative * nx * .85; one.vy -= relative * ny * .85; one.spin -= relative * .06; }
              if (!twoHeld) { two.vx += relative * nx * .85; two.vy += relative * ny * .85; two.spin += relative * .06; }
            }
            activity = true;
          }
        }
      }
      objects.forEach(draw);
      lens?.update();
      if (activity || held || drifting) frame = requestAnimationFrame(tick);
      else lastTime = 0;
    }
    function wake() { if (!frame && visible && !document.hidden && !disposed) frame = requestAnimationFrame(tick); }
    function spark(item) {
      if (reducedMotion.matches) return;
      for (let i = 0; i < 6; i++) {
        const dot = document.createElement('span');
        dot.className = 'play-spark';
        dot.style.width = dot.style.height = '5px';
        dot.style.left = (item.x + item.w / 2) + 'px';
        dot.style.top = (item.y + item.h / 2) + 'px';
        dot.style.setProperty('--spark-color', ['#66528c', '#b4c755', '#e29474'][i % 3]);
        stage.append(dot);
        const angle = Math.PI * 2 * i / 6;
        const animation = dot.animate([
          { transform: 'translate(0,0) scale(1)', opacity: .9 },
          { transform: 'translate(' + Math.cos(angle) * 70 + 'px,' + Math.sin(angle) * 70 + 'px) scale(.1)', opacity: 0 },
        ], { duration: 450, easing: 'cubic-bezier(.1,.7,.3,1)' });
        animation.finished.then(() => dot.remove()).catch(() => dot.remove());
      }
    }
    for (const item of objects) {
      item.el.addEventListener('pointerdown', event => {
        if (event.button !== 0 || held) return;
        manualUntil = performance.now() + 6000;
        const rect = stage.getBoundingClientRect();
        held = { item, pointer: event.pointerId, offsetX: event.clientX - rect.left - item.x, offsetY: event.clientY - rect.top - item.y, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, lastTime: event.timeStamp, moved: false };
        item.el.setPointerCapture(event.pointerId);
        item.el.style.zIndex = '10';
        item.vx = item.vy = item.spin = 0;
        wake();
      }, options);
      item.el.addEventListener('pointermove', event => {
        if (!held || held.item !== item || held.pointer !== event.pointerId) return;
        const rect = stage.getBoundingClientRect();
        const elapsed = Math.max(event.timeStamp - held.lastTime, 8);
        const vx = (event.clientX - held.lastX) / elapsed * 16.667;
        const vy = (event.clientY - held.lastY) / elapsed * 16.667;
        item.vx = clamp(vx, -24, 24);
        item.vy = clamp(vy, -24, 24);
        item.spin = clamp(vx * .08, -.9, .9);
        item.x = clamp(event.clientX - rect.left - held.offsetX, 0, width - item.w);
        item.y = clamp(event.clientY - rect.top - held.offsetY, 0, height - item.h);
        if (Math.hypot(event.clientX - held.startX, event.clientY - held.startY) > 5) held.moved = true;
        held.lastX = event.clientX; held.lastY = event.clientY; held.lastTime = event.timeStamp;
        draw(item);
        lens?.update();
        wake();
      }, options);
      const release = event => {
        if (!held || held.item !== item || held.pointer !== event.pointerId) return;
        const click = !held.moved && event.type === 'pointerup';
        if (event.timeStamp - held.lastTime > 100 || reducedMotion.matches) item.vx = item.vy = item.spin = 0;
        if (item.el.hasPointerCapture(event.pointerId)) item.el.releasePointerCapture(event.pointerId);
        item.el.style.zIndex = '';
        held = null;
        manualUntil = performance.now() + 6000;
        if (document.body.classList.contains('motion-paused')) item.vx = item.vy = item.spin = 0;
        if (click) {
          spark(item);
          if (item.el.dataset.kind === 'asterisk') {
            paletteIndex = (paletteIndex + 1) % backgrounds.length;
            hero.style.setProperty('--intro-paper', backgrounds[paletteIndex]);
          } else if (item.el.dataset.kind === 'orb') {
            item.color = (item.color + 1) % 3;
            item.el.dataset.color = String(item.color);
            stage.dispatchEvent(new Event('portfolio-sculpture-color'));
            item.el.style.background = [
              'radial-gradient(circle at 31% 25%,#effbb2,#d8eb76 24%,#adc64e 70%,#879f3e)',
              'radial-gradient(circle at 31% 25%,#e8ddfa,#c7b2e2 24%,#9174b7 75%,#735b99)',
              'radial-gradient(circle at 31% 25%,#ffe0cc,#f6b390 24%,#dc8562 75%,#c27453)',
            ][item.color];
          }
          if (autoEnabled()) { item.vy = -3; item.spin = 1.2; }
        }
        wake();
      };
      item.el.addEventListener('pointerup', release, options);
      item.el.addEventListener('pointercancel', release, options);
      item.el.addEventListener('keydown', event => {
        const delta = event.shiftKey ? 28 : 12;
        const changes = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] };
        if (changes[event.key]) {
          event.preventDefault();
          manualUntil = performance.now() + 6000;
          item.vx = item.vy = item.spin = 0;
          item.x = clamp(item.x + changes[event.key][0], 0, width - item.w);
          item.y = clamp(item.y + changes[event.key][1], 0, height - item.h);
          draw(item);
          lens?.update();
          wake();
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          spark(item);
          if (item.el.dataset.kind === 'asterisk') {
            paletteIndex = (paletteIndex + 1) % backgrounds.length;
            hero.style.setProperty('--intro-paper', backgrounds[paletteIndex]);
          }
          if (!reducedMotion.matches) item.angle += 20;
          draw(item);
          lens?.update();
        }
      }, options);
    }
    stage.addEventListener('pointermove', event => {
      if (!finePointer.matches || !autoEnabled() || held) return;
      const rect = stage.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top, time: event.timeStamp };
      if (mouse && point.time - mouse.time < 100) {
        const vx = clamp((point.x - mouse.x) * .08, -2.5, 2.5);
        const vy = clamp((point.y - mouse.y) * .08, -2.5, 2.5);
        for (const item of objects) {
          const distance = Math.hypot(point.x - item.x - item.w / 2, point.y - item.y - item.h / 2);
          if (distance < Math.min(item.w, item.h) * .5 + 12) {
            item.vx += vx; item.vy += vy; item.spin += vx * .03;
            wake();
          }
        }
      }
      mouse = point;
    }, { ...options, passive: true });
    stage.addEventListener('pointerleave', () => {
      mouse = null;
    }, options);
    main.querySelector('[data-reset-play]').addEventListener('click', () => {
      held = null;
      manualUntil = performance.now() + 600;
      objects.forEach(item => { placeAtHome(item); draw(item); });
      paletteIndex = 0;
      objects.forEach(item => { item.color = 0; item.el.dataset.color = '0'; });
      stage.dispatchEvent(new Event('portfolio-sculpture-color'));
      hero.style.setProperty('--intro-paper', backgrounds[0]);
      lens?.update(true);
      wake();
    }, options);
    const resize = new ResizeObserver(() => {
      const nextWidth = stage.clientWidth, nextHeight = stage.clientHeight;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth; height = nextHeight;
      objects.forEach(item => { placeAtHome(item); draw(item); });
      lens?.update(true);
      wake();
    });
    resize.observe(stage);
    const visibility = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) wake();
      else { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    });
    visibility.observe(stage);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
      else wake();
    }, options);
    const syncMotion = () => {
      if (!autoEnabled()) objects.forEach(item => { item.vx = item.vy = item.spin = 0; });
      wake();
    };
    document.addEventListener('portfolio-motion-change', syncMotion, options);
    reducedMotion.addEventListener('change', syncMotion, options);
    wake();
    return () => {
      disposed = true;
      controller.abort();
      resize.disconnect();
      visibility.disconnect();
      lens?.destroy();
      if (frame) cancelAnimationFrame(frame);
    };
  }

  function setupReveals() {
    main.querySelector('.about-copy')?.classList.remove('reveal', 'is-waiting');
    const elements = Array.from(main.querySelectorAll('.reveal,.section-overline,.project-title-grid,.project-meta,.project-cover,.project-note,.case-label,.case-body h2,.case-body > p,.case-decisions > div,.project-draft,.next-project,.about-copy > *,.about-symbol,.about-aside,.site-footer > *'));
    elements.forEach(element => element.classList.add('reveal'));
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.remove('is-waiting'));
      return () => {};
    }
    const controller = new AbortController();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove('is-waiting');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -24px 0px', threshold: .03 });
    elements.forEach(element => {
      if (element.getBoundingClientRect().top > innerHeight - 24) {
        element.classList.add('is-waiting');
        observer.observe(element);
      }
    });
    main.addEventListener('focusin', event => {
      let node = event.target instanceof Element ? event.target.closest('.reveal') : null;
      while (node) {
        node.classList.remove('is-waiting');
        observer.unobserve(node);
        node = node.parentElement?.closest('.reveal');
      }
    }, { signal: controller.signal });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) {
        elements.forEach(element => element.classList.remove('is-waiting'));
        observer.disconnect();
      }
    }, { signal: controller.signal });
    return () => { observer.disconnect(); controller.abort(); };
  }

  function updateNav() {
    document.querySelectorAll('.site-nav a').forEach(link => {
      link.removeAttribute('aria-current');
      const about = link.getAttribute('href').endsWith('#about');
      if ((about && location.hash === '#about') || (!about && (main.dataset.page !== 'home' || location.hash === '#work'))) link.setAttribute('aria-current', 'page');
    });
  }
  function setupCatalogue() {
    const buttons = [...main.querySelectorAll('[data-work-filter]')];
    const cards = [...main.querySelectorAll('[data-work-group]')];
    if (!buttons.length) return () => {};
    const controller = new AbortController();
    buttons.forEach(button => button.addEventListener('click', () => {
      const group = button.dataset.workFilter;
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      let count = 0;
      cards.forEach(card => {
        card.hidden = group !== 'all' && card.dataset.workGroup !== group;
        if (!card.hidden) {
          card.style.setProperty('--card-column', ['1 / 8', '8 / 13', '1 / 6', '6 / 13'][count % 4]);
          if (card.getBoundingClientRect().top < innerHeight) card.classList.remove('is-waiting');
          count++;
        }
      });
      main.querySelector('[data-work-count]').textContent = `${String(count).padStart(2, '0')} PROJECT${count === 1 ? '' : 'S'}`;
    }, { signal: controller.signal }));
    return () => controller.abort();
  }
  function initPage() {
    const cleanPlay = setupPlayground();
    const cleanReveals = setupReveals();
    const cleanMotion = motion?.mount(main) || (() => {});
    const cleanCatalogue = setupCatalogue();
    cleanupPage = () => { cleanPlay(); cleanReveals(); cleanMotion(); cleanCatalogue(); };
    updateNav();
  }
  function saveScroll() {
    history.replaceState({ ...(history.state || {}), scroll: [scrollX, scrollY] }, '', location.href);
  }
  function setScroll(url, saved) {
    document.documentElement.style.scrollBehavior = 'auto';
    if (saved) window.scrollTo(saved[0], saved[1]);
    else if (url.hash) {
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollTo(0, 0);
    } else window.scrollTo(0, 0);
    requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
  }
  async function getPage(path) {
    if (pageCache.has(path)) return pageCache.get(path);
    const pending = fetch(path, { credentials: 'same-origin' }).then(response => {
      if (!response.ok) throw new Error('Page could not be loaded.');
      return response.text();
    }).then(html => {
      const page = new DOMParser().parseFromString(html, 'text/html');
      const nextMain = page.getElementById('main');
      if (!nextMain) throw new Error('Page is incomplete.');
      return { content: nextMain.innerHTML, page: nextMain.dataset.page, title: page.title, description: page.querySelector('meta[name=description]')?.content || '' };
    }).catch(error => { pageCache.delete(path); throw error; });
    pageCache.set(path, pending);
    return pending;
  }
  async function navigate(url, event, settings = {}) {
    if (navigating) return;
    if (url.pathname === currentPath) {
      if (settings.push !== false) { saveScroll(); history.pushState({}, '', url.pathname + url.search + url.hash); }
      setScroll(url, settings.scroll);
      updateNav();
      return;
    }
    navigating = true;
    cursor.style.opacity = '0';
    document.body.classList.add('is-transitioning');
    const x = event?.detail ? event.clientX : innerWidth / 2;
    const y = event?.detail ? event.clientY : innerHeight / 2;
    const radius = Math.hypot(innerWidth, innerHeight);
    const tiny = 'circle(0px at ' + x + 'px ' + y + 'px)';
    const full = 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)';
    try {
      const page = await getPage(url.pathname);
      const update = () => {
        cleanupPage();
        if (settings.push !== false) { saveScroll(); history.pushState({}, '', url.pathname + url.search + url.hash); }
        main.innerHTML = page.content;
        main.dataset.page = page.page;
        document.body.dataset.page = page.page;
        document.title = page.title;
        document.querySelector('meta[name=description]').setAttribute('content', page.description);
        document.querySelector('meta[property="og:title"]').setAttribute('content', page.title);
        document.querySelector('meta[property="og:description"]').setAttribute('content', page.description);
        document.querySelector('meta[property="og:url"]').setAttribute('content', url.href);
        currentPath = url.pathname;
        setScroll(url, settings.scroll);
        initPage();
      };
      if (document.startViewTransition && !reducedMotion.matches && settings.animate !== false) {
        const transition = document.startViewTransition(update);
        await transition.ready;
        document.documentElement.animate([{ clipPath: tiny }, { clipPath: full }], {
          duration: 650, easing: 'cubic-bezier(.6,0,.2,1)', pseudoElement: '::view-transition-new(root)',
        });
        await transition.finished;
      } else if (!reducedMotion.matches && settings.animate !== false) {
        curtain.style.background = event?.target?.closest('[data-color]')?.dataset.color || '#f4f3ec';
        const cover = curtain.animate([{ clipPath: tiny }, { clipPath: full }], { duration: 300, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
        await cover.finished;
        update();
        cover.cancel();
        const uncover = curtain.animate([{ clipPath: full }, { clipPath: tiny }], { duration: 350, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
        await uncover.finished;
        uncover.cancel();
      } else update();
      routeStatus.textContent = page.title;
      if (!url.hash && !settings.scroll) main.focus({ preventScroll: true });
    } catch (error) {
      location.assign(url.href);
    } finally {
      document.body.classList.remove('is-transitioning');
      navigating = false;
    }
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented) return;
    const scrollLink = event.target instanceof Element ? event.target.closest('a[data-scroll]') : null;
    if (scrollLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      const url = new URL(scrollLink.href, location.href);
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (url.pathname === currentPath && target) {
        event.preventDefault();
        saveScroll();
        history.pushState({}, '', url.pathname + url.hash);
        target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
        updateNav();
        return;
      }
    }
    const link = event.target instanceof Element ? event.target.closest('a[data-route]') : null;
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || link.target === '_blank') return;
    event.preventDefault();
    navigate(url, event);
  });
  document.addEventListener('pointerover', event => {
    const link = event.target instanceof Element ? event.target.closest('a[data-route]') : null;
    if (!link || !finePointer.matches) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname !== currentPath) getPage(url.pathname).catch(() => {});
  }, { passive: true });
  addEventListener('popstate', event => navigate(new URL(location.href), null, { push: false, scroll: event.state?.scroll, animate: false }));
  addEventListener('pagehide', saveScroll);
  setupCursor();
  initPage();
  motion?.start(async () => {
    if (currentPath !== homePath && currentPath !== homePath + 'index.html') {
      await navigate(new URL(homePath, location.href), null);
    } else {
      history.replaceState({ ...(history.state || {}), scroll: [0, 0] }, '', homePath);
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      updateNav();
    }
  });
  if (location.hash) requestAnimationFrame(() => setScroll(new URL(location.href)));
})();
