/*
 * Homepage behaviour. Classic deferred script (no modules, no fetch of local files), so the page
 * also works when opened straight from disk. Everything that changes lives in js/data.js.
 */
(function () {
  'use strict';

  var D = window.SITE_DATA;
  if (!D) return;
  var T = D.text;

  // ------------------------------------------------------------------ helpers
  var html = document.documentElement;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var fill = function (tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; });
  };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var PHOTO_W = 1672;
  var PHOTO_H = 941;

  /** h('p', { class: 'x' }, 'text', child, …): small DOM builder (text is always set as text). */
  function h(tag, attrs) {
    var node = document.createElement(tag);
    setAttrs(node, attrs);
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }
  function s(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    setAttrs(node, attrs);
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }
  function setAttrs(node, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
    });
  }
  function append(node, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) child.forEach(function (c) { append(node, c); });
    else node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  function icon(id, cls) {
    return s('svg', { class: 'icon' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', focusable: 'false' }, s('use', { href: '#' + id }));
  }

  // one script for both pages: index.html (home) and residence.html (residence)
  var page = document.body.getAttribute('data-page') || 'home';
  var isHome = page === 'home';

  // ------------------------------------------------------------------ language
  // Serbian is written into the HTML; another language (js/data.js -> SITE_I18N) replaces the tagged
  // static text here, before anything else renders. data-i18n="key" sets the text,
  // data-i18n-attr="attr:key; attr:key" sets attributes.
  function applyStaticText() {
    var dict = D.html;
    html.lang = D.lang === 'sr' ? 'sr-Latn' : D.lang;
    if (dict) {
      $$('[data-i18n]').forEach(function (n) {
        var k = n.getAttribute('data-i18n');
        if (k in dict) n.textContent = dict[k];
      });
      $$('[data-i18n-attr]').forEach(function (n) {
        n.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
          var kv = pair.split(':');
          var k = (kv[1] || '').trim();
          if (k in dict) n.setAttribute(kv[0].trim(), dict[k]);
        });
      });
    }
    html.classList.remove('i18n-pending');
  }

  // The header button swaps the language: remember the choice, drop any ?lang= from the address (it
  // would override the choice) and reload in place. The flag tells the home page to skip its splash.
  function initLangSwitch() {
    var btn = $('#lang-btn');
    if (!btn) return;
    var L = T.langSwitch;
    btn.textContent = L.label;
    btn.setAttribute('lang', L.lang);
    btn.setAttribute('aria-label', L.title);
    btn.title = L.title;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var next = D.lang === 'sr' ? 'en' : 'sr';
      var stored = false;
      try {
        localStorage.setItem('lang', next);
        sessionStorage.setItem('langSwitch', '1');
        stored = localStorage.getItem('lang') === next;
      } catch (e) { /* storage blocked: the URL parameter below carries the choice */ }
      var params = location.search.replace(/^\?/, '').split('&').filter(function (kv) {
        return kv && kv.indexOf('lang=') !== 0;
      });
      if (!stored) params.push('lang=' + next);
      var search = params.length ? '?' + params.join('&') : '';
      if (search !== location.search) location.replace(location.pathname + search + location.hash);
      else location.reload();
    });
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var saveData = Boolean(navigator.connection && navigator.connection.saveData);
  var portraitMQ = window.matchMedia('(max-aspect-ratio: 1/1)');
  var wideMQ = window.matchMedia('(min-width: 900px) and (min-aspect-ratio: 5/4)');
  var money = new Intl.NumberFormat(T.locale, { style: 'currency', currency: T.currency, maximumFractionDigits: 0 });

  var byId = {};
  D.residences.forEach(function (r) { byId[r.id] = r; });
  var topFloor = Math.max.apply(null, D.residences.map(function (r) { return r.floor; }));

  var floorLabel = function (r) { return r.floor === topFloor ? T.topFloor : fill(T.floor, { n: r.floor }); };
  var nameLabel = function (r) { return fill(T.residenceName, { id: r.id }); };
  var priceLabel = function (r) { return r.status === 'sold' ? T.priceSold : fill(T.priceFrom, { price: money.format(r.price) }); };
  var areaNum = new Intl.NumberFormat(T.locale, { maximumFractionDigits: 1 });
  var area = function (n) { return fill(T.area, { n: areaNum.format(n) }); };
  // layout figures (type, areas, bedrooms, bathrooms) come from the residence's floor plan
  var planOf = function (r) { return D.plans[r.plan || D.defaultPlan]; };
  var residenceHref = function (r) { return D.residencePage + encodeURIComponent(r.id); };
  var centroid = function (pts) {
    var x = 0, y = 0;
    pts.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / pts.length, y / pts.length];
  };
  function pill(status) {
    return h('span', { class: 'pill pill--' + status }, h('span', { class: 'pill__dot', 'aria-hidden': 'true' }), T.status[status]);
  }

  // ------------------------------------------------------------------ brand and contact (from data)
  function renderBrand() {
    $$('[data-brand-word]').forEach(function (n) { n.textContent = D.brand.wordmark; });
    $$('[data-brand-tag]').forEach(function (n) { n.textContent = D.brand.tagline; });
    document.title = fill(T.pageTitle, { brand: D.brand.name });
    var bar = $('#splash-bar');
    if (bar) bar.setAttribute('aria-label', fill(T.splashLabel, { brand: D.brand.name }));
  }

  function addressLines(lines) {
    var out = [];
    lines.forEach(function (line, i) {
      if (i) out.push(h('br'));
      out.push(line);
    });
    return out;
  }

  function renderContact() {
    var c = D.contact;
    append($('#office'), [
      h('p', { class: 'office__title' }, c.officeName),
      h('p', null, addressLines(c.address)),
      h('p', { class: 'office__hours' }, c.hours),
      h('p', { class: 'office__links' },
        h('a', { href: c.phoneHref }, c.phone),
        h('a', { href: 'mailto:' + c.email }, c.email)),
    ]);
    append($('#footer-contact'), [
      h('p', null, addressLines(c.address)),
      h('p', null, h('a', { href: c.phoneHref }, c.phone)),
      h('p', null, h('a', { href: 'mailto:' + c.email }, c.email)),
    ]);
    D.social.forEach(function (l) {
      $('#footer-social').appendChild(h('li', null, h('a', { href: l.href, rel: 'noopener' }, l.label)));
    });
    D.legal.forEach(function (l) {
      $('#footer-legal').appendChild(h('li', null, h('a', { href: l.href }, l.label)));
    });
    $('#copyright').textContent = fill(T.copyright, { year: new Date().getFullYear(), brand: D.brand.name });
  }

  // ------------------------------------------------------------------ splash: real loading progress
  var splash = $('#splash');
  var splashFill = $('#splash-fill');
  var splashPct = $('#splash-pct');
  var splashBar = $('#splash-bar');
  var loader = {
    parts: { fonts: 0, video: 0, image: 0 },
    weights: { fonts: 0.15, video: 0.6, image: 0.25 },
    shown: 0,
    pct: -1,
    exited: false,
    set: function (k, v) { this.parts[k] = Math.max(this.parts[k], clamp(v, 0, 1)); },
    real: function () {
      var w = this.weights, p = this.parts;
      return w.fonts * p.fonts + w.video * p.video + w.image * p.image;
    },
  };
  var SPLASH_MIN = 1600;
  var SPLASH_MAX = 7000;

  function splashTick() {
    if (loader.exited) return;
    var now = performance.now();
    var real = loader.real();
    var gap = real - loader.shown;
    // ease towards the real value so the number never jumps
    if (gap > 0) loader.shown += Math.max(gap * 0.07, Math.min(gap, 0.0035));
    var timedOut = now >= SPLASH_MAX;
    var shown = timedOut ? 1 : loader.shown;
    var pct = Math.round(shown * 100);
    splashFill.style.transform = 'scaleX(' + shown.toFixed(4) + ')';
    if (pct !== loader.pct) {
      loader.pct = pct;
      splashPct.textContent = pct + '%';
      splashBar.setAttribute('aria-valuenow', String(pct));
    }
    if (timedOut || (real >= 1 && loader.shown >= 0.999 && now >= SPLASH_MIN)) exitSplash();
    else requestAnimationFrame(splashTick);
  }

  function exitSplash() {
    if (loader.exited) return;
    loader.exited = true;
    html.classList.remove('is-loading');
    html.classList.add('is-entered');
    splash.classList.add('is-leaving');
    var gone = false;
    var hide = function () {
      if (gone) return;
      gone = true;
      splash.hidden = true;
    };
    splash.addEventListener('transitionend', hide, { once: true });
    setTimeout(hide, 1400);
    onSplashExit();
  }

  // ------------------------------------------------------------------ hero video
  var hero = $('#top');
  var video = $('#hero-video');
  var useVideo = !reduceMotion.matches && !saveData;
  var playRefused = false;
  var heroInView = true;
  var splashGone = false;
  var textShown = false;
  var textTimer = 0;

  function videoSrc() {
    return portraitMQ.matches ? 'assets/video/hero-mobile.mp4' : 'assets/video/hero-desktop.mp4';
  }

  function tryPlay() {
    if (!useVideo) return;
    var p = video.play();
    if (p && typeof p.catch === 'function') {
      p.then(function () { playRefused = false; }, function (err) {
        if (err && err.name === 'AbortError') return; // interrupted by pause() or a new source
        if (playRefused) return;
        playRefused = true; // e.g. iOS Low Power Mode: keep the poster, show the text, retry on a tap
        loader.set('video', 1);
        if (splashGone) revealHeroText();
        document.addEventListener('pointerdown', function retry() {
          if (heroInView) tryPlay();
        }, { once: true, passive: true });
      });
    }
  }

  function startVideo() {
    if (!useVideo) {
      loader.set('video', 1);
      return;
    }
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('progress', function () {
      if (video.duration && video.buffered.length) {
        loader.set('video', 0.9 * (video.buffered.end(video.buffered.length - 1) / video.duration));
      }
    });
    video.addEventListener('canplay', function () { loader.set('video', 1); });
    video.addEventListener('error', function () { loader.set('video', 1); });
    video.addEventListener('playing', function () {
      video.classList.add('is-playing');
      if (splashGone) scheduleHeroText(1500);
    });
    video.src = videoSrc();
    tryPlay(); // straight away, behind the splash: iOS only buffers once play() has been called

    portraitMQ.addEventListener('change', function () {
      var t = video.currentTime;
      video.classList.remove('is-playing');
      video.src = videoSrc();
      video.addEventListener('loadedmetadata', function () {
        try { video.currentTime = t; } catch (e) { /* ignore */ }
      }, { once: true });
      if (heroInView) tryPlay();
    });

    // pause while the hero is off screen
    new IntersectionObserver(function (entries) {
      heroInView = entries[0].isIntersecting;
      if (!heroInView) video.pause();
      else if (!playRefused && splashGone) tryPlay();
    }).observe(hero);
  }

  function onSplashExit() {
    splashGone = true;
    if (!useVideo || playRefused || reduceMotion.matches) {
      revealHeroText();
    } else {
      try { video.currentTime = 0; } catch (e) { /* not seekable yet */ }
      if (!video.paused && video.readyState >= 3) scheduleHeroText(1500); // already running
      else if (heroInView) tryPlay();
      setTimeout(revealHeroText, 4000); // fallback if playback never starts
    }
  }

  function scheduleHeroText(ms) {
    if (textShown || textTimer) return;
    textTimer = setTimeout(revealHeroText, ms);
  }

  function revealHeroText() {
    if (textShown) return;
    textShown = true;
    clearTimeout(textTimer);
    hero.classList.add('is-revealed');
    setTimeout(function () { hero.classList.add('is-settled'); }, reduceMotion.matches ? 0 : 1500);
    setTimeout(loadViewer, 2500);
  }

  // ------------------------------------------------------------------ header
  var header = $('#header');
  var menuBtn = $('#menu-btn');
  var nav = $('#site-nav');
  var navLinks = $$('.site-nav__link');
  var isMenuOpen = function () { return header.classList.contains('is-open'); };

  function setMenu(open) {
    header.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? T.menuClose : T.menuOpen);
  }

  function initHeader() {
    menuBtn.setAttribute('aria-label', T.menuOpen);
    menuBtn.addEventListener('click', function () { setMenu(!isMenuOpen()); });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isMenuOpen()) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    document.addEventListener('pointerdown', function (e) {
      if (isMenuOpen() && !header.contains(e.target)) setMenu(false);
    }, { passive: true });
    window.matchMedia('(min-width: 961px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  var navSections = ['building', 'residences', 'availability', 'contact'].map(function (id) {
    return { id: id, el: document.getElementById(id) };
  });
  var lightSections = $$('.section--light, .section--soft');
  var currentSection = null;

  function updateHeader() {
    var probe = window.innerHeight * 0.4;
    var current = null;
    navSections.forEach(function (sct) {
      if (!sct.el) return;
      var r = sct.el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) current = sct.id;
    });
    // on the residence page the "Residences" link stays marked (set in the HTML)
    if (isHome && current !== currentSection) {
      currentSection = current;
      navLinks.forEach(function (a) {
        if (a.getAttribute('data-section') === current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    var hb = header.getBoundingClientRect();
    var hy = hb.top + hb.height / 2;
    var dense = lightSections.some(function (sct) {
      var r = sct.getBoundingClientRect();
      return r.top <= hy && r.bottom >= hy;
    });
    header.classList.toggle('is-dense', dense);
  }

  // ------------------------------------------------------------------ building reveal + 3D viewer
  var reveal = $('#building');
  var stage = $('#reveal-stage');
  var viewerBox = $('#viewer-box');
  var curtain = $('#curtain');
  var hint = $('#reveal-hint');
  var progress = -1;
  var unlocked = false;
  var viewer = null;
  var orbited = false;
  var isStatic = false;
  var viewerRequested = false;

  function hasWebGL2() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2');
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) {
      return false;
    }
  }

  function goStatic() {
    if (isStatic) return;
    // if the visitor is already past the section, keep what they see in place while it collapses
    var r = reveal.getBoundingClientRect();
    var above = r.bottom <= 0;
    var h0 = reveal.offsetHeight;
    isStatic = true;
    reveal.classList.add('is-static');
    stage.classList.remove('is-unlocked');
    stage.style.setProperty('--p', '0');
    if (above) window.scrollBy(0, reveal.offsetHeight - h0);
    if (viewer) {
      try { viewer.dispose(); } catch (e) { /* ignore */ }
      viewer = null;
    }
  }

  function updateReveal() {
    if (isStatic) return;
    var r = reveal.getBoundingClientRect();
    var extra = reveal.offsetHeight - stage.offsetHeight;
    var p = extra > 0 ? clamp(-r.top / (extra * 0.64), 0, 1) : 0;
    if (Math.abs(p - progress) > 0.0004 || (p === 1) !== (progress === 1) || (p === 0) !== (progress === 0)) {
      progress = p;
      stage.style.setProperty('--p', p.toFixed(4));
    }
    setUnlocked(p >= 1);
  }

  function setUnlocked(on) {
    if (on === unlocked) return;
    unlocked = on;
    stage.classList.toggle('is-unlocked', on);
    applyViewerLock();
  }

  function applyViewerLock() {
    if (!viewer) return;
    viewer.setInteractive(unlocked);
    if (unlocked) {
      var o = D.viewer.orbit;
      var factor = stage.clientHeight < o.shortStageMax ? o.distanceShortStage : o.distance;
      if (!orbited) {
        orbited = true;
        viewer.orbitBy(o.degrees, o.durationMs, factor); // shows it is 3D; the step back clears room for the controls
      } else {
        viewer.orbitBy(0, 900, factor); // after a reset: step back again so the controls stay clear
      }
    } else {
      viewer.reset();
    }
  }

  function loadViewer() {
    if (viewerRequested || isStatic) return;
    viewerRequested = true;
    if (!hasWebGL2()) {
      goStatic(); // tested here rather than at start-up, so no GL context is created during the first load
      return;
    }
    var script = document.createElement('script');
    script.src = D.viewer.script;
    script.async = true;
    script.onload = function () { setTimeout(mountViewer, 0); };
    script.onerror = goStatic;
    document.head.appendChild(script);
  }

  function mountViewer() {
    if (isStatic) return;
    try {
      viewer = window.BuildingViewer.mountViewer(viewerBox, {
        view: D.viewer.view,
        fitMargin: D.viewer.fitMargin,
        viewShift: D.viewer.viewShift,
        interactive: false,
        wheelZoom: false,
        touchAction: 'pan-y',
        label: T.viewerLabel,
      });
    } catch (err) {
      console.warn('3D viewer unavailable, showing the photograph instead.', err && err.message);
      goStatic();
      return;
    }
    viewer.canvas.addEventListener('pointerdown', function () { hint.classList.add('is-dismissed'); }, { passive: true });
    stage.classList.add('has-viewer');
    if (unlocked) applyViewerLock();
  }

  // ------------------------------------------------------------------ one passive, rAF-throttled scroll listener
  var ticking = false;
  function onScroll(e) {
    if (isHome && e && e.type === 'scroll' && !viewerRequested) loadViewer(); // first scroll loads the 3D bundle
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (isHome) updateReveal();
      updateHeader();
    });
  }

  // ------------------------------------------------------------------ residence picker
  var pickerSvg = $('#picker-svg');
  var pickerStage = $('#picker-stage');
  var pickerMedia = $('#picker-media');
  var card = $('#picker-card');
  var leaderLine = $('#leader-line');
  var leaderDot = $('#leader-dot');
  var spots = {};
  var markers = [];
  var selected = null;
  var pickerReady = false; // set after the first layout; until then nothing reads geometry

  function hull(points) {
    // monotone-chain convex hull
    var pts = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var cross = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lower = [], upper = [];
    pts.forEach(function (p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    });
    pts.slice().reverse().forEach(function (p) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    });
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }
  var pointsAttr = function (pts) { return pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '); };

  function buildPicker() {
    pickerSvg.setAttribute('preserveAspectRatio', wideMQ.matches ? 'xMaxYMid slice' : 'xMidYMid slice');
    // lower floors first, so each upper loggia paints over the hit area grown up from the one below
    D.residences.slice().sort(function (a, b) { return a.floor - b.floor || (a.id < b.id ? -1 : 1); }).forEach(function (r) {
      var grown = r.shape.concat(r.shape.map(function (p) { return [p[0], p[1] - 50]; }));
      var c = centroid(r.shape);
      var ring = s('circle', { class: 'spot__ring', cx: c[0], cy: c[1], r: 5 });
      var dot = s('circle', { class: 'spot__dot', cx: c[0], cy: c[1], r: 4 });
      markers.push({ ring: ring, dot: dot });
      var a = s('a', {
        class: 'spot',
        href: residenceHref(r),
        'data-id': r.id,
        'aria-label': fill(T.spotLabel, { id: r.id, floor: floorLabel(r), status: T.status[r.status] }),
      },
        s('polygon', { class: 'spot__hit', points: pointsAttr(hull(grown)) }),
        s('polygon', { class: 'spot__shape', points: pointsAttr(r.shape) }),
        s('g', { class: 'spot__marker' }, ring, dot));
      spots[r.id] = a;
      pickerSvg.appendChild(a);
    });

    var down = { id: null, type: '', wasSelected: false };
    pickerSvg.addEventListener('pointerover', function (e) {
      var a = e.target.closest && e.target.closest('.spot');
      if (a && e.pointerType === 'mouse') select(a.getAttribute('data-id'));
    });
    pickerSvg.addEventListener('focusin', function (e) {
      var a = e.target.closest && e.target.closest('.spot');
      if (a) select(a.getAttribute('data-id'));
    });
    pickerSvg.addEventListener('pointerdown', function (e) {
      var a = e.target.closest && e.target.closest('.spot');
      if (!a) return;
      // recorded now: focus fires before click and would otherwise make the first tap navigate
      down = { id: a.getAttribute('data-id'), type: e.pointerType, wasSelected: selected === a.getAttribute('data-id') };
      e.preventDefault(); // no focus scroll on tap; vertical swipes still scroll (touch-action untouched)
    });
    pickerSvg.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.spot');
      if (!a) return;
      var id = a.getAttribute('data-id');
      var touch = down.type === 'touch' || down.type === 'pen';
      if (touch && !(down.id === id && down.wasSelected)) {
        e.preventDefault(); // first tap selects, the second tap on the same loggia follows the link
        select(id);
      }
      down = { id: null, type: '', wasSelected: false };
    });

    wideMQ.addEventListener('change', function () {
      pickerSvg.setAttribute('preserveAspectRatio', wideMQ.matches ? 'xMaxYMid slice' : 'xMidYMid slice');
      layoutPicker(false);
    });
    new ResizeObserver(function () {
      pickerReady = true;
      layoutPicker(false);
    }).observe(pickerMedia);
    card.addEventListener('click', function (e) {
      var ask = e.target.closest('[data-ask]');
      if (ask) {
        var sel = $('#f-residence');
        sel.value = ask.getAttribute('data-ask');
      }
    });
    select(D.defaultResidence);
  }

  function select(id) {
    if (!byId[id] || id === selected) return;
    selected = id;
    Object.keys(spots).forEach(function (k) { spots[k].classList.toggle('is-selected', k === id); });
    renderCard(byId[id]);
    drawLeader(true);
  }

  function renderCard(r) {
    var p = planOf(r);
    var facts = [
      ['i-plan', T.facts.interior, area(p.interior)],
      ['i-loggia', T.facts.balcony, area(p.balcony)],
      ['i-bed', T.facts.bedrooms, String(p.bedrooms)],
      ['i-bath', T.facts.bathrooms, String(p.bathrooms)],
      ['i-compass', T.facts.orientation, T.orientations[r.orientation] || r.orientation],
      ['i-view', T.facts.view, T.views[r.view] || r.view],
    ];
    card.textContent = '';
    append(card, [
      h('div', { class: 'glass-card__top' }, pill(r.status), h('span', { class: 'glass-card__floor' }, floorLabel(r))),
      h('h3', { class: 'glass-card__name' }, nameLabel(r)),
      h('p', { class: 'glass-card__type' }, p.name),
      h('dl', { class: 'facts' }, facts.map(function (f) {
        return h('div', { class: 'facts__item' }, icon(f[0]), h('dt', null, f[1]), h('dd', null, f[2]));
      })),
      h('p', { class: 'glass-card__price' }, priceLabel(r)),
      h('a', { class: 'btn btn--gold btn--block', href: residenceHref(r) }, T.viewResidence, icon('i-arrow')),
      r.status === 'sold' ? null : h('a', { class: 'glass-card__ask', href: '#contact', 'data-ask': r.id }, T.askAbout),
    ]);
  }

  function layoutPicker(animate) {
    if (!pickerReady) return;
    var ctm = pickerSvg.getScreenCTM();
    if (ctm && ctm.a) {
      // keep strokes and markers constant in screen pixels whatever the photo's scale
      var k = 1 / ctm.a;
      pickerSvg.style.setProperty('--k', k.toFixed(4));
      markers.forEach(function (m) {
        m.dot.setAttribute('r', (3.5 * k).toFixed(2));
        m.ring.setAttribute('r', (5 * k).toFixed(2));
      });
    }
    drawLeader(animate);
  }

  function drawLeader(animate) {
    if (!pickerReady) return;
    if (!wideMQ.matches || !selected) {
      leaderLine.setAttribute('points', '');
      leaderDot.setAttribute('cx', '-10');
      leaderDot.setAttribute('cy', '-10');
      return;
    }
    var ctm = pickerSvg.getScreenCTM();
    if (!ctm) return;
    var sr = pickerStage.getBoundingClientRect();
    var cr = card.getBoundingClientRect();
    var pts = byId[selected].shape;
    var maxX = Math.max.apply(null, pts.map(function (p) { return p[0]; }));
    var right = pts.filter(function (p) { return p[0] >= maxX - 1; });
    var ry = right.reduce(function (a, p) { return a + p[1]; }, 0) / right.length;
    var px = ctm.a * maxX + ctm.e - sr.left;
    var py = ctm.d * ry + ctm.f - sr.top;
    var cardL = cr.left - sr.left;
    var ty = clamp(py, cr.top - sr.top + 28, cr.bottom - sr.top - 28);
    var line;
    if (Math.abs(ty - py) < 1) {
      line = [[px, py], [cardL, py]];
    } else {
      var knee = cardL - Math.max(24, Math.min(72, (cardL - px) * 0.35));
      line = [[px, py], [knee, py], [cardL, ty]];
    }
    leaderLine.setAttribute('points', line.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '));
    leaderDot.setAttribute('cx', px.toFixed(1));
    leaderDot.setAttribute('cy', py.toFixed(1));
    leaderLine.classList.remove('is-drawing');
    if (animate && !reduceMotion.matches && leaderLine.getTotalLength) {
      var len = leaderLine.getTotalLength();
      leaderLine.style.strokeDasharray = len + ' ' + len;
      leaderLine.style.strokeDashoffset = String(len);
      leaderLine.getBoundingClientRect(); // commit the start state
      leaderLine.classList.add('is-drawing');
      leaderLine.style.strokeDashoffset = '0';
    } else {
      leaderLine.style.strokeDasharray = '';
      leaderLine.style.strokeDashoffset = '';
    }
  }

  // ------------------------------------------------------------------ six residence cards
  var BG_SCALE = 3.4; // background width as a multiple of the card width: the loggia fills the frame

  function renderCards() {
    var list = $('#cards');
    D.featured.forEach(function (id) {
      var r = byId[id];
      if (!r) return;
      var p = planOf(r);
      var c = centroid(r.shape);
      var ratio = PHOTO_H / PHOTO_W;
      var x = clamp(((0.5 - (c[0] / PHOTO_W) * BG_SCALE) / (1 - BG_SCALE)) * 100, 0, 100);
      var y = clamp(((0.375 - (c[1] / PHOTO_H) * BG_SCALE * ratio) / (0.75 - BG_SCALE * ratio)) * 100, 0, 100);
      list.appendChild(h('li', null,
        h('a', { class: 'rcard', href: residenceHref(r) },
          h('div', { class: 'rcard__media' },
            h('div', { class: 'rcard__img', style: 'background-position:' + x.toFixed(2) + '% ' + y.toFixed(2) + '%' }),
            pill(r.status)),
          h('div', { class: 'rcard__body' },
            h('p', { class: 'rcard__floor' }, floorLabel(r)),
            h('h3', { class: 'rcard__name' }, nameLabel(r)),
            h('p', { class: 'rcard__type' }, p.name),
            h('ul', { class: 'rcard__facts' },
              h('li', null, fill(T.cardFacts.interior, { n: areaNum.format(p.interior) })),
              h('li', null, fill(T.cardFacts.balcony, { n: areaNum.format(p.balcony) })),
              h('li', null, p.bedroomsText)),
            h('p', { class: 'rcard__price' }, priceLabel(r)),
            h('span', { class: 'rcard__link' }, T.viewResidence, icon('i-arrow'))))));
    });
  }

  // the cards crop the building image the page already loaded (same file, no extra download)
  function useBuildingImage() {
    var src = curtain.currentSrc || curtain.src;
    $('#cards').style.setProperty('--building-img', 'url("' + src.replace(/"/g, '%22') + '")');
  }

  // ------------------------------------------------------------------ enquiry form
  var form = $('#enquiry');
  var formDone = $('#form-done');
  var formStatus = $('#form-status');
  var submitBtn = $('#form-submit');
  var submitted = false;
  var F = {};

  var EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  var PHONE_RE = /^\+?[\d\s]{6,20}$/;
  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : T.form.errors.name; },
    email: function (v) {
      if (!v.trim()) return T.form.errors.emailMissing;
      return EMAIL_RE.test(v.trim()) ? '' : T.form.errors.emailInvalid;
    },
    phone: function (v) {
      if (!v.trim()) return '';
      return PHONE_RE.test(v.trim()) && v.replace(/\D/g, '').length >= 6 ? '' : T.form.errors.phone;
    },
    consent: function (v, input) { return input.checked ? '' : T.form.errors.consent; },
  };

  function setError(input, msg) {
    var err = document.getElementById(input.id + '-error');
    if (msg) {
      err.textContent = msg;
      err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', err.id);
    } else {
      err.textContent = '';
      err.hidden = true;
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }

  function validate(name) {
    var input = F[name];
    var msg = rules[name](input.value, input);
    setError(input, msg);
    return !msg;
  }

  function buildForm() {
    form.noValidate = true;
    ['name', 'email', 'phone', 'residence', 'message', 'consent'].forEach(function (n) { F[n] = form.elements[n]; });
    var sel = F.residence;
    sel.appendChild(h('option', { value: '' }, T.form.noPreference));
    D.residences
      .filter(function (r) { return r.status !== 'sold'; })
      .sort(function (a, b) { return b.floor - a.floor || (a.id < b.id ? -1 : 1); })
      .forEach(function (r) {
        sel.appendChild(h('option', { value: r.id }, fill(T.form.optionLabel, { id: r.id, type: planOf(r).name })));
      });
    submitBtn.textContent = T.form.submit;

    Object.keys(rules).forEach(function (n) {
      var input = F[n];
      var touched = false;
      input.addEventListener(n === 'consent' ? 'change' : 'input', function () {
        touched = true;
        if (submitted || input.getAttribute('aria-invalid')) validate(n);
      });
      input.addEventListener('blur', function () {
        if (touched || submitted) validate(n);
      });
    });

    form.addEventListener('submit', onSubmit);
    $('#form-again').addEventListener('click', function () {
      form.reset();
      submitted = false;
      Object.keys(rules).forEach(function (n) { setError(F[n], ''); });
      formStatus.hidden = true;
      formDone.hidden = true;
      form.hidden = false;
      F.name.focus();
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    submitted = true;
    formStatus.hidden = true;
    var invalid = Object.keys(rules).filter(function (n) { return !validate(n); });
    if (invalid.length) {
      F[invalid[0]].focus();
      return;
    }
    var values = {
      name: F.name.value.trim(),
      email: F.email.value.trim(),
      phone: F.phone.value.trim(),
      residence: F.residence.value,
      message: F.message.value.trim(),
      consent: true,
    };
    submitBtn.disabled = true;
    submitBtn.textContent = T.form.sending;
    var send = D.formEndpoint
      ? fetch(D.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(values),
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
      })
      : Promise.resolve().then(function () { console.warn(T.form.endpointMissing); });
    send.then(function () {
      form.hidden = true;
      $('#form-done-title').textContent = fill(T.form.doneTitle, { first: values.name.split(/\s+/)[0] });
      $('#form-done-text').textContent = fill(T.form.doneBody, { email: values.email });
      formDone.hidden = false;
      formDone.focus();
    }, function () {
      formStatus.textContent = fill(T.form.failure, { phone: D.contact.phone });
      formStatus.hidden = false;
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = T.form.submit;
    });
  }

  // ------------------------------------------------------------------ residence page
  var RT = T.residence;

  function initResidence() {
    var id = new URLSearchParams(location.search).get('id');
    var r = byId[id] || byId[D.defaultResidence];
    var plan = planOf(r);
    document.title = fill(RT.pageTitle, { id: r.id, brand: D.brand.name });

    $('#crumb-current').textContent = nameLabel(r);
    $('#unit-status').appendChild(pill(r.status));
    $('#unit-floor').textContent = floorLabel(r);
    $('#unit-title').textContent = nameLabel(r);
    $('#unit-type').textContent = plan.name;
    $('#unit-summary').textContent = plan.summary;
    var facts = [
      ['i-plan', T.facts.interior, area(plan.interior)],
      ['i-loggia', T.facts.balcony, area(plan.balcony)],
      ['i-bed', T.facts.bedrooms, String(plan.bedrooms)],
      ['i-bath', T.facts.bathrooms, String(plan.bathrooms)],
      ['i-compass', T.facts.orientation, T.orientations[r.orientation] || r.orientation],
      ['i-view', T.facts.view, T.views[r.view] || r.view],
    ];
    append($('#unit-facts'), facts.map(function (f) {
      return h('div', { class: 'facts__item' }, icon(f[0]), h('dt', null, f[1]), h('dd', null, f[2]));
    }));
    $('#unit-price').textContent = priceLabel(r);
    var call = $('#unit-call');
    call.href = D.contact.phoneHref;
    call.textContent = fill(RT.call, { phone: D.contact.phone });

    // previous / next residence, top floor first
    var order = D.residences.slice().sort(function (a, b) { return b.floor - a.floor || (a.id < b.id ? -1 : 1); });
    var i = order.indexOf(r);
    var prev = order[(i - 1 + order.length) % order.length];
    var next = order[(i + 1) % order.length];
    var setPager = function (a, target, text, label) {
      a.href = residenceHref(target);
      a.querySelector('span').textContent = fill(text, { id: target.id });
      a.setAttribute('aria-label', fill(label, { id: target.id }));
    };
    setPager($('#unit-prev'), prev, RT.prev, RT.prevLabel);
    setPager($('#unit-next'), next, RT.next, RT.nextLabel);

    // rooms and areas
    var body = $('#rooms-body');
    plan.rooms.forEach(function (room) {
      body.appendChild(h('tr', room.outdoor ? { class: 'is-outdoor' } : null, h('th', { scope: 'row' }, room.name), h('td', null, area(room.area))));
    });
    $('#rooms-foot').appendChild(h('tr', null, h('th', { scope: 'row' }, RT.totalInterior), h('td', null, area(plan.interior))));
    var img = $('#rooms-plan-img');
    img.width = plan.image.width;
    img.height = plan.image.height;
    img.alt = plan.image.alt;
    img.src = plan.image.src;

    // the enquiry form asks about this residence (sold ones are not in the list)
    if (r.status !== 'sold') F.residence.value = r.id;

    initTour(r, plan);
    initPlanViewer(r, plan);
  }

  /*
   * 3D apartment tour: a modal with the walk-through video, driven by the visitor instead of played.
   * Scrolling up walks forward and scrolling down walks back (on touch: dragging down = forward, the
   * same gesture as scrolling up). The requested position is eased toward on every frame and written
   * to video.currentTime, so the speed follows the visitor. The video has a keyframe every 4 frames,
   * which keeps seeking smooth in both directions.
   */
  function initTour(r, plan) {
    var btn = $('#tour-open');
    var dlg = $('#tour');
    var tour = plan.tour;
    if (!tour || !btn || !dlg || typeof dlg.showModal !== 'function') return;
    var TT = RT.tour;
    var video = $('#tour-video');
    var stage = $('#tour-stage');
    var range = $('#tour-progress');
    var loadingText = $('#tour-loading-text');
    var closeBtn = $('#tour-close');

    $('#tour-unit').textContent = fill(TT.eyebrow, { id: r.id });
    $('#unit-stage').classList.add('has-tour');
    btn.hidden = false;

    var duration = 0; // seconds, known after loadedmetadata
    var target = 0; // where the visitor wants to be
    var shown = 0; // eased position written to the video
    var raf = 0;
    var loaded = false;

    var setLoading = function () {
      if (!duration || !video.buffered.length) return;
      var end = video.buffered.end(video.buffered.length - 1);
      loadingText.textContent = fill(TT.loading, { n: Math.round(clamp(end / duration, 0, 1) * 100) });
    };
    var markReady = function () { dlg.classList.add('is-ready'); };

    var load = function () {
      if (loaded) return;
      loaded = true;
      loadingText.textContent = fill(TT.loading, { n: 0 });
      video.poster = tour.poster;
      video.preload = 'auto';
      video.src = tour.src;
      // iOS buffers a video only after play() has been called: start and stop it straight away
      // (muted, inside the click, so it is allowed); the visitor's input decides the position after that
      var p = video.play();
      if (p && p.then) {
        p.then(function () {
          video.pause();
          video.currentTime = shown;
        }, function () {});
      }
    };

    video.addEventListener('loadedmetadata', function () {
      duration = video.duration || 0;
      setLoading();
    });
    video.addEventListener('progress', setLoading);
    video.addEventListener('loadeddata', markReady);
    video.addEventListener('canplay', markReady);
    video.addEventListener('error', function () {
      loadingText.textContent = TT.failed;
      loaded = false; // the next opening tries again
    });

    var tick = function () {
      raf = 0;
      if (!duration) return;
      var diff = target - shown;
      shown = Math.abs(diff) < 0.004 || reduceMotion.matches ? target : shown + diff * 0.18;
      // write the position only when the previous seek has finished, so the decoder never falls behind
      if (!video.seeking && Math.abs(video.currentTime - shown) > 0.015) video.currentTime = shown;
      range.value = String(Math.round((shown / duration) * 1000));
      if (shown !== target || video.seeking || Math.abs(video.currentTime - shown) > 0.015) {
        raf = requestAnimationFrame(tick);
      }
    };
    var go = function (seconds) {
      if (!duration) return;
      target = clamp(seconds, 0, duration);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    video.addEventListener('seeked', function () { if (!raf) raf = requestAnimationFrame(tick); });

    // wheel and trackpad anywhere in the dialog: up = forward, down = back; the page never scrolls
    dlg.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (!duration) return;
      var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      go(target - (dy / tour.wheelDistance) * duration);
    }, { passive: false });

    // finger or mouse drag on the video: down = forward (like scrolling up), up = back
    var drag = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      drag = { id: e.pointerId, y: e.clientY };
      try {
        stage.setPointerCapture(e.pointerId); // keep the drag when the finger leaves the video
      } catch (err) { /* pointer already gone: the drag still works inside the stage */ }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id || !duration) return;
      var dy = e.clientY - drag.y;
      drag.y = e.clientY;
      go(target + (dy / (stage.clientHeight * tour.dragScreens)) * duration);
    });
    var endDrag = function (e) {
      if (drag && e.pointerId === drag.id) drag = null;
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // the slider (keyboard accessible): jumps follow the same easing
    range.addEventListener('input', function () { go((Number(range.value) / 1000) * duration); });

    // keyboard outside the slider: arrows and Page keys step, Home and End jump
    dlg.addEventListener('keydown', function (e) {
      if (e.target === range || !duration) return;
      var step = duration / 20;
      var keys = {
        ArrowUp: target + step, ArrowRight: target + step, PageUp: target + step * 3,
        ArrowDown: target - step, ArrowLeft: target - step, PageDown: target - step * 3,
        Home: 0, End: duration,
      };
      if (!(e.key in keys)) return;
      e.preventDefault();
      go(keys[e.key]);
    });

    btn.addEventListener('click', function () {
      load();
      html.classList.add('tour-open');
      dlg.showModal();
      closeBtn.focus();
    });
    closeBtn.addEventListener('click', function () { dlg.close(); });
    // Escape closes natively (cancel → close); the dialog returns focus to the button
    dlg.addEventListener('close', function () {
      html.classList.remove('tour-open');
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      drag = null;
      video.pause();
      btn.focus();
    });
  }

  function initPlanViewer(r, plan) {
    var stageEl = $('#unit-stage');
    var box = $('#plan-viewer');
    var toast = $('#wheel-toast');
    var toastTimer = 0;

    var showFallback = function () {
      stageEl.classList.add('is-static');
      var fig = $('#plan-fallback');
      var im = $('#plan-fallback-img');
      im.alt = plan.image.alt;
      im.src = plan.image.src;
      fig.hidden = false;
    };
    if (!hasWebGL2()) {
      showFallback();
      return;
    }

    var mount = function () {
      var labels = {};
      plan.rooms.forEach(function (room) { labels[room.id] = { name: room.name, detail: area(room.area) }; });
      var v;
      var fail = function (err) {
        console.warn('3D plan unavailable, showing the drawn plan instead.', err && err.message);
        showFallback();
      };
      try {
        v = window.BuildingViewer.mountApartment(box, {
          async: true, // built in steps, shaders compiled off the main thread: the page stays responsive
          interactive: true,
          wheelZoom: false, // a plain wheel scrolls the page; Ctrl/⌘ + wheel and pinch zoom
          touchAction: 'pan-y', // vertical swipes scroll the page, sideways drags rotate
          label: fill(RT.viewerLabel, { id: r.id }),
          labels: labels,
        });
      } catch (err) {
        fail(err);
        return;
      }
      v.ready.then(function () { stageEl.classList.add('has-viewer'); }, fail);
      var actions = {
        left: function () { v.moveBy({ azimuth: -30 }); },
        right: function () { v.moveBy({ azimuth: 30 }); },
        up: function () { v.moveBy({ elevation: 12 }); },
        down: function () { v.moveBy({ elevation: -12 }); },
        in: function () { v.zoom(0.8); },
        out: function () { v.zoom(1.25); },
        top: function () { v.viewTo({ azimuth: 0, elevation: 89, distance: 1 }); },
        reset: function () { v.reset(); },
      };
      $$('[data-plan]').forEach(function (btn) {
        btn.addEventListener('click', function () { actions[btn.getAttribute('data-plan')](); });
      });
      // a plain wheel over the plan scrolls the page: say how to zoom instead. Capture phase on the
      // stage, because the viewer stops a plain wheel at the canvas before bubbling listeners run.
      stageEl.addEventListener('wheel', function (e) {
        if (e.target !== v.canvas || e.ctrlKey || e.metaKey) return;
        toast.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.hidden = true; }, 1800);
      }, { passive: true, capture: true });
    };

    var script = document.createElement('script');
    script.src = D.viewer.script;
    script.async = true;
    // mount once the page has loaded and painted, so creating the WebGL context does not queue
    // behind the first paint on the GPU
    script.onload = function () {
      var go = function () {
        if (window.requestIdleCallback) window.requestIdleCallback(mount, { timeout: 800 });
        else setTimeout(mount, 0);
      };
      if (document.readyState === 'complete') go();
      else window.addEventListener('load', go, { once: true });
    };
    script.onerror = showFallback;
    document.head.appendChild(script);
  }

  // ------------------------------------------------------------------ start
  applyStaticText();
  initLangSwitch();
  renderBrand();
  renderContact();
  buildForm();
  initHeader();

  if (isHome) {
    renderCards();
    buildPicker();
    if (curtain.complete && curtain.naturalWidth) {
      loader.set('image', 1);
      useBuildingImage();
    } else {
      curtain.addEventListener('load', function () { loader.set('image', 1); useBuildingImage(); }, { once: true });
      curtain.addEventListener('error', function () { loader.set('image', 1); }, { once: true });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { loader.set('fonts', 1); });
    else loader.set('fonts', 1);
    startVideo();
    // after a language switch the page reloads in place: no second splash
    if (html.classList.contains('no-splash')) exitSplash();
    else requestAnimationFrame(splashTick);
    // picker geometry (scale, leader line) is first read in the ResizeObserver callback, after the
    // browser's own first layout, so start-up never forces a layout
  } else if (page === 'residence') {
    initResidence();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
})();
