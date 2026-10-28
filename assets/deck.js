
/* ---------- Minimal runtime that mirrors the canvas component model ---------- */
const TPL = document.getElementById('tpl').textContent;
const ROOT = document.getElementById('app');
const EVENT_ATTR = /\son([A-Z]\w*)="\{\{([\w.$]+)\}\}"/g;
const HOLE = /\{\{([\w.$]+)\}\}/g;
function esc(v){ return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function resolve(path, scopes){
  const parts = path.split('.');
  for (let s = scopes.length - 1; s >= 0; s--) {
    if (parts[0] in scopes[s]) { let v = scopes[s][parts[0]]; for (let k = 1; k < parts.length && v != null; k++) v = v[parts[k]]; return v; }
  }
  return undefined;
}
function findClose(tpl, from, tag){
  let depth = 1, i = from;
  const open = '<' + tag, close = '</' + tag + '>';
  while (depth > 0) {
    const o = tpl.indexOf(open, i), c = tpl.indexOf(close, i);
    if (c < 0) throw new Error('unclosed ' + tag);
    if (o >= 0 && o < c) { depth++; i = o + open.length; } else { depth--; i = c + close.length; if (depth === 0) return [c, i]; }
  }
}
function interpolate(text, scopes, handlers){
  text = text.replace(EVENT_ATTR, (m, ev, path) => {
    const fn = resolve(path, scopes);
    if (typeof fn !== 'function') return '';
    const id = handlers.length; handlers.push(fn);
    return ' data-ev-' + ev.toLowerCase() + '="' + id + '"';
  });
  return text.replace(HOLE, (m, path) => { const v = resolve(path, scopes); return v == null ? '' : esc(v); });
}
function renderTpl(tpl, scopes, handlers){
  let out = '', pos = 0;
  const re = /<(sc-for|sc-if)\b([^>]*)>/g;
  re.lastIndex = 0;
  while (true) {
    re.lastIndex = pos;
    const m = re.exec(tpl);
    if (!m) { out += interpolate(tpl.slice(pos), scopes, handlers); break; }
    out += interpolate(tpl.slice(pos, m.index), scopes, handlers);
    const tag = m[1], attrs = m[2];
    const [closeAt, after] = findClose(tpl, m.index + m[0].length, tag);
    const inner = tpl.slice(m.index + m[0].length, closeAt);
    if (tag === 'sc-for') {
      const list = resolve(/list="\{\{([\w.$]+)\}\}"/.exec(attrs)[1], scopes) || [];
      const as = /as="(\w+)"/.exec(attrs)[1];
      for (const item of list) out += renderTpl(inner, scopes.concat([{ [as]: item }]), handlers);
    } else {
      const v = resolve(/value="\{\{([\w.$]+)\}\}"/.exec(attrs)[1], scopes);
      if (v) out += renderTpl(inner, scopes, handlers);
    }
    pos = after;
  }
  return out;
}
class MiniLogic {
  constructor(props){ this.props = props || {}; this.state = {}; this._handlers = []; this._mounted = false; }
  setState(patch){
    this._prevState = this._prevState || Object.assign({}, this.state);
    Object.assign(this.state, patch);
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._render(); });
  }
  _render(){
    const prev = this._prevState || Object.assign({}, this.state);
    this._prevState = null;
    const handlers = [];
    const html = renderTpl(TPL, [this.renderVals()], handlers);
    this._handlers = handlers;
    if (!this._mounted) { ROOT.innerHTML = html; this._bindDelegates(); this._mounted = true; this.componentDidMount && this.componentDidMount(); this._prevState = null; return; }
    const next = document.createElement('div'); next.innerHTML = html;
    morphdom(ROOT, next, {
      childrenOnly: true,
      getNodeKey: n => (n.getAttribute && (n.getAttribute('data-key') || n.id)) || undefined,
      onBeforeElUpdated: (from, to) => {
        if (from.id === 'glbg') return false;
        if (from.isEqualNode(to)) return false;
        const keep = from.classList && (from.classList.contains('px') || from.classList.contains('wipe') || (from.parentElement && from.parentElement.classList.contains('word-mask')));
        if (keep && from.getAttribute('style')) to.setAttribute('style', from.getAttribute('style'));
        return true;
      }
    });
    this.componentDidUpdate && this.componentDidUpdate(this.props, prev);
  }
  _bindDelegates(){
    const self = this;
    const dispatch = (ev, attr) => {
      let el = ev.target;
      while (el && el !== ROOT) {
        if (el.getAttribute && el.hasAttribute(attr)) { const fn = self._handlers[+el.getAttribute(attr)]; if (fn) fn(ev); return; }
        el = el.parentElement;
      }
    };
    ROOT.addEventListener('click', ev => dispatch(ev, 'data-ev-click'));
    ROOT.addEventListener('wheel', ev => dispatch(ev, 'data-ev-wheel'), { passive: true });
    ROOT.addEventListener('mousemove', ev => dispatch(ev, 'data-ev-mousemove'));
  }
}


