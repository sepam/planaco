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

function drawHistogram(id, opts){
  const svg = document.getElementById(id);
  if(!svg) return;
  svg.innerHTML = "";
  const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
  const padL = opts.compact ? 8 : 48, padR = opts.compact ? 8 : 20;
  const padT = 18, padB = opts.compact ? 14 : 38;
  const plotW = W - padL - padR, plotH = H - padT - padB, base = padT + plotH;
  const step = plotW / HEIGHTS.length, bw = step * 0.78;

  const bar = v('--chart-bar'), barStroke = v('--chart-bar-stroke'), gold = v('--gold');
  const grid = v('--chart-grid'), axis = v('--chart-axis'), muted = v('--text-muted');

  // gridlines
  if(!opts.compact){
    for(let g=0; g<=4; g++){
      const y = padT + plotH*(g/4);
      svg.appendChild(el('line',{x1:padL,y1:y,x2:padL+plotW,y2:y,stroke:grid,'stroke-width':1}));
    }
  }
  // bars
  HEIGHTS.forEach((h,i)=>{
    const x = padL + i*step + (step-bw)/2;
    const bh = plotH * h/100;
    const r = el('rect',{x:x, y:base-bh, width:bw, height:bh, rx:1.5,
      fill: i===MODE_INDEX ? gold : bar,
      stroke: i===MODE_INDEX ? gold : barStroke, 'stroke-width':1});
    svg.appendChild(r);
  });
  // axis baseline
  svg.appendChild(el('line',{x1:padL,y1:base,x2:padL+plotW,y2:base,stroke:axis,'stroke-width':1}));

  if(opts.compact) return;

  // x labels
  [14,18,22,26,30].forEach(val=>{
    const frac = (val - X_MIN)/(X_MAX - X_MIN);
    const x = padL + frac*plotW;
    const t = el('text',{x:x, y:base+22, fill:muted, 'font-size':12, 'text-anchor':'middle', 'font-family':'JetBrains Mono, monospace'});
    t.textContent = val; svg.appendChild(t);
  });
  // percentile markers
  const marks = [{p:0.50,c:v('--gold'),l:'P50'},{p:0.85,c:v('--amber'),l:'P85'},{p:0.95,c:v('--coral'),l:'P95'}];
  marks.forEach(m=>{
    const idx = percentileIndex(m.p);
    const x = padL + (idx+0.5)*step;
    svg.appendChild(el('line',{x1:x,y1:padT,x2:x,y2:base,stroke:m.c,'stroke-width':2,'stroke-dasharray':'5 4'}));
    const lbl = el('text',{x:x+6,y:padT+13,fill:m.c,'font-size':12,'font-weight':600,'font-family':'JetBrains Mono, monospace'});
    lbl.textContent = m.l; svg.appendChild(lbl);
  });
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

function drawCDF(id){
  const svg = document.getElementById(id);
  svg.innerHTML = "";
  const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
  const padL = 38, padR = 16, padT = 16, padB = 34;
  const plotW = W-padL-padR, plotH = H-padT-padB, base = padT+plotH;
  const total = HEIGHTS.reduce((a,b)=>a+b,0);
  const text = v('--text'), gold = v('--gold'), grid = v('--chart-grid'), axis = v('--chart-axis'), muted = v('--text-muted');

  // gridlines + y labels
  [0,0.25,0.5,0.75,1].forEach(q=>{
    const y = base - plotH*q;
    svg.appendChild(el('line',{x1:padL,y1:y,x2:padL+plotW,y2:y,stroke:grid,'stroke-width':1}));
    const t = el('text',{x:padL-8,y:y+4,fill:muted,'font-size':11,'text-anchor':'end','font-family':'JetBrains Mono, monospace'});
    t.textContent = q.toFixed(1); svg.appendChild(t);
  });

  // build cumulative points
  let cum = 0; const pts = [];
  HEIGHTS.forEach((h,i)=>{ cum += h; const x = padL + (i+0.5)/HEIGHTS.length*plotW; const y = base - (cum/total)*plotH; pts.push([x,y]); });

  // area
  let d = `M ${padL} ${base} `;
  pts.forEach(p=> d += `L ${p[0].toFixed(1)} ${p[1].toFixed(1)} `);
  d += `L ${padL+plotW} ${base} Z`;
  svg.appendChild(el('path',{d:d, fill:'var(--gold-soft)'}));
  // line
  let dl = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `;
  pts.slice(1).forEach(p=> dl += `L ${p[0].toFixed(1)} ${p[1].toFixed(1)} `);
  svg.appendChild(el('path',{d:dl, fill:'none', stroke:gold, 'stroke-width':2.5, 'stroke-linejoin':'round'}));

  // P85 guide
  const idx = percentileIndex(0.85), px = padL + (idx+0.5)/HEIGHTS.length*plotW;
  svg.appendChild(el('line',{x1:px,y1:padT,x2:px,y2:base,stroke:v('--amber'),'stroke-width':1.5,'stroke-dasharray':'4 4'}));
  svg.appendChild(el('line',{x1:padL,y1:base-0.85*plotH,x2:px,y2:base-0.85*plotH,stroke:v('--amber'),'stroke-width':1.5,'stroke-dasharray':'4 4'}));
  const dot = el('circle',{cx:px,cy:base-0.85*plotH,r:4,fill:v('--amber')}); svg.appendChild(dot);

  svg.appendChild(el('line',{x1:padL,y1:base,x2:padL+plotW,y2:base,stroke:axis,'stroke-width':1}));
  [16,20,24,28].forEach(val=>{
    const frac=(val-X_MIN)/(X_MAX-X_MIN), x=padL+frac*plotW;
    const t=el('text',{x:x,y:base+20,fill:muted,'font-size':11,'text-anchor':'middle','font-family':'JetBrains Mono, monospace'});
    t.textContent=val; svg.appendChild(t);
  });
}

function drawDAG(id){
  const svg = document.getElementById(id);
  svg.innerHTML = "";
  const text=v('--text'), gold=v('--gold'), bar=v('--chart-bar'), stroke=v('--chart-bar-stroke'), muted=v('--text-muted'), canvas=v('--canvas');
  // nodes: [x,y,label,dur,critical]
  const N = {
    design:   [56, 140, 'Design', '5–7–14', true],
    frontend: [190, 70, 'Frontend','8–12–15', false],
    backend:  [190, 210,'Backend', '10–15–25', true],
    test:     [300, 140, 'Testing','2–3–5', true],
  };
  const edges = [['design','frontend',false],['design','backend',true],['frontend','test',false],['backend','test',true]];
  const nw=86, nh=48;
  // edges
  edges.forEach(([a,b,crit])=>{
    const [ax,ay]=N[a], [bx,by]=N[b];
    const x1=ax+nw/2, y1=ay, x2=bx-nw/2, y2=by;
    svg.appendChild(el('path',{d:`M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`,
      fill:'none', stroke: crit?gold:stroke, 'stroke-width': crit?2.5:1.5, 'marker-end':`url(#arrow-${crit?'g':'n'})`, opacity: crit?1:0.6}));
  });
  // arrow markers
  const defs = el('defs',{});
  [['arrow-g',gold],['arrow-n',stroke]].forEach(([mid,col])=>{
    const m = el('marker',{id:mid,viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'});
    m.appendChild(el('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:col}));
    defs.appendChild(m);
  });
  svg.appendChild(defs);
  // nodes
  for(const k in N){
    const [x,y,label,dur,crit]=N[k];
    const g = el('g',{});
    g.appendChild(el('rect',{x:x-nw/2,y:y-nh/2,width:nw,height:nh,rx:10,
      fill: crit ? 'var(--gold-soft)' : v('--surface-2'),
      stroke: crit?gold:stroke, 'stroke-width': crit?2:1.5}));
    const t1=el('text',{x:x,y:y-2,fill:text,'font-size':13,'font-weight':600,'text-anchor':'middle','font-family':'Space Grotesk, sans-serif'});
    t1.textContent=label; g.appendChild(t1);
    const t2=el('text',{x:x,y:y+14,fill:muted,'font-size':10,'text-anchor':'middle','font-family':'JetBrains Mono, monospace'});
    t2.textContent=dur; g.appendChild(t2);
    svg.appendChild(g);
  }
  // caption
  const c=el('text',{x:200,y:290,fill:muted,'font-size':11,'text-anchor':'middle','font-family':'JetBrains Mono, monospace'});
  c.textContent='gold = on critical path'; svg.appendChild(c);
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
    `<div class="dist"><h4>${n}</h4><div class="when">${w}</div>${sparkSVG(k)}</div>`).join('');
}

function renderAll(){
  drawHistogram('hist', {compact:false});
  drawHistogram('probHist', {compact:true});
  drawPointEstimate('ptEstimate');
  drawCDF('cdf');
  drawDAG('dag');
  renderDists();
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

renderAll();
