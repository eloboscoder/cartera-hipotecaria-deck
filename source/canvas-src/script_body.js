const SLIDE_COUNT = 12;
const THEMES = ['th-red','','','','th-red','','','','','th-blush','th-deep','th-night'];
const TITLES = ['Portada','Diez números','Embudo comercial','P1 · Canales','P2 · Segmentos y score','P3 · Experiencia','Serie mensual','P4 · Geografía','P5 · Ejecutivos','P6 · Cosechas','P7 · Sensibilidad de tasa','Conclusiones'];
const STEP_SLIDES = { 2:1, 3:1, 4:1, 5:1, 7:1, 9:1, 10:1 };
const INTRO_QS = ['¿Qué canal origina más y a qué costo?','¿Dónde se concentra el monto?','¿Crecer nos costó experiencia?','¿Dónde está el riesgo en el mapa?','¿Vender más significa vender peor?','¿Las cosechas 2026 son mejores?','¿Y si la tasa sube 2 puntos?'];
const SRED = '#EC0000', CORAL = '#E8735F', PEACH = '#F2BFA3', BLACK = '#1A1A1A', GRAY = '#9A9A9A';
const GL_THEMES = {
  '':         { c1:'#FFF8F4', c2:'#FBEEE7', c3:'#F2BFA3', mix:0.42 },
  'th-blush': { c1:'#FBEEE7', c2:'#F6DCC9', c3:'#E8735F', mix:0.30 },
  'th-red':   { c1:'#EC0000', c2:'#B30000', c3:'#FF5A4A', mix:0.80 },
  'th-deep':  { c1:'#A80000', c2:'#5A0000', c3:'#E02A2A', mix:0.82 },
  'th-night': { c1:'#3C0000', c2:'#180000', c3:'#8E0000', mix:0.90 },
};

