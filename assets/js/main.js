/* Joe Etzkorn — portfolio interactions. No dependencies. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: scrolled state + mobile menu ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });

  /* ---------- Scroll spy ---------- */
  const navLinks = $$('.site-nav a');
  const spyTargets = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spyTargets.forEach((s) => spy.observe(s));
    const hero = $('.hero');
    if (hero) spy.observe(hero); // no id, so reaching the hero clears the highlight
  }

  /* ---------- Reveal on scroll + stat count-up ---------- */
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = target.toFixed(decimals); return; }
    const start = performance.now();
    const dur = 1200;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const revealEls = $$('.reveal');
  const stats = $('.stats');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (entry.target === stats) $$('.num', stats).forEach(countUp);
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
    if (stats) io.observe(stats);
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Hero crosshair readout ---------- */
  const heroMedia = $('.hero-media');
  const coords = $('.coords');
  if (heroMedia && window.matchMedia('(hover: hover)').matches) {
    heroMedia.addEventListener('pointermove', (e) => {
      const r = heroMedia.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      heroMedia.style.setProperty('--cx', x + 'px');
      heroMedia.style.setProperty('--cy', y + 'px');
      if (coords) {
        const pad = (n) => String(Math.round(n)).padStart(4, '0');
        coords.textContent = `X ${pad((x / r.width) * 1000)} · Y ${pad((y / r.height) * 1000)}`;
      }
    });
  }

  /* ---------- Gallery filters ---------- */
  const grid = $('#work-grid');
  const items = grid ? $$('.work-item', grid) : [];
  const filters = $$('.filter');
  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      filters.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      items.forEach((li) => { li.hidden = cat !== 'all' && li.dataset.cat !== cat; });
    });
  });

  /* ---------- Lightbox ---------- */
  const dialog = $('#lightbox');
  if (!dialog || typeof dialog.showModal !== 'function' || !items.length) return;

  const all = items.map((li, i) => {
    const a = $('.work-card', li);
    return {
      li,
      id: a.dataset.id,
      full: a.getAttribute('href'),
      w: a.dataset.w,
      h: a.dataset.h,
      title: $('.work-title', a).textContent,
      caption: a.dataset.caption,
      tags: a.dataset.tags ? a.dataset.tags.split('|') : [],
      cat: a.dataset.catLabel,
      kind: $('.work-media', a).dataset.kind,
      fig: i + 1,
    };
  });
  const byId = new Map(all.map((it) => [it.id, it]));

  const stage = $('.lb-stage', dialog);
  const img = $('.lb-img', dialog);
  const elFig = $('.lb-fig', dialog);
  const elCount = $('.lb-count', dialog);
  const elTitle = $('.lb-title', dialog);
  const elCaption = $('.lb-caption', dialog);
  const elTags = $('.lb-tags', dialog);
  let list = all;
  let index = 0;
  let lastFocus = null;

  const preload = (it) => { if (it) { const p = new Image(); p.src = it.full; } };

  const show = (i) => {
    index = (i + list.length) % list.length;
    const it = list[index];
    img.src = it.full;
    img.alt = it.title;
    if (it.w && it.h) { img.width = +it.w; img.height = +it.h; }
    stage.classList.toggle('is-render', it.kind === 'render');
    elFig.textContent = `FIG. ${String(it.fig).padStart(2, '0')} · ${it.cat}`;
    elCount.textContent = `${index + 1} / ${list.length}`;
    elTitle.textContent = it.title;
    elCaption.textContent = it.caption;
    elTags.replaceChildren(...it.tags.map((t) => Object.assign(document.createElement('span'), { textContent: t })));
    preload(list[(index + 1) % list.length]);
    preload(list[(index - 1 + list.length) % list.length]);
  };

  const open = (id) => {
    const visible = all.filter((it) => !it.li.hidden);
    list = visible.some((it) => it.id === id) ? visible : all;
    lastFocus = document.activeElement;
    show(list.findIndex((it) => it.id === id));
    dialog.showModal();
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.work-card, [data-open]');
    if (!trigger || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const id = trigger.dataset.id || trigger.dataset.open;
    if (!byId.has(id)) return;
    e.preventDefault();
    open(id);
  });

  $('.lb-prev', dialog).addEventListener('click', () => show(index - 1));
  $('.lb-next', dialog).addEventListener('click', () => show(index + 1));
  $('.lb-close', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
  });
  dialog.addEventListener('close', () => { if (lastFocus) lastFocus.focus({ preventScroll: true }); });

  let touchX = null;
  stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 45) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
