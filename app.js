// Dra. Magda Pizzolo — prévia conceitual (Bruno Luque).
// Motion (vanilla) para coreografia e cenas ligadas à rolagem; Lenis só na roda do mouse (desktop).
// O conteúdo funciona sem este arquivo: os estados escondidos só existem depois que o Motion confirma.

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const wideMQ = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
let reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

/* ---------- tokens de motion ---------- */
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const DUR = { press: 0.14, control: 0.2, panel: 0.32 };
const SPRING = {
  card: { type: 'spring', stiffness: 190, damping: 21, mass: 0.9 },   // cartão que sai / sobe no leque
  back: { type: 'spring', stiffness: 320, damping: 26 },              // cartão arrastado que volta
  magnet: { stiffness: 170, damping: 20 },                            // botão magnético
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const N = 6;

const M = window.Motion || null;
if (!M) console.warn('Motion indisponível; página segue estática.');
const animate = M ? (...a) => M.animate(...a) : () => ({ stop() {}, cancel() {} });
const prog = (p) => (typeof p === 'number' ? p : p?.y?.progress ?? 0);

/* ------------------------------------------------------------------ */
/* Topo translúcido depois do início                                   */
/* ------------------------------------------------------------------ */
const top = $('[data-top]');
const onScrollTop = () => top.classList.toggle('is-solid', scrollY > 24);
addEventListener('scroll', onScrollTop, { passive: true }); onScrollTop();

/* ------------------------------------------------------------------ */
/* Rolagem contínua (Lenis): só roda do mouse; toque nativo             */
/* ------------------------------------------------------------------ */
let lenis = null;
function startLenis() {
  if (reduce || !fineMQ.matches || !window.Lenis || lenis) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else addEventListener('load', startLenis, { once: true });
reduceMQ.addEventListener('change', () => {
  reduce = reduceMQ.matches;
  root.classList.toggle('reduce', reduce);
  if (reduce && lenis) { lenis.destroy(); lenis = null; }
  mountDeck();
});
const goTo = (y, duration = 1.2) => {
  if (lenis) lenis.scrollTo(y, { duration, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
};

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = id === '#inicio' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  if (id === '#inicio') { goTo(0, 1.2); return; }
  goTo(target.getBoundingClientRect().top + scrollY - (top.offsetHeight + 4), 1.3);
  target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
});

/* ------------------------------------------------------------------ */
/* Mola com velocidade preservada (interrompível) — botão magnético    */
/* ------------------------------------------------------------------ */
function springVec(apply, { stiffness = 170, damping = 20 } = {}) {
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0 };
  const tick = (t) => {
    const dt = Math.min(0.032, (t - (s.last || t)) / 1000 || 0.016); s.last = t;
    for (const k of ['x', 'y']) {
      const v = 'v' + k, tk = 't' + k;
      s[v] += (-stiffness * (s[k] - s[tk]) - damping * s[v]) * dt; s[k] += s[v] * dt;
    }
    apply(s.x, s.y);
    if (Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) + Math.abs(s.vx) + Math.abs(s.vy) > 0.01) s.raf = requestAnimationFrame(tick);
    else { s.raf = 0; s.last = 0; }
  };
  const set = (x, y) => { s.tx = x; s.ty = y; if (!s.raf) s.raf = requestAnimationFrame(tick); };
  set.stop = () => { cancelAnimationFrame(s.raf); s.raf = 0; };
  return set;
}

