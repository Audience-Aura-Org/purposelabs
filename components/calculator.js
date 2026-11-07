// Reconstitution calculator for the legacy calculator markup.
// concentration (mcg/ml) = vial mg * 1000 / water ml ; units (U-100) = dose / conc * 100
export function initCalculator(root) {
  if (!root || root.dataset.ready) return undefined;
  root.dataset.ready = '1';
  const $ = (s) => root.querySelector(s);
  const state = {};
  const customFor = { vial: '#vial-custom', water: '#water-custom', dosage: '#dosage-custom' };
  const read = (name) => (state[name] === 'custom' ? Number($(customFor[name])?.value) || 0 : Number(state[name]));
  const fmt = (n, d) => String(Number(n.toFixed(d)));

  const compute = () => {
    const syringe = read('syringe'), vial = read('vial'), water = read('water'), dose = read('dosage');
    const cap = Math.round(syringe * 100);
    const fill = $('#syringe-fill'), marks = $('#syringe-markings');
    const ticks = cap / (cap > 50 ? 2 : 1) + 1;
    if (marks && marks.childElementCount !== ticks) marks.innerHTML = '<span></span>'.repeat(ticks);
    const set = (id, v) => { const el = $(`#${id}`); if (el) el.textContent = v; };
    if (!(vial > 0 && water > 0 && dose > 0)) {
      ['result-units', 'result-ml', 'concentration', 'doses-per-vial'].forEach((id) => set(id, '–'));
      if (fill) fill.style.width = '0%';
      return;
    }
    const conc = (vial * 1000) / water;
    const ml = dose / conc;
    const units = ml * 100;
    set('result-units', fmt(units, 1));
    set('result-ml', fmt(ml, 3));
    set('concentration', fmt(conc, 0));
    set('doses-per-vial', String(Math.floor((vial * 1000) / dose)));
    if (fill) fill.style.width = `${Math.min(100, (units / cap) * 100)}%`;
    const warn = $('#result-warning');
    if (warn) warn.style.display = units > cap ? 'flex' : 'none';
  };

  const listeners = [];
  const on = (el, ev, fn) => { el.addEventListener(ev, fn); listeners.push(() => el.removeEventListener(ev, fn)); };

  root.querySelectorAll('.button-group[data-input]').forEach((g) => {
    const name = g.dataset.input;
    const btns = [...g.querySelectorAll('.calc-btn')];
    const active = btns.find((b) => b.classList.contains('active')) || btns[0];
    state[name] = active.dataset.value;
    btns.forEach((b) => {
      b.setAttribute('aria-pressed', String(b === active));
      on(b, 'click', () => {
        btns.forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        state[name] = b.dataset.value;
        const ci = customFor[name] && $(customFor[name]);
        if (ci) {
          ci.style.display = b.dataset.value === 'custom' ? 'block' : 'none';
          if (b.dataset.value === 'custom') ci.focus();
        }
        compute();
      });
    });
  });
  Object.values(customFor).forEach((sel) => { const el = $(sel); if (el) on(el, 'input', compute); });
  compute();

  return () => { listeners.forEach((off) => off()); delete root.dataset.ready; };
}