const DATA = {"kpis":{"operaciones":1850,"volumen_uf":16646637,"ticket_uf":8998.2,"tasa":4.77,"ltv":77.5,"dti":36.8,"mora30":16.2,"nps_promotores":42.4,"nps_neto":21.5,"cac":18.16,"margen":0.75,"satisfaccion":4.52,"edad_prom":47.8,"satisf_nuevo":4.52,"satisf_recurrente":4.51},"canales":[{"canal":"Sucursal","operaciones":546,"volumen_uf":5024962,"mora30":17.0,"cac":17.63,"margen":0.74,"solicitudes":685,"conversion":79.7,"costo_lead":7.07,"dias_decision":20.8},{"canal":"Web","operaciones":373,"volumen_uf":3404270,"mora30":17.2,"cac":17.72,"margen":0.77,"solicitudes":504,"conversion":74.0,"costo_lead":7.09,"dias_decision":21.81},{"canal":"App móvil","operaciones":244,"volumen_uf":2136505,"mora30":16.4,"cac":17.76,"margen":0.75,"solicitudes":362,"conversion":67.4,"costo_lead":6.88,"dias_decision":21.68},{"canal":"Corredora inmobiliaria","operaciones":236,"volumen_uf":2128883,"mora30":16.5,"cac":22.84,"margen":0.77,"solicitudes":379,"conversion":62.3,"costo_lead":8.11,"dias_decision":22.33},{"canal":"Alianza empresa","operaciones":166,"volumen_uf":1539814,"mora30":14.5,"cac":17.31,"margen":0.72,"solicitudes":302,"conversion":55.0,"costo_lead":6.9,"dias_decision":22.54},{"canal":"Referido","operaciones":174,"volumen_uf":1456074,"mora30":13.8,"cac":11.9,"margen":0.76,"solicitudes":313,"conversion":55.6,"costo_lead":5.33,"dias_decision":22.25},{"canal":"Contact center","operaciones":111,"volumen_uf":956129,"mora30":13.5,"cac":24.33,"margen":0.74,"solicitudes":255,"conversion":43.5,"costo_lead":7.98,"dias_decision":24.43}],"funnel_stages":{"Cursado":1850,"Desistida":318,"Rechazada":292,"En evaluación":194,"Preaprobada":146},"funnel_total":2800,"funnel_conversion_global":66.1,"motivos_no_conversion":{"Cambio de decisión":87,"Oferta competencia":86,"Historial crediticio":85,"Tasa no competitiva":77,"Propiedad no elegible":70,"Capacidad de pago":70,"Demora del proceso":68,"Documentación incompleta":67},"dias_hasta_decision_prom":22.0,"costo_lead_prom":7.06,"segmentos":[{"segmento":"Personas","operaciones":491,"volumen_uf":4407939,"mora30":13.8,"margen":0.73,"ltv":76.4,"dti":37.68,"ticket":8977.47,"share_volumen":26.5},{"segmento":"Select","operaciones":432,"volumen_uf":3716684,"mora30":15.0,"margen":0.75,"ltv":77.29,"dti":36.45,"ticket":8603.44,"share_volumen":22.3},{"segmento":"Universitario","operaciones":322,"volumen_uf":2955340,"mora30":18.3,"margen":0.78,"ltv":78.84,"dti":36.81,"ticket":9178.07,"share_volumen":17.8},{"segmento":"Private Banking","operaciones":309,"volumen_uf":2849258,"mora30":18.1,"margen":0.74,"ltv":78.72,"dti":37.04,"ticket":9220.9,"share_volumen":17.1},{"segmento":"Pyme","operaciones":296,"volumen_uf":2717416,"mora30":17.2,"margen":0.76,"ltv":76.66,"dti":35.52,"ticket":9180.46,"share_volumen":16.3}],"mensual":[{"mes":"2025-01","operaciones":120,"volumen_uf":1120040,"mora30":17.5,"nps":7.84,"satisf":4.47,"margen":0.78},{"mes":"2025-02","operaciones":118,"volumen_uf":1129724,"mora30":21.2,"nps":7.86,"satisf":4.53,"margen":0.78},{"mes":"2025-03","operaciones":112,"volumen_uf":1006717,"mora30":25.0,"nps":7.68,"satisf":4.47,"margen":0.78},{"mes":"2025-04","operaciones":131,"volumen_uf":1263972,"mora30":13.0,"nps":7.89,"satisf":4.47,"margen":0.77},{"mes":"2025-05","operaciones":147,"volumen_uf":1367081,"mora30":19.0,"nps":8.01,"satisf":4.61,"margen":0.79},{"mes":"2025-06","operaciones":144,"volumen_uf":1322273,"mora30":16.0,"nps":7.83,"satisf":4.48,"margen":0.69},{"mes":"2025-07","operaciones":144,"volumen_uf":1461575,"mora30":21.5,"nps":7.98,"satisf":4.52,"margen":0.73},{"mes":"2025-08","operaciones":153,"volumen_uf":1298263,"mora30":15.0,"nps":7.93,"satisf":4.52,"margen":0.77},{"mes":"2025-09","operaciones":133,"volumen_uf":1217925,"mora30":15.0,"nps":7.8,"satisf":4.45,"margen":0.75},{"mes":"2025-10","operaciones":114,"volumen_uf":1076753,"mora30":20.2,"nps":7.6,"satisf":4.37,"margen":0.72},{"mes":"2025-11","operaciones":125,"volumen_uf":1153745,"mora30":19.2,"nps":7.91,"satisf":4.55,"margen":0.76},{"mes":"2025-12","operaciones":120,"volumen_uf":1087804,"mora30":17.5,"nps":8.06,"satisf":4.57,"margen":0.72},{"mes":"2026-01","operaciones":23,"volumen_uf":143205,"mora30":4.3,"nps":8.39,"satisf":4.7,"margen":0.7},{"mes":"2026-02","operaciones":29,"volumen_uf":218617,"mora30":13.8,"nps":7.97,"satisf":4.55,"margen":0.69},{"mes":"2026-03","operaciones":29,"volumen_uf":216704,"mora30":6.9,"nps":7.62,"satisf":4.41,"margen":0.64},{"mes":"2026-04","operaciones":27,"volumen_uf":231452,"mora30":0.0,"nps":8.56,"satisf":4.78,"margen":0.92},{"mes":"2026-05","operaciones":31,"volumen_uf":242375,"mora30":3.2,"nps":8.61,"satisf":4.74,"margen":0.7},{"mes":"2026-06","operaciones":25,"volumen_uf":154525,"mora30":4.0,"nps":8.24,"satisf":4.64,"margen":0.77},{"mes":"2026-07","operaciones":37,"volumen_uf":229213,"mora30":8.1,"nps":7.62,"satisf":4.32,"margen":0.83},{"mes":"2026-08","operaciones":33,"volumen_uf":251942,"mora30":3.0,"nps":8.18,"satisf":4.55,"margen":0.72},{"mes":"2026-09","operaciones":29,"volumen_uf":236225,"mora30":6.9,"nps":8.03,"satisf":4.55,"margen":0.63},{"mes":"2026-10","operaciones":26,"volumen_uf":216507,"mora30":0.0,"nps":8.38,"satisf":4.73,"margen":0.84}],"regiones":[{"region":"RM","operaciones":551,"volumen_uf":4801205,"mora30":15.2,"nps":8.0,"satisf":4.55,"ltv":77.39,"dti":36.27,"tasa":4.75},{"region":"Valparaíso","operaciones":193,"volumen_uf":1819952,"mora30":17.1,"nps":7.98,"satisf":4.54,"ltv":77.82,"dti":36.58,"tasa":4.8},{"region":"Biobío","operaciones":166,"volumen_uf":1470760,"mora30":13.3,"nps":7.64,"satisf":4.43,"ltv":76.93,"dti":36.75,"tasa":4.76},{"region":"Los Lagos","operaciones":107,"volumen_uf":1015978,"mora30":16.8,"nps":7.82,"satisf":4.49,"ltv":75.7,"dti":37.83,"tasa":4.77},{"region":"Coquimbo","operaciones":111,"volumen_uf":939977,"mora30":16.2,"nps":8.12,"satisf":4.62,"ltv":77.34,"dti":34.18,"tasa":4.8},{"region":"Antofagasta","operaciones":107,"volumen_uf":911256,"mora30":18.7,"nps":8.14,"satisf":4.59,"ltv":77.34,"dti":38.39,"tasa":4.77},{"region":"Araucanía","operaciones":90,"volumen_uf":845322,"mora30":17.8,"nps":8.02,"satisf":4.5,"ltv":75.56,"dti":37.75,"tasa":4.7},{"region":"Los Ríos","operaciones":82,"volumen_uf":793580,"mora30":17.1,"nps":7.91,"satisf":4.54,"ltv":77.8,"dti":39.86,"tasa":4.83},{"region":"Maule","operaciones":84,"volumen_uf":760102,"mora30":13.1,"nps":7.7,"satisf":4.43,"ltv":78.81,"dti":37.36,"tasa":4.75},{"region":"O'Higgins","operaciones":80,"volumen_uf":749394,"mora30":20.0,"nps":8.0,"satisf":4.5,"ltv":76.31,"dti":36.47,"tasa":4.78},{"region":"Tarapacá","operaciones":80,"volumen_uf":747636,"mora30":18.8,"nps":7.46,"satisf":4.38,"ltv":80.19,"dti":37.92,"tasa":4.81},{"region":"Arica y Parinacota","operaciones":67,"volumen_uf":618892,"mora30":16.4,"nps":8.04,"satisf":4.57,"ltv":78.66,"dti":33.19,"tasa":4.8},{"region":"Atacama","operaciones":63,"volumen_uf":578257,"mora30":17.5,"nps":7.7,"satisf":4.43,"ltv":78.57,"dti":37.06,"tasa":4.72},{"region":"Ñuble","operaciones":62,"volumen_uf":534350,"mora30":14.5,"nps":7.74,"satisf":4.44,"ltv":78.23,"dti":37.39,"tasa":4.73},{"region":"Magallanes","operaciones":4,"volumen_uf":41968,"mora30":0.0,"nps":9.0,"satisf":5.0,"ltv":78.75,"dti":56.29,"tasa":4.82},{"region":"Aysén","operaciones":3,"volumen_uf":18008,"mora30":33.3,"nps":7.0,"satisf":4.0,"ltv":68.33,"dti":34.19,"tasa":4.2}],"tipo_vivienda":[{"tipo_vivienda":"Departamento usado","operaciones":489,"volumen_uf":4457095,"ltv":77.26,"dti":36.96,"tasa":4.76,"mora30":15.5},{"tipo_vivienda":"Departamento nuevo","operaciones":462,"volumen_uf":4216266,"ltv":77.41,"dti":36.62,"tasa":4.76,"mora30":17.3},{"tipo_vivienda":"Casa nueva","operaciones":448,"volumen_uf":4143297,"ltv":78.05,"dti":37.19,"tasa":4.77,"mora30":17.2},{"tipo_vivienda":"Casa usada","operaciones":451,"volumen_uf":3829979,"ltv":77.14,"dti":36.38,"tasa":4.78,"mora30":14.6}],"ejecutivos":[{"ejecutivo":"A. Rojas","operaciones":153,"volumen_uf":1363048,"mora30":15.0,"margen":0.72,"nps":7.95},{"ejecutivo":"G. Herrera","operaciones":142,"volumen_uf":1221305,"mora30":12.7,"margen":0.7,"nps":7.95},{"ejecutivo":"L. Muñoz","operaciones":138,"volumen_uf":1206798,"mora30":13.8,"margen":0.76,"nps":8.16},{"ejecutivo":"T. Núñez","operaciones":134,"volumen_uf":1164058,"mora30":10.4,"margen":0.74,"nps":8.1},{"ejecutivo":"E. Castro","operaciones":125,"volumen_uf":1112760,"mora30":17.6,"margen":0.73,"nps":7.6},{"ejecutivo":"C. Tapia","operaciones":117,"volumen_uf":945084,"mora30":14.5,"margen":0.77,"nps":7.79},{"ejecutivo":"V. Morales","operaciones":84,"volumen_uf":895997,"mora30":26.2,"margen":0.76,"nps":7.94},{"ejecutivo":"N. Fuentes","operaciones":87,"volumen_uf":868440,"mora30":21.8,"margen":0.66,"nps":7.89},{"ejecutivo":"P. Vega","operaciones":80,"volumen_uf":857209,"mora30":23.8,"margen":0.74,"nps":7.7},{"ejecutivo":"S. Bravo","operaciones":81,"volumen_uf":827381,"mora30":16.0,"margen":0.8,"nps":7.7},{"ejecutivo":"B. Reyes","operaciones":78,"volumen_uf":792228,"mora30":23.1,"margen":0.84,"nps":7.56},{"ejecutivo":"J. Cáceres","operaciones":74,"volumen_uf":748512,"mora30":25.7,"margen":0.73,"nps":7.72},{"ejecutivo":"D. Araya","operaciones":75,"volumen_uf":698283,"mora30":14.7,"margen":0.7,"nps":7.95},{"ejecutivo":"F. Soto","operaciones":71,"volumen_uf":685590,"mora30":23.9,"margen":0.78,"nps":7.59},{"ejecutivo":"M. Silva","operaciones":71,"volumen_uf":681843,"mora30":25.4,"margen":0.73,"nps":7.79},{"ejecutivo":"R. Pinto","operaciones":68,"volumen_uf":658464,"mora30":25.0,"margen":0.78,"nps":7.72},{"ejecutivo":"P. Vidal","operaciones":76,"volumen_uf":520317,"mora30":7.9,"margen":0.81,"nps":8.11},{"ejecutivo":"F. Silva","operaciones":68,"volumen_uf":509834,"mora30":1.5,"margen":0.82,"nps":8.43},{"ejecutivo":"M. Soto","operaciones":64,"volumen_uf":462213,"mora30":7.8,"margen":0.77,"nps":8.28},{"ejecutivo":"R. Leiva","operaciones":64,"volumen_uf":427273,"mora30":1.6,"margen":0.78,"nps":8.38}],"cohortes":[{"cohorte":"2025-01","operaciones":120,"mora30":17.5,"mora_dias":26.6},{"cohorte":"2025-02","operaciones":118,"mora30":21.2,"mora_dias":29.0},{"cohorte":"2025-03","operaciones":112,"mora30":25.0,"mora_dias":41.2},{"cohorte":"2025-04","operaciones":131,"mora30":13.0,"mora_dias":20.4},{"cohorte":"2025-05","operaciones":147,"mora30":19.0,"mora_dias":30.7},{"cohorte":"2025-06","operaciones":144,"mora30":16.0,"mora_dias":24.9},{"cohorte":"2025-07","operaciones":144,"mora30":21.5,"mora_dias":32.4},{"cohorte":"2025-08","operaciones":153,"mora30":15.0,"mora_dias":22.6},{"cohorte":"2025-09","operaciones":133,"mora30":15.0,"mora_dias":17.6},{"cohorte":"2025-10","operaciones":114,"mora30":20.2,"mora_dias":38.1},{"cohorte":"2025-11","operaciones":125,"mora30":19.2,"mora_dias":23.3},{"cohorte":"2025-12","operaciones":120,"mora30":17.5,"mora_dias":21.0},{"cohorte":"2026-01","operaciones":23,"mora30":4.3,"mora_dias":1.5},{"cohorte":"2026-02","operaciones":29,"mora30":13.8,"mora_dias":7.5},{"cohorte":"2026-03","operaciones":29,"mora30":6.9,"mora_dias":2.8},{"cohorte":"2026-04","operaciones":27,"mora30":0.0,"mora_dias":0.0},{"cohorte":"2026-05","operaciones":31,"mora30":3.2,"mora_dias":10.8},{"cohorte":"2026-06","operaciones":25,"mora30":4.0,"mora_dias":2.3},{"cohorte":"2026-07","operaciones":37,"mora30":8.1,"mora_dias":9.3},{"cohorte":"2026-08","operaciones":33,"mora30":3.0,"mora_dias":1.6},{"cohorte":"2026-09","operaciones":29,"mora30":6.9,"mora_dias":10.1},{"cohorte":"2026-10","operaciones":26,"mora30":0.0,"mora_dias":0.0}],"stress":{"tasa_prom":4.77,"tasa_stress_prom":6.77,"dividendo_prom":47.5,"dividendo_stress_prom":56.7,"dividendo_delta_pct":19.2,"dti_prom":36.8,"dti_stress_prom":43.9,"alto_dti_actual_pct":36.6,"alto_dti_stress_pct":58.8},"clasificacion_riesgo":[{"clasificacion":"Alto","operaciones":433,"volumen_uf":4348167,"margen":0.75,"mora30":12.5},{"clasificacion":"Bajo","operaciones":539,"volumen_uf":4412008,"margen":0.75,"mora30":16.9},{"clasificacion":"Medio","operaciones":878,"volumen_uf":7886462,"margen":0.75,"mora30":17.5}],"nps_canal":[{"canal":"Alianza empresa","nps":8.13},{"canal":"App móvil","nps":7.78},{"canal":"Contact center","nps":7.95},{"canal":"Corredora inmobiliaria","nps":7.95},{"canal":"Referido","nps":7.95},{"canal":"Sucursal","nps":7.87},{"canal":"Web","nps":7.91}]};

