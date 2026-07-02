/* ============================================================
   Chart rendering — reads brand tokens from CSS so charts
   re-theme on light/dark toggle. Mockup data is illustrative.
   ============================================================ */
const SVGNS = "http://www.w3.org/2000/svg";
function v(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function el(tag, attrs){ const e = document.createElementNS(SVGNS, tag); for(const k in attrs) e.setAttribute(k, attrs[k]); return e; }

// Bell-ish histogram heights (0-100), modeIndex marks the gold bar.
const HEIGHTS = [2,4,7,12,20,30,43,58,72,85,95,100,96,88,76,63,50,38,28,20,13,8,5,3,2,1];
const X_MIN = 14, X_MAX = 30, MODE_INDEX = 11;

function percentileIndex(p){
  const total = HEIGHTS.reduce((a,b)=>a+b,0);
  let cum = 0;
  for(let i=0;i<HEIGHTS.length;i++){ cum += HEIGHTS[i]; if(cum/total >= p) return i; }
  return HEIGHTS.length-1;
}

/* Data-driven histogram renderer.
   model: {values:number[], xMin, xMax, modeIndex, marks:[{value,color,label}]}
   opts:  {compact?:bool, animate?:bool, xTicks?:number[]} */
function renderHist(svg, model, opts = {}){
  svg.innerHTML = "";
  const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
  const padL = opts.compact ? 8 : 48, padR = opts.compact ? 8 : 20;
  const padT = 18, padB = opts.compact ? 14 : 38;
  const plotW = W - padL - padR, plotH = H - padT - padB, base = padT + plotH;
  const n = model.values.length;
  const step = plotW / n, bw = step * 0.78;
  const peak = Math.max(...model.values) || 1;

  const bar = v('--chart-bar'), barStroke = v('--chart-bar-stroke'), gold = v('--gold');
  const grid = v('--chart-grid'), axis = v('--chart-axis'), muted = v('--text-muted');

  if(!opts.compact){
    for(let g = 0; g <= 4; g++){
      const y = padT + plotH * (g / 4);
      svg.appendChild(el('line', {x1: padL, y1: y, x2: padL + plotW, y2: y, stroke: grid, 'stroke-width': 1}));
    }
  }
  model.values.forEach((hv, i) => {
    const x = padL + i * step + (step - bw) / 2;
    const bh = plotH * hv / peak;
    const isMode = i === model.modeIndex;
    const r = el('rect', {x: x, y: base - bh, width: bw, height: bh, rx: 1.5,
      fill: isMode ? gold : bar, stroke: isMode ? gold : barStroke, 'stroke-width': 1});
    if(opts.animate){ r.classList.add('bar-rise'); r.style.setProperty('--i', i); }
    svg.appendChild(r);
  });
  svg.appendChild(el('line', {x1: padL, y1: base, x2: padL + plotW, y2: base, stroke: axis, 'stroke-width': 1}));

  const span = (model.xMax - model.xMin) || 1;  // degenerate case: all sliders equal
  const xPos = val => padL + (val - model.xMin) / span * plotW;
  (opts.xTicks || []).forEach(val => {
    const t = el('text', {x: xPos(val), y: base + 22, fill: muted, 'font-size': 12,
      'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace'});
    t.textContent = Math.round(val); svg.appendChild(t);
  });
  (model.marks || []).forEach(m => {
    const x = xPos(m.value);
    const line = el('line', {x1: x, y1: padT, x2: x, y2: base, stroke: m.color, 'stroke-width': 2, 'stroke-dasharray': '5 4'});
    const lbl = el('text', {x: x + 6, y: padT + 13, fill: m.color, 'font-size': 12, 'font-weight': 600,
      'font-family': 'JetBrains Mono, monospace'});
    lbl.textContent = m.label;
    if(opts.animate){ line.classList.add('mark-in'); lbl.classList.add('mark-in'); }
    svg.appendChild(line); svg.appendChild(lbl);
  });
}

/* Static illustrative model built from the prototype HEIGHTS data. */
function staticModel(withMarks){
  const idxVal = i => X_MIN + (i + 0.5) / HEIGHTS.length * (X_MAX - X_MIN);
  return {
    values: HEIGHTS, xMin: X_MIN, xMax: X_MAX, modeIndex: MODE_INDEX,
    marks: withMarks ? [
      {value: idxVal(percentileIndex(0.50)), color: v('--gold'),  label: 'P50'},
      {value: idxVal(percentileIndex(0.85)), color: v('--amber'), label: 'P85'},
      {value: idxVal(percentileIndex(0.95)), color: v('--coral'), label: 'P95'},
    ] : [],
  };
}

function drawHero(animate){
  const svg = document.getElementById('heroHist');
  if(!svg) return;
  renderHist(svg, staticModel(true), {animate: animate, xTicks: [14, 18, 22, 26, 30]});
}

function drawHistogram(id, opts){
  const svg = document.getElementById(id);
  if(!svg) return;
  renderHist(svg, staticModel(!opts.compact), {compact: opts.compact, xTicks: opts.compact ? [] : [14, 18, 22, 26, 30]});
}

function drawPointEstimate(id){
  const svg = document.getElementById(id);
  if(!svg) return;
  svg.innerHTML = "";
  const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
  const padL=8, padR=8, padT=18, padB=14;
  const plotW=W-padL-padR, plotH=H-padT-padB, base=padT+plotH;
  const axis=v('--chart-axis'), coral=v('--coral'), muted=v('--text-muted');
  // single lonely bar at the "21 days" position (mode index), full height
  const step = plotW / HEIGHTS.length, bw = step*0.78;
  const x = padL + MODE_INDEX*step + (step-bw)/2;
  svg.appendChild(el('rect',{x:x, y:padT, width:bw, height:plotH, rx:1.5, fill:coral, opacity:0.85}));
  const lbl=el('text',{x:x+bw/2, y:padT-4, fill:coral, 'font-size':12, 'font-weight':600, 'text-anchor':'middle', 'font-family':'JetBrains Mono, monospace'});
  lbl.textContent='21'; svg.appendChild(lbl);
  svg.appendChild(el('line',{x1:padL,y1:base,x2:padL+plotW,y2:base,stroke:axis,'stroke-width':1}));
}

/* ---- distribution sparklines ---- */
function pdfSamples(kind){
  const n=60, xs=[]; for(let i=0;i<n;i++) xs.push(i/(n-1));
  const f = {
    triangular: x=>{ const a=0.1,m=0.45,b=0.95; if(x<a||x>b) return 0; return x<m ? (x-a)/(m-a) : (b-x)/(b-m); },
    pert:       x=>Math.pow(x,2.2)*Math.pow(1-x,1.6),
    uniform:    x=> (x>0.15 && x<0.85) ? 1 : (x>0.1&&x<0.9?0.5:0),
    normal:     x=>Math.exp(-Math.pow((x-0.5)/0.16,2)/2),
    lognormal:  x=>{ if(x<=0.02) return 0; const t=(x)*3; return Math.exp(-Math.pow(Math.log(t)+0.2,2)/(2*0.45*0.45))/t; },
    beta:       x=>Math.pow(x,1.6)*Math.pow(1-x,3.2),
  }[kind];
  const ys = xs.map(f); const mx=Math.max(...ys)||1; return ys.map(y=>y/mx);
}
function sparkSVG(kind){
  const W=240,H=56,pad=4, plotH=H-pad*2;
  const ys=pdfSamples(kind);
  let d=`M ${pad} ${H-pad} `;
  ys.forEach((y,i)=>{ const x=pad+i/(ys.length-1)*(W-pad*2); d+=`L ${x.toFixed(1)} ${(H-pad-y*plotH).toFixed(1)} `; });
  d+=`L ${W-pad} ${H-pad} Z`;
  // mode dot
  let mi=0; ys.forEach((y,i)=>{ if(y>=ys[mi]) mi=i; });
  const mx=pad+mi/(ys.length-1)*(W-pad*2), my=H-pad-ys[mi]*plotH;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <path d="${d}" fill="var(--gold-soft)" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3.5" fill="var(--gold)"/>
  </svg>`;
}
const DISTS = [
  ['Triangular','min · mode · max','triangular'],
  ['PERT','smooth, mode-weighted','pert'],
  ['Uniform','equal across range','uniform'],
  ['Normal','symmetric bell','normal'],
  ['LogNormal','right-skewed delays','lognormal'],
  ['Beta','custom shape','beta'],
];
function renderDists(){
  document.getElementById('dists').innerHTML = DISTS.map(([n,w,k])=>
    `<div class="dist"><h3>${n}</h3><div class="when">${w}</div>${sparkSVG(k)}</div>`).join('');
}

/* ---- live demo ---- */
const DEMO_TASKS = [
  { key: 'design',   label: 'Design',   note: 'blocks Frontend & Backend',   triple: [5, 7, 14] },
  { key: 'frontend', label: 'Frontend', note: 'after Design ∥ Backend',      triple: [8, 12, 15] },
  { key: 'backend',  label: 'Backend',  note: 'after Design ∥ Frontend',     triple: [10, 15, 25] },
  { key: 'testing',  label: 'Testing',  note: 'waits for both tracks',       triple: [2, 3, 5] },
];
const PARAMS = ['min', 'mode', 'max'];

function buildDemoControls(){
  const host = document.getElementById('demoControls');
  if(!host) return;
  host.innerHTML = DEMO_TASKS.map(t => `
    <fieldset class="demo-task" data-key="${t.key}">
      <div class="task-head"><span class="task-name">${t.label}</span><span class="task-note">${t.note}</span></div>
      ${PARAMS.map((p, i) => `
        <div class="demo-row">
          <label class="p-label" for="${t.key}-${p}">${p}</label>
          <input type="range" id="${t.key}-${p}" min="1" max="40" step="1"
                 value="${t.triple[i]}" data-key="${t.key}" data-which="${i}"
                 aria-label="${t.label} ${p} duration in days" />
          <span class="p-value" id="${t.key}-${p}-value">${t.triple[i]}</span>
        </div>`).join('')}
    </fieldset>`).join('');
  host.addEventListener('input', onDemoInput);
}

function onDemoInput(e){
  const input = e.target;
  if(input.type !== 'range') return;
  const key = input.dataset.key, which = Number(input.dataset.which);
  const task = DEMO_TASKS.find(t => t.key === key);
  const triple = task.triple.slice();
  triple[which] = Number(input.value);
  task.triple = PlanacoMC.clampTriple(triple, which);
  PARAMS.forEach((p, i) => {
    document.getElementById(`${key}-${p}`).value = task.triple[i];
    document.getElementById(`${key}-${p}-value`).textContent = task.triple[i];
  });
  scheduleDemo();
}

let demoPending = false;
function scheduleDemo(){
  if(demoPending) return;
  demoPending = true;
  requestAnimationFrame(() => { demoPending = false; runDemo(); });
}

function runDemo(){
  const svg = document.getElementById('demoHist');
  if(!svg) return;
  const tasks = {};
  DEMO_TASKS.forEach(t => { tasks[t.key] = t.triple; });
  const samples = PlanacoMC.simulate(tasks, 10000);
  const s = PlanacoMC.summarize(samples, 26);
  renderHist(svg, {
    values: s.counts, xMin: s.min, xMax: s.max, modeIndex: s.modeIndex,
    marks: [
      {value: s.p50, color: v('--gold'),  label: 'P50'},
      {value: s.p85, color: v('--amber'), label: 'P85'},
      {value: s.p95, color: v('--coral'), label: 'P95'},
    ],
  }, {xTicks: [0, 0.25, 0.5, 0.75, 1].map(f => s.min + f * (s.max - s.min))});
  document.getElementById('statP50').textContent = s.p50.toFixed(1);
  document.getElementById('statP85').textContent = s.p85.toFixed(1);
  document.getElementById('statP95').textContent = s.p95.toFixed(1);
}

function renderAll(opts = {}){
  drawHero(!!opts.animateHero);
  drawHistogram('probHist', {compact:true});
  drawPointEstimate('ptEstimate');
  renderDists();
  runDemo();
}

/* ---- theme toggle ---- */
const toggle = document.getElementById('themeToggle');
function syncToggleIcon(){
  toggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '🌙' : '☀️';
}
toggle.addEventListener('click', ()=>{
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
  syncToggleIcon();
  renderAll();
});
syncToggleIcon();

/* ---- copy ---- */
document.querySelectorAll('.copy').forEach(c=>c.addEventListener('click',()=>{
  navigator.clipboard?.writeText(c.dataset.copy); const o=c.textContent; c.textContent='copied'; setTimeout(()=>c.textContent=o,1200);
}));

/* ---- GitHub stars (fail-silent) ---- */
(async function loadStars(){
  try {
    const r = await fetch('https://api.github.com/repos/sepam/planaco');
    if (!r.ok) return;
    const data = await r.json();
    const n = data.stargazers_count;
    if (typeof n !== 'number') return;
    document.getElementById('starCount').textContent =
      n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'') + 'k' : String(n);
    document.getElementById('starWrap').hidden = false;
  } catch (e) { /* leave the plain GitHub button */ }
})();

/* ---- code tabs ---- */
(function initTabs(){
  const list = document.querySelector('.tabs');
  if(!list) return;
  const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
  function select(tab){
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    tab.focus();
  }
  list.addEventListener('click', e => {
    const tab = e.target.closest('[role="tab"]');
    if(tab) select(tab);
  });
  list.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if(i < 0) return;
    if(e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length]);
    if(e.key === 'ArrowLeft')  select(tabs[(i - 1 + tabs.length) % tabs.length]);
  });
})();

buildDemoControls();
renderAll({animateHero: true});