function nf0(n){ return Math.round(n).toLocaleString('es-CL'); }
function nf1(n){ return (Math.round(n*10)/10).toLocaleString('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1}); }
function nf2(n){ return (Math.round(n*100)/100).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function maxOf(arr, fn){ return arr.reduce((m,x)=>Math.max(m, fn(x)), 0); }
function minOf(arr, fn){ return arr.reduce((m,x)=>Math.min(m, fn(x)), Infinity); }
function monthTick(mes){ const parts = mes.split('-'); const names=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return names[parseInt(parts[1],10)-1] + (parts[1]==='01' ? " '"+parts[0].slice(2) : ''); }
function monthLong(mes){ const parts = mes.split('-'); const names=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']; return names[parseInt(parts[1],10)-1] + ' ' + parts[0]; }
function lerpColor(hexA, hexB, t){
  const a = [1,3,5].map(i=>parseInt(hexA.slice(i,i+2),16));
  const b = [1,3,5].map(i=>parseInt(hexB.slice(i,i+2),16));
  const c = a.map((v,i)=>Math.round(v + (b[i]-v)*t));
  return '#' + c.map(v=>v.toString(16).padStart(2,'0')).join('');
}
const RAMP = ['#F2BFA3','#E8735F','#EC0000','#6A0000'];
function rampColor(t){
  t = Math.max(0, Math.min(1, t));
  const seg = Math.min(RAMP.length-2, Math.floor(t*(RAMP.length-1)));
  const lt = t*(RAMP.length-1) - seg;
  return lerpColor(RAMP[seg], RAMP[seg+1], lt);
}
function isDarkTheme(i){ const t = THEMES[i] || ''; return t === 'th-red' || t === 'th-deep' || t === 'th-night'; }
function hexToRgb01(hex){ return [1,3,5].map(k=>parseInt(hex.slice(k,k+2),16)/255); }
function sparkPath(series){
  const n = series.length; if (!n) return { d:'', area:'', x:0, y:0 };
  const mn = Math.min(...series), mx = Math.max(...series), span = (mx - mn) || 1;
  const pts = series.map((v, k) => [ (k/(n-1))*100, 26 - ((v-mn)/span)*23 ]);
  const d = pts.map((p,k)=>(k===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const area = d + ' L100,28 L0,28 Z';
  const last = pts[n-1];
  return { d, area, x: last[0].toFixed(1), y: last[1].toFixed(1) };
}

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }';
const FRAG = [
  'precision highp float;',
  'uniform float uTime; uniform vec2 uMouse; uniform vec2 uRes; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform float uMix;',
  'varying vec2 vUv;',
  'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }',
  'float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }',
  'float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int k = 0; k < 3; k++){ v += a*noise(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }',
  'void main(){',
  '  vec2 asp = vec2(uRes.x/max(uRes.y,1.0), 1.0);',
  '  vec2 p = vUv*asp; vec2 m = uMouse*asp;',
  '  float d = length(p - m); float bump = exp(-d*d*2.2);',
  '  vec2 q = vec2(fbm(p*1.4 + uTime*0.05), fbm(p*1.4 - uTime*0.04 + vec2(5.2,1.3)));',
  '  vec2 r = vec2(fbm(p*1.4 + q*2.0 + uTime*0.035 + bump*0.55), fbm(p*1.4 + q*2.0 - uTime*0.03 + vec2(8.3,2.8) - bump*0.55));',
  '  float f = fbm(p*1.4 + r*2.2);',
  '  vec3 col = mix(uC1, uC2, smoothstep(0.25, 0.8, f));',
  '  col = mix(col, uC3, uMix*smoothstep(0.35, 1.0, length(r)));',
  '  col += uC3*bump*0.12*uMix;',
  '  float vig = smoothstep(1.35, 0.2, length((vUv-0.5)*vec2(1.6,1.2)));',
  '  col = mix(col*0.93, col, vig);',
  '  gl_FragColor = vec4(col, 1.0);',
  '}'
].join('\n');

class Component extends DCLogic {
  constructor(props){
    super(props);
    const topExec = DATA.ejecutivos.reduce((best, e, idx) => (e.volumen_uf > DATA.ejecutivos[best].volumen_uf ? idx : best), 0);
    const rm = Math.max(0, DATA.regiones.findIndex(r => r.region === 'RM'));
    this.state = { i: 0, t: 1, cm: 'vol', execSel: topExec, regSel: rm, fHover: null, step: 0, intro: false, cur: false };
    this._tObj = { v: 1 };
    this._glInited = false;
    this._busy = false;
    this._mx = 0; this._my = 0;
  }
  componentDidMount(){
    this.initGL();
    this.applyGLTheme(this.state.i);
    const hasGsap = (typeof gsap !== 'undefined') && (typeof document !== 'undefined');
    if (hasGsap) {
      this.setState({ cur: true, intro: true });
      this._introTimer = setTimeout(() => this.runIntro(), 60);
    } else {
      this.runCounter();
    }
  }
  componentDidUpdate(prevProps, prevState){
    if (prevState && prevState.i !== this.state.i) this.applyGLTheme(this.state.i);
    if (prevState && prevState.cm !== this.state.cm && this._flipFrom) this.runFlip();
  }
  scheduleEntrance(){
    if (this._entranceTimer) clearTimeout(this._entranceTimer);
    this._entranceTimer = setTimeout(() => {
      this.applyGLTheme(this.state.i);
      this.runCounter();
      this.runEntrance();
    }, 30);
  }
  componentWillUnmount(){
    if (this._glRaf) cancelAnimationFrame(this._glRaf);
    if (this._onResize && typeof window !== 'undefined') window.removeEventListener('resize', this._onResize);
    if (this._gl && this._gl.renderer) { try { this._gl.renderer.dispose(); } catch(err){} }
    ['_ctween','_tl','_wtl','_itl'].forEach(k => { if (this[k]) this[k].kill(); });
    if (this._entranceTimer) clearTimeout(this._entranceTimer);
    if (this._introTimer) clearTimeout(this._introTimer);
  }

  /* ---------- Intro overlay (2.8s): kinetic questions → hero number → lift ---------- */
  runIntro(){
    const intro = (typeof document !== 'undefined') ? document.querySelector('.intro') : null;
    if (typeof gsap === 'undefined' || !intro) { this.afterIntro(); return; }
    const qs = intro.querySelectorAll('.iq');
    const big = intro.querySelector('.ibig-wrap');
    const bigNum = intro.querySelector('.ibig');
    const stripes = intro.querySelectorAll('.istripe');
    const cnt = { v: 0 };
    if (bigNum) bigNum.textContent = '0';
    this._itl = gsap.timeline({ onComplete: () => this.afterIntro() })
      .to(stripes, { scaleX: 1, duration: 0.7, ease: 'power3.out', stagger: 0.1 }, 0)
      .to(qs, { y: '0%', duration: 0.5, ease: 'power4.out', stagger: 0.055 }, 0.05)
      .to(qs, { y: '-115%', duration: 0.38, ease: 'power3.in', stagger: 0.04 }, 1.05)
      .to(stripes, { scaleX: 0, transformOrigin: 'right center', duration: 0.5, ease: 'power3.in' }, 1.2)
      .to(big, { opacity: 1, duration: 0.25 }, 1.45)
      .fromTo(bigNum, { scale: 0.72, filter: 'blur(14px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power4.out' }, 1.45)
      .to(cnt, { v: DATA.kpis.volumen_uf, duration: 0.85, ease: 'power3.out', onUpdate: () => { if (bigNum) bigNum.textContent = nf0(cnt.v); } }, 1.45)
      .to(intro, { yPercent: -100, duration: 0.7, ease: 'power4.inOut' }, 2.35);
  }
  afterIntro(){
    this.setState({ intro: false });
    this.scheduleEntrance();
  }

  /* ---------- Bonus layers (never gate visibility) ---------- */
  runCounter(){
    if (typeof gsap === 'undefined') { this.setState({ t: 1 }); return; }
    if (this._ctween) this._ctween.kill();
    this._tObj.v = 0;
    this.setState({ t: 0 });
    this._ctween = gsap.to(this._tObj, {
      v: 1, duration: 1.9, ease: 'power4.out',
      onUpdate: () => this.setState({ t: this._tObj.v }),
      onComplete: () => this.setState({ t: 1 })
    });
  }
  runEntrance(){
    if (typeof gsap === 'undefined' || typeof document === 'undefined') return;
    if (this._tl) this._tl.kill();
    const stageEl = document.querySelector('.stage');
    if (!stageEl) return;
    const slideEl = stageEl.querySelector('.slide');
    if (!slideEl) return;
    const words = slideEl.querySelectorAll('.word-mask > span');
    if (!words.length) return;
    this._tl = gsap.fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 0.95, ease: 'power4.out', stagger: 0.08, delay: 0.1 });
  }
  runFlip(){
    const from = this._flipFrom; this._flipFrom = null;
    if (typeof gsap === 'undefined' || typeof document === 'undefined' || !from) return;
    const rows = document.querySelectorAll('.flip-list [data-flip]');
    rows.forEach(row => {
      const key = row.getAttribute('data-flip');
      const oldTop = from[key];
      if (oldTop == null) return;
      const delta = oldTop - row.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      gsap.fromTo(row, { y: delta }, { y: 0, duration: 0.75, ease: 'power3.inOut', overwrite: 'auto' });
    });
  }

  /* ---------- WebGL fluid mesh-gradient background (Three.js ShaderMaterial) ---------- */
  initGL(){
    if (this._glInited || typeof THREE === 'undefined' || typeof document === 'undefined') return;
    const canvas = document.getElementById('glbg');
    if (!canvas) return;
    this._glInited = true;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'high-performance' }); }
    catch (err) { return; }
    renderer.setPixelRatio(1);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const th = GL_THEMES[THEMES[this.state.i] || ''] || GL_THEMES[''];
    const mk = hex => new THREE.Color(hex);
    const uniforms = {
      uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uRes: { value: new THREE.Vector2(1, 1) },
      uC1: { value: mk(th.c1) }, uC2: { value: mk(th.c2) }, uC3: { value: mk(th.c3) }, uMix: { value: th.mix }
    };
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    this._gl = { renderer, scene, camera, canvas, uniforms, target: { c1: mk(th.c1), c2: mk(th.c2), c3: mk(th.c3), mix: th.mix }, mouse: new THREE.Vector2(0.5, 0.5) };
    this.resizeGL();
    if (typeof window !== 'undefined') {
      this._onResize = () => this.resizeGL();
      window.addEventListener('resize', this._onResize);
    }
    const clock = new THREE.Clock();
    let last = 0;
    const loop = (now) => {
      const g = this._gl; if (!g) return;
      if (now - last < 31) { this._glRaf = requestAnimationFrame(loop); return; }
      last = now;
      const u = g.uniforms;
      const dt = Math.min(0.1, clock.getDelta());
      u.uTime.value += dt;
      const k = 1 - Math.exp(-dt * 3.2), km = 1 - Math.exp(-dt * 5);
      u.uC1.value.lerp(g.target.c1, k); u.uC2.value.lerp(g.target.c2, k); u.uC3.value.lerp(g.target.c3, k);
      u.uMix.value += (g.target.mix - u.uMix.value) * k;
      g.mouse.x += (((this._mx + 1) / 2) - g.mouse.x) * km;
      g.mouse.y += ((1 - (this._my + 1) / 2) - g.mouse.y) * km;
      u.uMouse.value.copy(g.mouse);
      renderer.render(scene, camera);
      this._glRaf = requestAnimationFrame(loop);
    };
    this._glRaf = requestAnimationFrame(loop);
  }
  applyGLTheme(i){
    if (!this._gl) return;
    const th = GL_THEMES[THEMES[i] || ''] || GL_THEMES[''];
    try { this._gl.target.c1.set(th.c1); this._gl.target.c2.set(th.c2); this._gl.target.c3.set(th.c3); this._gl.target.mix = th.mix; } catch (err) {}
  }
  resizeGL(){
    if (!this._gl) return;
    const { renderer, canvas, uniforms } = this._gl;
    const w = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const h = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);
    const f = Math.min(0.4, 560 / Math.max(1, w));
    const rw = Math.max(2, Math.round(w * f)), rh = Math.max(2, Math.round(h * f));
    renderer.setSize(rw, rh, false);
    uniforms.uRes.value.set(rw, rh);
  }

  /* ---------- Navigation: staggered curtain + content exit ---------- */
  goTo(i){
    const n = Math.max(0, Math.min(SLIDE_COUNT - 1, i));
    if (n === this.state.i || this._busy) return;
    const panes = (typeof document !== 'undefined') ? document.querySelectorAll('.curtain .cp') : null;
    if (typeof gsap === 'undefined' || !panes || !panes.length) {
      this.setState({ i: n, t: 1, step: 0, fHover: null });
      this.scheduleEntrance();
      return;
    }
    this._busy = true;
    const dir = n > this.state.i ? 1 : -1;
    const colors = isDarkTheme(n) ? ['#FFFFFF','#F6DCC9','#F2BFA3'] : ['#EC0000','#CC0000','#990000'];
    const slideEl = document.querySelector('.stage .slide');
    const exitEls = slideEl ? slideEl.querySelectorAll(':scope > *') : [];
    if (this._wtl) this._wtl.kill();
    this._wtl = gsap.timeline({ onComplete: () => { this._busy = false; } });
    if (exitEls.length) this._wtl.to(exitEls, { y: -22, opacity: 0, duration: 0.32, ease: 'power2.in', stagger: 0.045 }, 0);
    this._wtl
      .set(panes, { backgroundColor: (k) => colors[k], transformOrigin: dir > 0 ? 'top center' : 'bottom center', scaleY: 0, opacity: 1 }, 0)
      .to(panes, { scaleY: 1, duration: 0.5, ease: 'power4.inOut', stagger: { each: 0.08, from: dir > 0 ? 'start' : 'end' } }, 0.08)
      .add(() => { this.setState({ i: n, t: 1, step: 0, fHover: null }); this.scheduleEntrance(); })
      .set(panes, { transformOrigin: dir > 0 ? 'bottom center' : 'top center' })
      .to(panes, { scaleY: 0, duration: 0.55, ease: 'power4.inOut', stagger: { each: 0.08, from: dir > 0 ? 'start' : 'end' } }, '+=0.06')
      .set(panes, { opacity: 0 });
  }
  next(){
    const steps = STEP_SLIDES[this.state.i] || 0;
    if (this.state.step < steps) { this.setState({ step: this.state.step + 1 }); return; }
    this.goTo(this.state.i + 1);
  }
  prev(){ this.goTo(this.state.i - 1); }
  onWheel(e){
    if (this._wheelLock || this._busy) return;
    const dy = e.deltaY;
    if (Math.abs(dy) < 14) return;
    this._wheelLock = true;
    if (dy > 0) { this.next(); } else { this.prev(); }
    setTimeout(() => { this._wheelLock = false; }, 900);
  }
  toggleFullscreen(){
    if (typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) { document.exitFullscreen(); }
      else if (document.documentElement.requestFullscreen) { document.documentElement.requestFullscreen(); }
    } catch (err) {}
  }
  onMove(e){
    if (typeof window === 'undefined') return;
    const w = window.innerWidth || 1, h = window.innerHeight || 1;
    const nx = (e.clientX / w) * 2 - 1, ny = (e.clientY / h) * 2 - 1;
    this._mx = nx; this._my = ny;
    const target = e.target;
    if (this.state.fHover && !(target && target.closest && target.closest('.fh'))) this.setState({ fHover: null });
    if (typeof gsap === 'undefined' || this._moveRaf) return;
    const cx = e.clientX, cy = e.clientY;
    this._moveRaf = requestAnimationFrame(() => {
      this._moveRaf = null;
      try {
        const stage = document.querySelector('.stage');
        if (!stage) return;
        const sr = stage.getBoundingClientRect();
        // parallax
        gsap.to('.px', { x: nx * 10, y: ny * 6, duration: 1.1, ease: 'power2.out', overwrite: 'auto' });
        // custom cursor
        const lx = cx - sr.left, ly = cy - sr.top;
        const hot = !!(target && target.closest && target.closest('button, .pt, .rg, .hc, .fh, .reg-row, .ccard, .tilt'));
        stage.classList.toggle('cur-hot', hot);
        gsap.to('.cursor', { x: lx, y: ly, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
        gsap.to('.cursor-ring', { x: lx, y: ly, duration: 0.38, ease: 'power3.out', overwrite: 'auto' });
        // magnetic buttons
        stage.querySelectorAll('.mag').forEach(el => {
          const r = el.getBoundingClientRect();
          const dx = cx - (r.left + r.width/2), dy = cy - (r.top + r.height/2);
          const d = Math.hypot(dx, dy);
          const reach = Math.max(r.width, r.height) * 0.9 + 24;
          if (d < reach) { el._magOn = true; gsap.to(el, { x: dx * 0.28, y: dy * 0.28, scale: 1.04, duration: 0.4, ease: 'power3.out', overwrite: 'auto' }); }
          else if (el._magOn) { el._magOn = false; gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' }); }
        });
        // 3D tilt on tiles / cards
        const tiltEl = (target && target.closest) ? target.closest('.tilt') : null;
        if (this._tiltEl && this._tiltEl !== tiltEl) { gsap.to(this._tiltEl, { rotateX: 0, rotateY: 0, scale: 1, duration: 0.7, ease: 'power3.out', overwrite: 'auto' }); }
        this._tiltEl = tiltEl;
        if (tiltEl) {
          const r = tiltEl.getBoundingClientRect();
          const px = (cx - r.left) / r.width - 0.5, py = (cy - r.top) / r.height - 0.5;
          gsap.to(tiltEl, { rotateX: -py * 14, rotateY: px * 14, scale: 1.03, transformPerspective: 900, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
        }
      } catch (err) {}
    });
  }
  setMetric(m){
    if (this.state.cm === m) return;
    if (typeof document !== 'undefined') {
      const from = {};
      document.querySelectorAll('.flip-list [data-flip]').forEach(row => { from[row.getAttribute('data-flip')] = row.getBoundingClientRect().top; });
      this._flipFrom = from;
    }
    this.setState({ cm: m, t: 1 });
  }
  selectExec(idx){ if (this.state.execSel !== idx) this.setState({ execSel: idx }); }
  selectRegion(idx){ if (this.state.regSel !== idx) this.setState({ regSel: idx }); }
  hoverFunnel(label){ if (this.state.fHover !== label) this.setState({ fHover: label }); }
  et(){ return this.state.t; }

  renderVals(){
    const i = this.state.i;
    const et = this.et();
    const D = DATA;
    const self = this;
    const dark = isDarkTheme(i);
    const steps = STEP_SLIDES[i] || 0;
    const pending = this.state.step < steps;
    const veil = pending ? ' veiled' : '';

    const dots = Array.from({length: SLIDE_COUNT}, (_, idx) => ({
      idx, n: idx + 1, title: TITLES[idx], activeSuffix: idx === i ? ' active' : '',
      go: () => self.goTo(idx)
    }));

    // ---- Slide 0: hero
    const heroVal = nf0(D.kpis.volumen_uf * et);
    const heroWords = ['Cartera','Hipotecaria'].map(text => ({ text }));

    // ---- Slide 1: KPI tiles + sparklines
    const MK = D.mensual_kpi || {};
    const lastMes = D.mensual[D.mensual.length-1].mes;
    const kpiDefs = [
      { label: 'Operaciones cursadas', unit: '', value: D.kpis.operaciones, sk: 'ops', fmt: nf0, tu: 'op.' },
      { label: 'Volumen originado', unit: 'UF', value: D.kpis.volumen_uf, sk: 'vol', fmt: nf0, tu: 'UF' },
      { label: 'Ticket promedio', unit: 'UF', value: D.kpis.ticket_uf, sk: 'ticket', fmt: nf0, tu: 'UF', dec: 0 },
      { label: 'Tasa anual promedio', unit: '%', value: D.kpis.tasa, sk: 'tasa', fmt: nf2, tu: '%', dec: 2 },
      { label: 'LTV promedio', unit: '%', value: D.kpis.ltv, sk: 'ltv', fmt: nf1, tu: '%', dec: 1 },
      { label: 'DTI promedio', unit: '%', value: D.kpis.dti, sk: 'dti', fmt: nf1, tu: '%', dec: 1 },
      { label: 'Mora 30+', unit: '%', value: D.kpis.mora30, sk: 'mora', fmt: nf1, tu: '%', dec: 1, hot: true },
      { label: 'NPS promotores', unit: '%', value: D.kpis.nps_promotores, sk: 'nps_prom', fmt: nf1, tu: '%', dec: 1 },
      { label: 'CAC promedio', unit: 'UF', value: D.kpis.cac, sk: 'cac', fmt: nf2, tu: 'UF', dec: 2 },
      { label: 'Margen esperado', unit: '%', value: D.kpis.margen, sk: 'margen', fmt: nf2, tu: '%', dec: 2 },
    ];
    const kpiTiles = kpiDefs.map((k, idx) => {
      const series = MK[k.sk] || [];
      const sp = sparkPath(series);
      const last = series.length ? series[series.length-1] : null;
      return {
        label: k.label, unit: k.unit, delay: idx * 55, hotSuffix: k.hot ? ' hot' : '',
        value: (k.dec ? ( (k.value*et).toLocaleString('es-CL',{minimumFractionDigits:k.dec,maximumFractionDigits:k.dec}) ) : nf0(k.value*et)),
        sparkD: sp.d, sparkArea: sp.area, sparkX: sp.x, sparkY: sp.y,
        trend: last == null ? '' : ('serie mensual · ' + monthTick(lastMes).replace("'", "'") + ' ' + k.fmt(last) + (k.tu ? ' ' + k.tu : ''))
      };
    });

    // ---- Slide 2: donut funnel
    const FST = [
      { label:'Cursado', color: SRED, ink:'#fff' },
      { label:'Preaprobada', color: CORAL, ink:'#fff' },
      { label:'En evaluación', color: PEACH, ink: BLACK },
      { label:'Rechazada', color: BLACK, ink:'#fff' },
      { label:'Desistida', color: GRAY, ink:'#fff' },
    ];
    const fTotal = D.funnel_total;
    const CIRC = 2 * Math.PI * 72;
    const fHover = this.state.fHover;
    let acc = 0;
    const fSeg = FST.map((s, idx) => {
      const value = D.funnel_stages[s.label];
      const p = value / fTotal * 100;
      const len = (p/100) * CIRC * et;
      const start = acc; acc += (p/100) * CIRC;
      const gap = 3;
      const dash = Math.max(0, len - gap).toFixed(2) + ' ' + (CIRC - Math.max(0, len - gap)).toFixed(2);
      return { label: s.label, value, valueStr: nf0(value) + ' sol.', pct: p, pctStr: nf1(p) + '%', color: s.color, ink: s.ink, delay: idx * 120,
        dash, off: (-start).toFixed(2),
        arcSuffix: fHover ? (fHover === s.label ? ' lit' : ' dim') : '', litSuffix: fHover === s.label ? ' lit' : '',
        hov: () => self.hoverFunnel(s.label) };
    });
    const fh = fHover ? fSeg.find(s => s.label === fHover) : null;
    const donutCenter = fh ? fh.pctStr : nf1(D.funnel_conversion_global) + '%';
    const donutLabel = fh ? fh.label : 'conversión global';
    const funnelLegend = fSeg;
    const motivoEntries = Object.entries(D.motivos_no_conversion).sort((a,b)=>b[1]-a[1]);
    const motivoMax = maxOf(motivoEntries, x => x[1]);
    const motivoBars = motivoEntries.map(([label, value], idx) => ({ label, value, pct: (value / motivoMax) * 100 * et, delay: idx * 60 }));

    // ---- Slide 3: canales (metric selector + FLIP)
    const cm = this.state.cm;
    const metricDef = {
      vol:  { key: c => c.volumen_uf, unit: 'UF', fmt: nf0, note: 'Volumen originado en UF por canal de captación, cartera completa 2025–2026.' },
      ops:  { key: c => c.operaciones, unit: 'operaciones', fmt: nf0, note: 'Número de créditos cursados por canal de captación.' },
      mora: { key: c => c.mora30, unit: '% mora 30+', fmt: nf1, note: 'Mora 30+ observada por canal: Referido y Contact center muestran la mejor calidad relativa.' },
    }[cm];
    const canalSorted = [...D.canales].sort((a,b)=>metricDef.key(b) - metricDef.key(a));
    const canalMaxV = maxOf(canalSorted, metricDef.key);
    const canalBars = canalSorted.map((c, idx) => ({
      key: c.canal.replace(/[^A-Za-z0-9]/g, ''), label: c.canal, pct: (metricDef.key(c) / canalMaxV) * 100 * et, valueStr: metricDef.fmt(metricDef.key(c)), unit: metricDef.unit,
      color: (cm === 'mora' && idx === 0) ? 'var(--emph)' : 'var(--accent)', delay: idx * 70
    }));
    const canalByConv = [...D.canales].sort((a,b)=>b.conversion - a.conversion);
    const canalConvBars = canalByConv.map((c, idx) => ({
      label: c.canal, pct: c.conversion * et, pctStr: nf1(c.conversion) + '%', cacStr: nf2(c.cac) + ' UF', color: 'var(--emph)', delay: idx * 70
    }));

    // ---- Slide 4: segmentos + riesgo
    const segByVol = [...D.segmentos].sort((a,b)=>b.volumen_uf - a.volumen_uf);
    const segMax = maxOf(segByVol, s => s.volumen_uf);
    const segBars = segByVol.map((s, idx) => ({
      label: s.segmento, pct: (s.volumen_uf / segMax) * 100 * et, shareStr: nf1(s.share_volumen) + '%', moraStr: nf1(s.mora30) + '%',
      color: s.segmento === 'Universitario' ? 'var(--emph)' : 'var(--accent)', delay: idx * 80
    }));
    const riskOrder = ['Bajo','Medio','Alto'];
    const riskMax = maxOf(D.clasificacion_riesgo, r => r.mora30);
    const riskBars = riskOrder.map((label, idx) => {
      const r = D.clasificacion_riesgo.find(x => x.clasificacion === label);
      return { label, pct: (r.mora30 / riskMax) * 100 * et, moraStr: nf1(r.mora30) + '%', color: label === 'Alto' ? 'var(--emph)' : 'var(--accent)', delay: idx * 110 };
    });

    // ---- Slide 5: NPS por canal
    const canalNps = [...D.nps_canal].sort((a,b)=>b.nps-a.nps);
    const npsBars = canalNps.map((c, idx) => ({ label: c.canal, pct: (c.nps/10)*100*et, valueStr: nf2(c.nps), delay: idx*80 }));
    const npsMin = nf1(minOf(canalNps, c=>c.nps));
    const npsMax = nf1(maxOf(canalNps, c=>c.nps));

    // ---- Slide 6: mensual
    const volMax = maxOf(D.mensual, m => m.volumen_uf);
    const monthCols = D.mensual.map((m, idx) => ({
      pct: (m.volumen_uf/volMax)*100*et, delay: idx*34, tick: (idx % 2 === 0 ? monthTick(m.mes) : ''),
      color: m.mes.startsWith('2026') ? PEACH : SRED, tipStr: monthLong(m.mes) + ' · ' + nf0(m.volumen_uf) + ' UF · ' + m.operaciones + ' op.'
    }));
    const moraMax = maxOf(D.mensual, m => m.mora30);
    const W = 1000, H = 70, PAD = 8;
    const moraPoints = D.mensual.map((m, idx) => {
      const x = PAD + (idx/(D.mensual.length-1)) * (W-2*PAD);
      const y = H - PAD - (m.mora30/moraMax) * (H-2*PAD) * et;
      return { x: x.toFixed(1), y: y.toFixed(1), delay: 200 + idx * 55 };
    });
    const moraLineD = moraPoints.map((p,idx) => (idx===0?'M':'L') + p.x + ',' + p.y).join(' ');
    const moraAreaD = moraLineD + ' L' + moraPoints[moraPoints.length-1].x + ',' + (H-PAD) + ' L' + moraPoints[0].x + ',' + (H-PAD) + ' Z';
    const moraBaseY = (H-PAD).toFixed(1);

    // ---- Slide 7: choropleth + ranking + tipo vivienda
    const regSel = this.state.regSel;
    const sig = D.regiones.filter(r => r.operaciones >= 10);
    const mapMin = minOf(sig, r => r.mora30), mapMax = maxOf(sig, r => r.mora30);
    const regFill = (r) => r.operaciones < 10 ? '#D9D3CF' : rampColor((r.mora30 - mapMin) / ((mapMax - mapMin) || 1));
    const paths = (D.map && D.map.paths) || {};
    const cents = (D.map && D.map.centroids) || {};
    const mapRegions = D.regiones.map((r, idx) => ({
      d: paths[r.region] || '', fill: regFill(r), selSuffix: idx === regSel ? ' sel' : '', delay: 80 + idx * 45,
      sel: () => self.selectRegion(idx)
    })).filter(r => r.d);
    const rs = D.regiones[regSel] || D.regiones[0];
    const rc = cents[rs.region] || [100, 500];
    const mapSelX = rc[1].toFixed(1), mapSelYn = 200 - rc[0];
    const mapSelY = mapSelYn.toFixed(1);
    const mapSelLabelY = (mapSelYn < 40 ? mapSelYn + 24 : mapSelYn - 14).toFixed(1);
    const regByVol = [...D.regiones].map((r, idx) => ({ r, idx })).sort((a,b)=>b.r.volumen_uf - a.r.volumen_uf);
    const regMax = maxOf(regByVol, o => o.r.volumen_uf);
    const regionBars = regByVol.map((o, k) => ({
      rank: k + 1, label: o.r.region, pct: (o.r.volumen_uf/regMax)*100*et, valueStr: nf0(o.r.volumen_uf), moraStr: nf1(o.r.mora30)+'%', delay: k*34,
      color: regFill(o.r), selSuffix: o.idx === regSel ? ' sel' : '', sel: () => self.selectRegion(o.idx)
    }));
    const regSelRank = (regByVol.findIndex(o => o.idx === regSel) + 1) + '.ª por volumen';
    const GAUGE_MAX = 25;
    const tipoRows = [...D.tipo_vivienda].sort((a,b)=>b.volumen_uf-a.volumen_uf).map(t => ({
      label: t.tipo_vivienda, ltv: nf1(t.ltv)+'%', dti: nf1(t.dti)+'%', tasa: nf2(t.tasa)+'%', mora: nf1(t.mora30)+'%'
    }));

    // ---- Slide 8: ejecutivos scatter (interactive)
    const execVolMax = maxOf(D.ejecutivos, e => e.volumen_uf);
    const execVolMin = minOf(D.ejecutivos, e => e.volumen_uf);
    const execMoraMax = maxOf(D.ejecutivos, e => e.mora30);
    const execMoraMin = minOf(D.ejecutivos, e => e.mora30);
    const execVolMedian = D.ejecutivos.map(e=>e.volumen_uf).sort((a,b)=>a-b)[Math.floor(D.ejecutivos.length/2)];
    const portfolioMora = D.kpis.mora30;
    const PX0 = 70, PX1 = 520, PY0 = 30, PY1 = 320;
    const execSel = this.state.execSel;
    const execPoints = D.ejecutivos.map((e, idx) => {
      const vx = (e.volumen_uf - execVolMin) / (execVolMax - execVolMin || 1);
      const my = (e.mora30 - execMoraMin) / (execMoraMax - execMoraMin || 1);
      const x = PX0 + vx * (PX1-PX0);
      const y = PY1 - my * (PY1-PY0);
      let color = PEACH;
      if (e.volumen_uf >= execVolMedian && e.mora30 <= portfolioMora) color = BLACK;
      else if (e.mora30 > execMoraMin + (execMoraMax-execMoraMin)*0.75) color = SRED;
      const r = 7 + vx*5;
      return { x: x.toFixed(1), y: y.toFixed(1), r: r.toFixed(1), rh: (r + 6).toFixed(1), ly: (y - r - 9).toFixed(1), color, delay: 120 + idx*40,
        label: e.ejecutivo, selSuffix: idx === execSel ? ' sel' : '', sel: () => self.selectExec(idx) };
    });
    const execMedXNum = PX0 + ((execVolMedian-execVolMin)/(execVolMax-execVolMin||1))*(PX1-PX0);
    const execMedYNum = PY1 - ((portfolioMora-execMoraMin)/(execMoraMax-execMoraMin||1))*(PY1-PY0);
    const execMedX = execMedXNum.toFixed(1), execMedY = execMedYNum.toFixed(1);
    const execQuadW = (540 - execMedXNum).toFixed(1), execQuadH = (330 - execMedYNum).toFixed(1);
    const execMedYLabel = (execMedYNum - 5).toFixed(1);
    const execTop = [...D.ejecutivos].map((e, idx) => ({ e, idx })).sort((a,b)=>b.e.volumen_uf-a.e.volumen_uf).slice(0,3).map((o,k)=>({
      label: o.e.ejecutivo, pct: (o.e.volumen_uf/execVolMax)*100*et, valueStr: nf0(o.e.volumen_uf), moraStr: nf1(o.e.mora30)+'%', delay: k*90,
      sel: () => self.selectExec(o.idx)
    }));
    const es = D.ejecutivos[execSel] || D.ejecutivos[0];
    const execSelTag = (es.volumen_uf >= execVolMedian && es.mora30 <= portfolioMora) ? 'alto desempeño' : (es.mora30 > execMoraMin + (execMoraMax-execMoraMin)*0.75 ? 'foco de atención' : 'resto de la fuerza');

    // ---- Slide 9: cohortes (columns) + heatmap segmento × cosecha
    const cohMoraMax = maxOf(D.cohortes, c => c.mora30);
    const cohMoraMin = minOf(D.cohortes, c => c.mora30);
    const cohortCols = D.cohortes.map((c, idx) => {
      const tnorm = (c.mora30 - cohMoraMin) / ((cohMoraMax - cohMoraMin) || 1);
      return {
        pct: Math.max(4, (c.mora30/cohMoraMax)*100) * et, delay: idx*34, tick: (idx % 2 === 0 ? monthTick(c.cohorte) : ''),
        color: lerpColor('#5C0000', '#F2BFA3', 1 - tnorm), tipStr: monthLong(c.cohorte) + ' · mora ' + nf1(c.mora30) + '% · ' + c.operaciones + ' op.'
      };
    });
    const CH = D.cohort_heat || { segmentos: [], meses: [], rows: [] };
    const HEAT_MAX = 35;
    const heatCells = [];
    CH.rows.forEach((row, ri) => {
      heatCells.push({ isLabel: true, isCell: false, label: row.segmento, color: '', tipStr: '', emptySuffix: '', delay: 0 });
      row.cells.forEach((cell, ci) => {
        const n = cell[0], mora = cell[1];
        const empty = !n || mora == null;
        heatCells.push({
          isLabel: false, isCell: true, label: '',
          color: empty ? 'repeating-linear-gradient(45deg, var(--track) 0 4px, transparent 4px 8px)' : rampColor(Math.min(1, mora / HEAT_MAX)),
          emptySuffix: empty ? ' empty' : '',
          tipStr: row.segmento + ' · ' + monthLong(CH.meses[ci]) + (empty ? ' · sin operaciones' : ' · mora ' + nf1(mora) + '% · ' + n + ' op.'),
          delay: 150 + ci * 28 + ri * 55
        });
      });
    });
    const heatTicks = CH.meses.map((m, idx) => ({ tick: idx % 2 === 0 ? monthTick(m) : '' }));

    // ---- Slide 10: stress dumbbells
    const S = D.stress;
    const dScale = (v, lo, hi) => 70 + ((v-lo)/(hi-lo)) * 460;
    const dumbbells = [
      { label: 'Tasa anual (%)', y: 40, v1: nf2(S.tasa_prom), v2: nf2(S.tasa_stress_prom), delay: 300,
        x1: dScale(S.tasa_prom, 3, 8), x2: dScale(S.tasa_stress_prom, 3, 8) * et + dScale(S.tasa_prom,3,8)*(1-et) },
      { label: 'Dividendo (UF)', y: 110, v1: nf1(S.dividendo_prom), v2: nf1(S.dividendo_stress_prom), delay: 420,
        x1: dScale(S.dividendo_prom, 30, 80), x2: dScale(S.dividendo_stress_prom, 30, 80) * et + dScale(S.dividendo_prom,30,80)*(1-et) },
      { label: 'DTI (%)', y: 180, v1: nf1(S.dti_prom), v2: nf1(S.dti_stress_prom), delay: 540,
        x1: dScale(S.dti_prom, 20, 60), x2: dScale(S.dti_stress_prom, 20, 60) * et + dScale(S.dti_prom,20,60)*(1-et) },
    ];
    const dtiAltoActual = nf1(S.alto_dti_actual_pct * et);
    const dtiAltoStress = nf1(S.alto_dti_stress_pct * et);
    const divDelta = nf1(S.dividendo_delta_pct * et);

    // ---- Slide 11: conclusions (each card jumps back to its slide)
    const concl = [
      { n:'P1', title:'Canales', text:'Sucursal lidera volumen; Referido es el canal más eficiente (menor CAC, buena calidad).', s:3 },
      { n:'P2', title:'Segmentos', text:'Personas y Select concentran volumen con la mejor calidad; Universitario y Private Banking concentran la mora. El score de riesgo declarado no predice bien la mora real.', s:4 },
      { n:'P3', title:'Experiencia', text:'NPS y satisfacción son estables entre canales, regiones y segmentos — el crecimiento no erosionó la experiencia.', s:5 },
      { n:'P4', title:'Geografía', text:'RM concentra ~29% del volumen con mora bajo el promedio; regiones pequeñas no son estadísticamente representativas.', s:7 },
      { n:'P5', title:'Ejecutivos', text:'Los líderes en volumen también mantienen mora bajo el promedio — la productividad no compite con la calidad.', s:8 },
      { n:'P6', title:'Cosechas', text:'La mora cae en 2026 por antigüedad insuficiente (seasoning), no por mejor calidad de originación.', s:9 },
      { n:'P7', title:'Sensibilidad', text:'+2pp de tasa eleva la proporción de clientes con DTI comprometido de 36,6% a 58,8% — mucho más que el 19% que sube el dividendo.', s:10 },
    ];
    const conclusions = concl.map((c, idx) => ({ ...c, delay: idx*70, go: () => self.goTo(c.s) }));

    return {
      i, iStr: String(i+1).padStart(2,'0'), totalStr: String(SLIDE_COUNT).padStart(2,'0'),
      themeClass: THEMES[i] || '', dark, cursorClass: this.state.cur ? ' has-cursor' : '',
      progressPct: ((i+1)/SLIDE_COUNT*100).toFixed(2),
      navPrevOpacity: i === 0 ? '0' : '1', navNextOpacity: i === SLIDE_COUNT-1 ? '0' : '1',
      nextLabel: i === 0 ? 'Empezar' : (pending ? 'Revelar lectura' : 'Siguiente'), nextCls: pending ? ' reveal' : '',
      veil,
      goPrevFn: () => self.prev(), goNextFn: () => self.next(), wheelFn: (e) => self.onWheel(e), moveFn: (e) => self.onMove(e), fsFn: () => self.toggleFullscreen(),
      dots,
      s0:i===0, s1:i===1, s2:i===2, s3:i===3, s4:i===4, s5:i===5, s6:i===6, s7:i===7, s8:i===8, s9:i===9, s10:i===10, s11:i===11,
      intro: this.state.intro, introQs: INTRO_QS.map(text => ({ text })), introBig: nf0(D.kpis.volumen_uf),

      heroVal, heroWords, kpiOps: nf0(D.kpis.operaciones), kpiSegCount: D.segmentos.length, kpiRegCount: D.regiones.length, kpiCanalCount: D.canales.length,
      kpiMoraStr: nf1(D.kpis.mora30), kpiTasaStr: nf2(D.kpis.tasa), kpiNpsStr: nf1(D.kpis.nps_promotores),
      kpiTiles,

      funnelTotal: nf0(fTotal), funnelCursado: nf0(D.funnel_stages['Cursado']), funnelConv: nf1(D.funnel_conversion_global),
      funnelSegments: fSeg, funnelLegend, motivoBars, donutCenter, donutLabel,
      diasDecision: nf1(D.dias_hasta_decision_prom), costoLead: nf2(D.costo_lead_prom),

      canalBars, canalConvBars, canalMetricNote: metricDef.note,
      cmVolActive: cm === 'vol' ? ' active' : '', cmOpsActive: cm === 'ops' ? ' active' : '', cmMoraActive: cm === 'mora' ? ' active' : '',
      setCmVol: () => self.setMetric('vol'), setCmOps: () => self.setMetric('ops'), setCmMora: () => self.setMetric('mora'),

      segBars, riskBars,

      npsBars, npsMin, npsMax, npsNeto: nf1(D.kpis.nps_neto), npsProm: nf1(D.kpis.nps_promotores),

      monthCols, moraLineD, moraAreaD, moraBaseY, moraPoints,

      mapRegions, mapSelX, mapSelY, mapSelLabelY, mapSelName: rs.region, mapMinStr: nf1(mapMin) + '%', mapMaxStr: nf1(mapMax) + '%',
      regionBars, tipoRows, regSelRank,
      regSelName: rs.region, regSelVol: nf0(rs.volumen_uf), regSelOps: nf0(rs.operaciones), regSelNps: nf2(rs.nps), regSelLtv: nf1(rs.ltv) + '%', regSelDti: nf1(rs.dti) + '%',
      regSelMora: nf1(rs.mora30) + '%', regSelGauge: Math.min(100, rs.mora30 / GAUGE_MAX * 100 * et).toFixed(1), mapAvgGauge: (D.kpis.mora30 / GAUGE_MAX * 100).toFixed(1), mapGaugeMaxStr: GAUGE_MAX + '%',

      execPoints, execMedX, execMedY, execQuadW, execQuadH, execMedYLabel, execTop,
      execSelName: es.ejecutivo, execSelVol: nf0(es.volumen_uf), execSelOps: nf0(es.operaciones), execSelMora: nf1(es.mora30) + '%', execSelNps: nf2(es.nps), execSelTag,

      cohortCols, heatCells, heatTicks,

      dumbbells, dtiAltoActual, dtiAltoStress, divDelta,
      divActual: nf1(S.dividendo_prom), divStress: nf1(S.dividendo_stress_prom),

      conclusions,
    };
  }
}