const SLIDE_COUNT = 12;
const THEMES = ['th-red','','','','th-red','','','','','th-blush','th-deep','th-night'];
const TITLES = ['Portada','Diez números','Embudo comercial','P1 · Canales','P2 · Segmentos y score','P3 · Experiencia','Serie mensual','P4 · Geografía','P5 · Ejecutivos','P6 · Cosechas','P7 · Sensibilidad de tasa','Conclusiones'];
const SRED = '#EC0000', CORAL = '#E8735F', PEACH = '#F2BFA3', BLACK = '#1A1A1A', GRAY = '#9A9A9A';

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
function isDarkTheme(i){ const t = THEMES[i] || ''; return t === 'th-red' || t === 'th-deep' || t === 'th-night'; }

class Component extends MiniLogic {
  constructor(props){
    super(props);
    const topExec = DATA.ejecutivos.reduce((best, e, idx) => (e.volumen_uf > DATA.ejecutivos[best].volumen_uf ? idx : best), 0);
    this.state = { i: 0, t: 1, cm: 'vol', execSel: topExec };
    this._tObj = { v: 1 };
    this._glInited = false;
    this._busy = false;
    this._mx = 0; this._my = 0;
  }
  componentDidMount(){
    this.initGL();
    this.applyGLTheme(this.state.i);
    this.runCounter();
    this.runEntrance();
  }
  componentDidUpdate(prevProps, prevState){
    if (prevState && prevState.i !== this.state.i) {
      this.applyGLTheme(this.state.i);
    }
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
    if (this._ctween) this._ctween.kill();
    if (this._tl) this._tl.kill();
    if (this._wtl) this._wtl.kill();
    if (this._entranceTimer) clearTimeout(this._entranceTimer);
  }