/* Interface: botão magnético (só ponteiro fino; o clique nunca depende dele) */
if (fineMQ.matches && !reduce) {
  $$('[data-magnetic]').forEach((btn) => {
    const pull = springVec((x, y) => { btn.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`; }, SPRING.magnet);
    const R = 70, K = 0.28;
    const move = (e) => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const near = Math.abs(dx) < r.width / 2 + R && Math.abs(dy) < r.height / 2 + R;
      pull(near ? clamp(dx * K, -14, 14) : 0, near ? clamp(dy * K, -9, 9) : 0);
    };
    addEventListener('pointermove', move, { passive: true });
    btn.addEventListener('pointerleave', () => pull(0, 0));
    btn.addEventListener('blur', () => pull(0, 0));
  });
}

/* Interface: copiar mensagem */
const copyBtn = $('[data-copy]');
if (copyBtn) {
  const live = $('[data-copy-live]');
  const label = copyBtn.textContent;
  copyBtn.addEventListener('click', async () => {
    const text = $('[data-msg]').textContent.trim();
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch {} ta.remove();
    }
    copyBtn.textContent = ok ? 'Copiado' : 'Copie manualmente';
    if (live) live.textContent = ok ? 'Mensagem copiada.' : 'Não foi possível copiar. Selecione o texto acima.';
    if (ok && !reduce) animate(copyBtn, { scale: [0.94, 1] }, { duration: DUR.control, ease: EASE_OUT });
    clearTimeout(copyBtn._t); copyBtn._t = setTimeout(() => { copyBtn.textContent = label; }, 2200);
  });
}

/* Interface: botão fixo do celular some onde já há CTA à vista */
const dock = $('[data-dock]');
if (dock && 'IntersectionObserver' in window) {
  const hide = new Set();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { e.isIntersecting ? hide.add(e.target) : hide.delete(e.target); });
    dock.classList.toggle('is-on', hide.size === 0);
  }, { threshold: 0.12 });
  ['#inicio', '#perguntas', '#contato', '.foot'].forEach((s) => { const n = $(s); n && io.observe(n); });
  dock.classList.remove('is-on'); // começa escondido: o hero já tem o CTA
}

/* ------------------------------------------------------------------ */
/* ASSINATURA — o baralho de seis perguntas                             */
/* Fonte única de verdade: o índice ativo. Pin: vem do scroll. Carrossel: do scrollLeft. */
/* ------------------------------------------------------------------ */
const deck = $('[data-deck]');
const cards = $$('[data-card]', deck);
const segs = $$('[data-seg]', deck);
const countEl = $('[data-count]', deck);
const liveEl = $('[data-live]', deck);
const btnPrev = $('[data-prev]', deck);
const btnNext = $('[data-next]', deck);
const stage = $('[data-stage]', deck);
const list = $('[data-cards]', deck);
let teardown = null;

function setSegs(t) { segs.forEach((s, k) => { $('i', s).style.transform = `scaleX(${clamp(t - k + 1).toFixed(3)})`; }); }
function announce(i) {
  countEl.textContent = String(i + 1).padStart(2, '0');
  liveEl.textContent = `Pergunta ${i + 1} de ${N}: ${$('.qcard__q', cards[i]).textContent}`;
  btnPrev.disabled = i === 0; btnNext.disabled = i === N - 1;
}

function mountDeck() {
  if (teardown) { teardown(); teardown = null; }
  deck.classList.remove('is-pin', 'is-car');
  cards.forEach((c) => { c.removeAttribute('style'); c.inert = false; $('.qcard__shade', c).style.opacity = ''; });
  list.removeAttribute('style'); list.scrollLeft = 0;
  if (!M || reduce) return;                 // lista estática: tudo aceso
  teardown = wideMQ.matches ? mountPin() : mountCarousel();
}

/* ---- desktop: cena presa; cartões em leque, o do topo sai com mola ---- */
function mountPin() {
  deck.classList.add('is-pin');
  let active = -1, raf = 0, dragging = null;
  const stateFor = (d) => {
    if (d < 0) return { x: -380, y: -16, rotate: -15, scale: 0.94, opacity: 0 };
    if (d === 0) return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
    const k = Math.min(d, 4);
    return { x: k * 46, y: 0, rotate: k * 5.5, scale: 1 - k * 0.045, opacity: d > 3 ? 0 : 1 };
  };
  const render = (immediate) => {
    cards.forEach((c, i) => {
      const d = i - active;
      c.style.zIndex = d >= 0 ? String(30 - d) : '1';
      c.inert = d !== 0;
      c.setAttribute('aria-hidden', d !== 0 ? 'true' : 'false');
      animate(c, stateFor(d), immediate ? { duration: 0 } : { ...SPRING.card, delay: d === 0 ? 0.04 : 0 });
      animate($('.qcard__shade', c), { opacity: d <= 0 ? 0 : Math.min(0.55, d * 0.18) }, { duration: immediate ? 0 : DUR.panel, ease: EASE_OUT });
    });
    announce(active);
  };
  const yFor = (i) => deck.offsetTop + (i / (N - 1)) * (deck.offsetHeight - innerHeight);
  const goIndex = (i) => goTo(yFor(clamp(i, 0, N - 1)) + 1, 1.0);
  const sync = () => {
    raf = 0;
    const r = deck.getBoundingClientRect();
    const range = r.height - innerHeight;
    if (range <= 0) return;
    const t = clamp(-r.top / range) * (N - 1);
    setSegs(t);
    const i = Math.round(t);
    if (i !== active && !dragging) { const first = active < 0; active = i; render(first); }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(sync); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  sync();

  const onPrev = () => goIndex(active - 1), onNext = () => goIndex(active + 1);
  btnPrev.addEventListener('click', onPrev); btnNext.addEventListener('click', onNext);
  const segHandlers = segs.map((s, k) => { const h = () => goIndex(k); s.addEventListener('click', h); return h; });
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); onNext(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); onPrev(); }
    else if (e.key === 'Home') { e.preventDefault(); goIndex(0); }
    else if (e.key === 'End') { e.preventDefault(); goIndex(N - 1); }
  };
  stage.addEventListener('keydown', onKey);

  // arrastar o cartão do topo (interrompível: o cartão segue o ponteiro e volta com mola)
  const onDown = (e) => {
    const c = e.target.closest('[data-card]');
    if (!c || cards[active] !== c || e.button > 0 || e.target.closest('a')) return;
    dragging = { c, x0: e.clientX, t0: performance.now(), dx: 0, id: e.pointerId };
    c.setPointerCapture(e.pointerId); c.classList.add('is-drag');
  };
  const onMove = (e) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    dragging.dx = e.clientX - dragging.x0;
    animate(dragging.c, { x: dragging.dx, rotate: dragging.dx * 0.035 }, { duration: 0 });
  };
  const onUp = (e) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const { c, dx, t0 } = dragging; dragging = null; c.classList.remove('is-drag');
    const v = Math.abs(dx) / Math.max(1, performance.now() - t0);        // px/ms
    if (dx < -70 || (dx < -30 && v > 0.5)) goIndex(active + 1);
    else if (dx > 70 || (dx > 30 && v > 0.5)) goIndex(active - 1);
    animate(c, stateFor(0), SPRING.back);
    // se o scroll mudar o índice depois, o render assume
  };
  list.addEventListener('pointerdown', onDown);
  list.addEventListener('pointermove', onMove);
  list.addEventListener('pointerup', onUp);
  list.addEventListener('pointercancel', onUp);
  // um clique depois de arrastar não pode abrir o WhatsApp por engano
  const swallow = (e) => { if (Math.abs(lastDx) > 6) e.preventDefault(); };
  let lastDx = 0;
  list.addEventListener('pointermove', () => { lastDx = dragging ? dragging.dx : lastDx; });
  list.addEventListener('pointerdown', () => { lastDx = 0; });
  list.addEventListener('click', swallow, true);

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll);
    btnPrev.removeEventListener('click', onPrev); btnNext.removeEventListener('click', onNext);
    segs.forEach((s, k) => s.removeEventListener('click', segHandlers[k]));
    stage.removeEventListener('keydown', onKey);
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((n) => list.removeEventListener(n, { pointerdown: onDown, pointermove: onMove, pointerup: onUp, pointercancel: onUp }[n]));
    list.removeEventListener('click', swallow, true);
    cards.forEach((c) => { c.getAnimations?.().forEach((a) => a.cancel()); c.removeAttribute('aria-hidden'); });
    setSegs(0);
  };
}

/* ---- celular/tablet: carrossel com scroll-snap e inércia nativa ---- */
function mountCarousel() {
  deck.classList.add('is-car');
  let raf = 0, idx = 0;
  const target = (i) => { const c = cards[i]; return c.offsetLeft - (list.clientWidth - c.offsetWidth) / 2; };
  const stepW = () => target(1) - target(0);
  const sync = () => {
    raf = 0;
    const t = clamp((list.scrollLeft - target(0)) / stepW(), 0, N - 1);
    setSegs(t);
    const i = Math.round(t);
    if (i !== idx || !liveEl.textContent) { idx = i; announce(i); }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(sync); };
  list.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  const go = (i) => list.scrollTo({ left: target(clamp(i, 0, N - 1)), behavior: reduce ? 'auto' : 'smooth' });
  const onPrev = () => go(idx - 1), onNext = () => go(idx + 1);
  btnPrev.addEventListener('click', onPrev); btnNext.addEventListener('click', onNext);
  const segHandlers = segs.map((s, k) => { const h = () => go(k); s.addEventListener('click', h); return h; });
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
  };
  stage.addEventListener('keydown', onKey);
  sync();
  return () => {
    cancelAnimationFrame(raf);
    list.removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll);
    btnPrev.removeEventListener('click', onPrev); btnNext.removeEventListener('click', onNext);
    segs.forEach((s, k) => s.removeEventListener('click', segHandlers[k]));
    stage.removeEventListener('keydown', onKey);
    setSegs(0);
  };
}

wideMQ.addEventListener('change', mountDeck);
mountDeck();

/* ------------------------------------------------------------------ */
/* Coreografia (hero, narrativa)                                        */
/* ------------------------------------------------------------------ */
if (M && !reduce) {
  const { scroll, stagger } = M;
  root.classList.add('motion-ready');

  /* ---- ASSINATURA 1 — hero: a luz âmbar do LED acende no letreiro ---- */
  animate('.hero__title .ln > span', { transform: ['translateY(105%)', 'translateY(0%)'] }, { duration: 1, delay: stagger(0.09), ease: EASE_OUT });
  animate('[data-hero-in]', { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0)'] }, { duration: 0.8, delay: stagger(0.09, { startDelay: 0.35 }), ease: EASE_OUT });
  animate('[data-hero-photo] img', { transform: ['scale(1.1)', 'scale(1)'] }, { duration: 1.9, delay: 0.1, ease: EASE_OUT });
  // acende em duas batidas, como um LED que firma
  animate('[data-led]', { opacity: [0, 0.55, 0.3, 1] }, { duration: 1.7, delay: 0.55, ease: 'linear', times: [0, 0.25, 0.4, 1] });
  animate('[data-sweep]', { opacity: [0, 1, 1, 0], left: ['-40%', '20%', '60%', '110%'] }, { duration: 1.6, delay: 0.75, ease: EASE_IN_OUT, times: [0, 0.2, 0.8, 1] });

  /* ---- NARRATIVA 1 — a luz varre a entrada do baralho (entra pelo LED da estante) ---- */
  const led = $('[data-deck-led]'), glow = $('[data-deck-glow]');
  scroll((p) => {
    const t = prog(p);
    led.style.opacity = String(clamp(t * 2.2));
    led.style.transform = `translateX(${((1 - clamp(t * 1.4)) * -60).toFixed(1)}%)`;
    glow.style.opacity = String(clamp((t - 0.25) / 0.6));
  }, { target: deck, offset: ['start end', 'start 30%'] });

  /* ---- NARRATIVA 2 — a fachada recua: o letreiro assenta com parallax leve ---- */
  const frame = $('[data-clinic-frame]'), cimg = $('[data-clinic-img]');
  scroll((p) => {
    const t = prog(p);
    cimg.style.transform = `translateY(${((0.5 - t) * 46).toFixed(1)}px) scale(${(1 + 0.14 * (1 - clamp(t * 1.5))).toFixed(4)})`;
  }, { target: frame, offset: ['start end', 'end start'] });

  /* ---- NARRATIVA 3 — contato: a janela se abre (a foto do café ganha moldura) ---- */
  const win = $('[data-window]');
  scroll((p) => {
    const t = clamp(prog(p) / 0.5);
    const inset = (1 - t) * 14, r = 24 + (1 - t) * 0;
    win.style.clipPath = `inset(${inset.toFixed(2)}% ${(inset * 0.8).toFixed(2)}% round ${r}px)`;
  }, { target: win, offset: ['start end', 'start 40%'] });

  /* ---- Interface: foco por teclado no baralho (pin) mostra a dica ---- */
}