  /* ---------- Bonus layers (never gate visibility) ---------- */
  runCounter(){
    if (typeof gsap === 'undefined') { this.setState({ t: 1 }); return; }
    if (this._ctween) this._ctween.kill();
    this._tObj.v = 0;
    this.setState({ t: 0 });
    this._ctween = gsap.to(this._tObj, {
      v: 1, duration: 1.2, ease: 'power3.out',
      onUpdate: () => this.setState({ t: this._tObj.v }),
      onComplete: () => this.setState({ t: 1 })
    });
  }
  runEntrance(){
    if (typeof gsap === 'undefined' || typeof document === 'undefined') return;
    if (this._tl) this._tl.kill();
    const stageEl = this._stageEl || (this._stageEl = document.querySelector('.stage'));
    if (!stageEl) return;
    const slideEl = stageEl.querySelector('.slide');
    if (!slideEl) return;
    const words = slideEl.querySelectorAll('.word-mask > span');
    if (!words.length) return;
    this._tl = gsap.fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.07, delay: 0.1 });
  }

  /* ---------- WebGL ambient constellation ---------- */
  initGL(){
    if (this._glInited || typeof THREE === 'undefined' || typeof document === 'undefined') return;
    const canvas = document.getElementById('glbg');
    if (!canvas) return;
    this._glInited = true;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); }
    catch (err) { return; }
    renderer.setPixelRatio(Math.min((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    const group = new THREE.Group();
    scene.add(group);
    const COUNT = 220;
    const positions = new Float32Array(COUNT * 3);
    for (let idx = 0; idx < COUNT; idx++) {
      positions[idx*3]   = (Math.random() - 0.5) * 17;
      positions[idx*3+1] = (Math.random() - 0.5) * 9.5;
      positions[idx*3+2] = (Math.random() - 0.5) * 8;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.75, sizeAttenuation: true });
    group.add(new THREE.Points(pGeo, pMat));

    const linePositions = [];
    for (let a = 0; a < COUNT; a++) {
      let bestI = -1, bestD = Infinity;
      for (let b = 0; b < COUNT; b++) {
        if (a === b) continue;
        const dx = positions[a*3]-positions[b*3], dy = positions[a*3+1]-positions[b*3+1], dz = positions[a*3+2]-positions[b*3+2];
        const d = dx*dx + dy*dy + dz*dz;
        if (d < bestD) { bestD = d; bestI = b; }
      }
      if (bestI >= 0 && bestD < 6) {
        linePositions.push(positions[a*3], positions[a*3+1], positions[a*3+2], positions[bestI*3], positions[bestI*3+1], positions[bestI*3+2]);
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 });
    group.add(new THREE.LineSegments(lineGeo, lineMat));

    this._gl = { renderer, scene, camera, canvas, group, pMat, lineMat };
    this.resizeGL();
    if (typeof window !== 'undefined') {
      this._onResize = () => this.resizeGL();
      window.addEventListener('resize', this._onResize);
    }
    const clock = new THREE.Clock();
    const loop = () => {
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.045 + this._mx * 0.12;
      group.rotation.x = Math.sin(t * 0.08) * 0.08 + this._my * 0.08;
      renderer.render(scene, camera);
      this._glRaf = requestAnimationFrame(loop);
    };
    this._glRaf = requestAnimationFrame(loop);
  }
  applyGLTheme(i){
    if (!this._gl) return;
    const { pMat, lineMat } = this._gl;
    const th = THEMES[i] || '';
    try {
      if (th === 'th-red' || th === 'th-deep') { pMat.color.set(0xffffff); pMat.opacity = 0.75; lineMat.color.set(0xffffff); lineMat.opacity = 0.22; }
      else if (th === 'th-night') { pMat.color.set(0xf2bfa3); pMat.opacity = 0.6; lineMat.color.set(0xec0000); lineMat.opacity = 0.35; }
      else { pMat.color.set(0xec0000); pMat.opacity = 0.55; lineMat.color.set(0xe8735f); lineMat.opacity = 0.16; }
    } catch (err) {}
  }
  resizeGL(){
    if (!this._gl) return;
    const { renderer, camera, canvas } = this._gl;
    const w = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const h = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);
    renderer.setSize(w, h, false);
    camera.aspect = w / (h || 1);
    camera.updateProjectionMatrix();
  }

  /* ---------- Navigation with red wipe transition ---------- */
  goTo(i){
    const n = Math.max(0, Math.min(SLIDE_COUNT - 1, i));
    if (n === this.state.i || this._busy) return;
    const wipe = (typeof document !== 'undefined') ? document.querySelector('.wipe') : null;
    if (typeof gsap === 'undefined' || !wipe) {
      this.setState({ i: n, t: 1 });
      this.scheduleEntrance();
      return;
    }
    this._busy = true;
    const dir = n > this.state.i ? 1 : -1;
    const wipeColor = isDarkTheme(n) ? '#FFFFFF' : '#EC0000';
    if (this._wtl) this._wtl.kill();
    this._wtl = gsap.timeline({ onComplete: () => { this._busy = false; } })
      .set(wipe, { backgroundColor: wipeColor, transformOrigin: dir > 0 ? 'left center' : 'right center', scaleX: 0, opacity: 1 })
      .to(wipe, { scaleX: 1, duration: 0.42, ease: 'power4.inOut' })
      .add(() => { this.setState({ i: n, t: 1 }); this.scheduleEntrance(); })
      .set(wipe, { transformOrigin: dir > 0 ? 'right center' : 'left center' })
      .to(wipe, { scaleX: 0, duration: 0.5, ease: 'power4.inOut' }, '+=0.06')
      .set(wipe, { opacity: 0 });
  }
  next(){ this.goTo(this.state.i + 1); }
  prev(){ this.goTo(this.state.i - 1); }
  onWheel(e){
    if (this._wheelLock || this._busy) return;
    const dy = e.deltaY;
    if (Math.abs(dy) < 14) return;
    this._wheelLock = true;
    if (dy > 0) { this.next(); } else { this.prev(); }
    setTimeout(() => { this._wheelLock = false; }, 900);
  }
  onMove(e){
    if (typeof window === 'undefined') return;
    const w = window.innerWidth || 1, h = window.innerHeight || 1;
    const nx = (e.clientX / w) * 2 - 1, ny = (e.clientY / h) * 2 - 1;
    this._mx = nx; this._my = ny;
    if (typeof gsap === 'undefined' || this._moveRaf) return;
    this._moveRaf = requestAnimationFrame(() => {
      this._moveRaf = null;
      try { gsap.to('.px', { x: nx * 10, y: ny * 6, duration: 1.1, ease: 'power2.out', overwrite: 'auto' }); } catch (err) {}
    });
  }
  setMetric(m){ if (this.state.cm !== m) this.setState({ cm: m, t: 1 }); }
  selectExec(idx){ if (this.state.execSel !== idx) this.setState({ execSel: idx }); }
  et(){ return this.state.t; }

  renderVals(){
    const i = this.state.i;
    const et = this.et();
    const D = DATA;
    const self = this;
    const dark = isDarkTheme(i);

    const dots = Array.from({length: SLIDE_COUNT}, (_, idx) => ({
      idx, n: idx + 1, title: TITLES[idx], activeSuffix: idx === i ? ' active' : '',
      go: () => self.goTo(idx)
    }));

    // ---- Slide 0: hero
    const heroVal = nf0(D.kpis.volumen_uf * et);
    const heroWords = ['Cartera','Hipotecaria'].map(text => ({ text }));

    // ---- Slide 1: KPI tiles
    const kpiDefs = [
      { label: 'Operaciones cursadas', unit: '', value: D.kpis.operaciones, sub: '1 fila por crédito' },
      { label: 'Volumen originado', unit: 'UF', value: D.kpis.volumen_uf, sub: '2025–2026, cartera completa' },
      { label: 'Ticket promedio', unit: 'UF', value: D.kpis.ticket_uf, sub: 'por crédito cursado', dec: 0 },
      { label: 'Tasa anual promedio', unit: '%', value: D.kpis.tasa, sub: 'tasa fija equivalente', dec: 2 },
      { label: 'LTV promedio', unit: '%', value: D.kpis.ltv, sub: 'monto / valor propiedad', dec: 1 },
      { label: 'DTI promedio', unit: '%', value: D.kpis.dti, sub: 'dividendo / renta', dec: 1 },
      { label: 'Mora 30+', unit: '%', value: D.kpis.mora30, sub: 'de la cartera cursada — el número a vigilar', dec: 1, hot: true },
      { label: 'NPS promotores', unit: '%', value: D.kpis.nps_promotores, sub: 'nota 9–10 de 10', dec: 1 },
      { label: 'CAC promedio', unit: 'UF', value: D.kpis.cac, sub: 'costo de adquisición', dec: 2 },
      { label: 'Margen esperado', unit: '%', value: D.kpis.margen, sub: 'margen promedio de cartera', dec: 2 },
    ];
    const kpiTiles = kpiDefs.map((k, idx) => ({
      label: k.label, unit: k.unit, sub: k.sub, delay: idx * 55, hotSuffix: k.hot ? ' hot' : '',
      value: (k.dec ? ( (k.value*et).toLocaleString('es-CL',{minimumFractionDigits:k.dec,maximumFractionDigits:k.dec}) ) : nf0(k.value*et))
    }));

    // ---- Slide 2: funnel (brand palette: outcome-coded, direct labels)
    const FST = [
      { label:'Cursado', color: SRED, ink:'#fff' },
      { label:'Preaprobada', color: CORAL, ink:'#fff' },
      { label:'En evaluación', color: PEACH, ink: BLACK },
      { label:'Rechazada', color: BLACK, ink:'#fff' },
      { label:'Desistida', color: GRAY, ink:'#fff' },
    ];
    const fTotal = D.funnel_total;
    const fSeg = FST.map((s, idx) => {
      const value = D.funnel_stages[s.label];
      const p = value / fTotal * 100;
      return { label: s.label, value, valueStr: nf0(value), pct: p * et, pctStr: nf1(p) + '%', color: s.color, ink: s.ink, delay: idx * 90, showLabel: p > 7 };
    });
    const funnelLegend = fSeg.map(s => ({ label: s.label, color: s.color, pctStr: s.pctStr }));
    const motivoEntries = Object.entries(D.motivos_no_conversion).sort((a,b)=>b[1]-a[1]);
    const motivoMax = maxOf(motivoEntries, x => x[1]);
    const motivoBars = motivoEntries.map(([label, value], idx) => ({
      label, value, pct: (value / motivoMax) * 100 * et, delay: idx * 60
    }));

    // ---- Slide 3: canales (metric selector)
    const cm = this.state.cm;
    const metricDef = {
      vol:  { key: c => c.volumen_uf, unit: 'UF', fmt: nf0, note: 'Volumen originado en UF por canal de captación, cartera completa 2025–2026.' },
      ops:  { key: c => c.operaciones, unit: 'operaciones', fmt: nf0, note: 'Número de créditos cursados por canal de captación.' },
      mora: { key: c => c.mora30, unit: '% mora 30+', fmt: nf1, note: 'Mora 30+ observada por canal: Referido y Contact center muestran la mejor calidad relativa.' },
    }[cm];
    const canalSorted = [...D.canales].sort((a,b)=>metricDef.key(b) - metricDef.key(a));
    const canalMaxV = maxOf(canalSorted, metricDef.key);
    const canalBars = canalSorted.map((c, idx) => ({
      label: c.canal, pct: (metricDef.key(c) / canalMaxV) * 100 * et, valueStr: metricDef.fmt(metricDef.key(c)), unit: metricDef.unit,
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
      return { x: x.toFixed(1), y: y.toFixed(1) };
    });
    const moraLineD = moraPoints.map((p,idx) => (idx===0?'M':'L') + p.x + ',' + p.y).join(' ');
    const moraAreaD = moraLineD + ' L' + moraPoints[moraPoints.length-1].x + ',' + (H-PAD) + ' L' + moraPoints[0].x + ',' + (H-PAD) + ' Z';
    const moraBaseY = (H-PAD).toFixed(1);

    // ---- Slide 7: regiones + tipo vivienda
    const regByVol = [...D.regiones].sort((a,b)=>b.volumen_uf - a.volumen_uf);
    const regMax = maxOf(regByVol, r => r.volumen_uf);
    const regionBars = regByVol.map((r, idx) => ({
      label: r.region, pct: (r.volumen_uf/regMax)*100*et, valueStr: nf0(r.volumen_uf), moraStr: nf1(r.mora30)+'%', delay: idx*34,
      color: idx === 0 ? 'var(--emph)' : 'var(--accent)'
    }));
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
      return { x: x.toFixed(1), y: y.toFixed(1), r: r.toFixed(1), rh: (r + 6).toFixed(1), ly: (y - r - 9).toFixed(1), color, delay: idx*28,
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

    // ---- Slide 9: cohortes (sequential red ramp, dark = more mora)
    const cohMoraMax = maxOf(D.cohortes, c => c.mora30);
    const cohMoraMin = minOf(D.cohortes, c => c.mora30);
    const cohortCols = D.cohortes.map((c, idx) => {
      const tnorm = (c.mora30 - cohMoraMin) / ((cohMoraMax - cohMoraMin) || 1);
      return {
        pct: Math.max(4, (c.mora30/cohMoraMax)*100) * et, delay: idx*34, tick: (idx % 2 === 0 ? monthTick(c.cohorte) : ''),
        color: lerpColor('#5C0000', '#F2BFA3', 1 - tnorm), tipStr: monthLong(c.cohorte) + ' · mora ' + nf1(c.mora30) + '% · ' + c.operaciones + ' op.'
      };
    });

    // ---- Slide 10: stress dumbbells
    const S = D.stress;
    const dScale = (v, lo, hi) => 70 + ((v-lo)/(hi-lo)) * 460;
    const dumbbells = [
      { label: 'Tasa anual (%)', y: 40, v1: nf2(S.tasa_prom), v2: nf2(S.tasa_stress_prom),
        x1: dScale(S.tasa_prom, 3, 8), x2: dScale(S.tasa_stress_prom, 3, 8) * et + dScale(S.tasa_prom,3,8)*(1-et) },
      { label: 'Dividendo (UF)', y: 110, v1: nf1(S.dividendo_prom), v2: nf1(S.dividendo_stress_prom),
        x1: dScale(S.dividendo_prom, 30, 80), x2: dScale(S.dividendo_stress_prom, 30, 80) * et + dScale(S.dividendo_prom,30,80)*(1-et) },
      { label: 'DTI (%)', y: 180, v1: nf1(S.dti_prom), v2: nf1(S.dti_stress_prom),
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
      themeClass: THEMES[i] || '', dark,
      progressPct: ((i+1)/SLIDE_COUNT*100).toFixed(2),
      navPrevOpacity: i === 0 ? '0' : '1', navNextOpacity: i === SLIDE_COUNT-1 ? '0' : '1',
      nextLabel: i === 0 ? 'Empezar' : 'Siguiente',
      goPrevFn: () => self.prev(), goNextFn: () => self.next(), wheelFn: (e) => self.onWheel(e), moveFn: (e) => self.onMove(e),
      dots,
      s0:i===0, s1:i===1, s2:i===2, s3:i===3, s4:i===4, s5:i===5, s6:i===6, s7:i===7, s8:i===8, s9:i===9, s10:i===10, s11:i===11,

      heroVal, heroWords, kpiOps: nf0(D.kpis.operaciones), kpiSegCount: D.segmentos.length, kpiRegCount: D.regiones.length, kpiCanalCount: D.canales.length,
      kpiMoraStr: nf1(D.kpis.mora30), kpiTasaStr: nf2(D.kpis.tasa), kpiNpsStr: nf1(D.kpis.nps_promotores),
      kpiTiles,

      funnelTotal: nf0(fTotal), funnelCursado: nf0(D.funnel_stages['Cursado']), funnelConv: nf1(D.funnel_conversion_global),
      funnelSegments: fSeg, funnelLegend, motivoBars,
      diasDecision: nf1(D.dias_hasta_decision_prom), costoLead: nf2(D.costo_lead_prom),

      canalBars, canalConvBars, canalMetricNote: metricDef.note,
      cmVolActive: cm === 'vol' ? ' active' : '', cmOpsActive: cm === 'ops' ? ' active' : '', cmMoraActive: cm === 'mora' ? ' active' : '',
      setCmVol: () => self.setMetric('vol'), setCmOps: () => self.setMetric('ops'), setCmMora: () => self.setMetric('mora'),

      segBars, riskBars,

      npsBars, npsMin, npsMax, npsNeto: nf1(D.kpis.nps_neto), npsProm: nf1(D.kpis.nps_promotores),

      monthCols, moraLineD, moraAreaD, moraBaseY, moraPoints,

      regionBars, tipoRows,

      execPoints, execMedX, execMedY, execQuadW, execQuadH, execMedYLabel, execTop,
      execSelName: es.ejecutivo, execSelVol: nf0(es.volumen_uf), execSelOps: nf0(es.operaciones), execSelMora: nf1(es.mora30) + '%', execSelNps: nf2(es.nps), execSelTag,

      cohortCols,

      dumbbells, dtiAltoActual, dtiAltoStress, divDelta,
      divActual: nf1(S.dividendo_prom), divStress: nf1(S.dividendo_stress_prom),

      conclusions,
    };
  }
}


const app = new Component({});
app._render();

