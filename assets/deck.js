
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
const KEEP_WHOLE = ['px','wipe','tilt','cursor','cursor-ring','intro','iq','ibig','ibig-wrap','istripe','bar-row'];
const KEEP_TRANSFORM = ['mag','dot'];
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
        const cl = from.classList;
        if (cl) {
          const whole = KEEP_WHOLE.some(c => cl.contains(c)) || (from.parentElement && from.parentElement.classList.contains('word-mask'));
          if (whole && from.getAttribute('style')) to.setAttribute('style', from.getAttribute('style'));
          else if (KEEP_TRANSFORM.some(c => cl.contains(c)) && from.style.transform) to.style.transform = from.style.transform;
        }
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
        if (el.getAttribute && el.hasAttribute(attr)) { const fn = self._handlers[+el.getAttribute(attr)]; if (fn) fn(ev); }
        el = el.parentElement;
      }
    };
    ROOT.addEventListener('click', ev => dispatch(ev, 'data-ev-click'));
    ROOT.addEventListener('wheel', ev => dispatch(ev, 'data-ev-wheel'), { passive: true });
    ROOT.addEventListener('mousemove', ev => dispatch(ev, 'data-ev-mousemove'));
    // keyboard, swipe and fullscreen (standalone only)
    document.addEventListener('keydown', ev => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const k = ev.key;
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { ev.preventDefault(); self.next && self.next(); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { ev.preventDefault(); self.prev && self.prev(); }
      else if (k === 'Home') { self.goTo && self.goTo(0); }
      else if (k === 'End') { self.goTo && self.goTo(SLIDE_COUNT - 1); }
      else if (k === 'f' || k === 'F') { self.toggleFullscreen && self.toggleFullscreen(); }
    });
    let tx = 0, ty = 0, tt = 0;
    ROOT.addEventListener('touchstart', ev => { const t = ev.changedTouches[0]; tx = t.clientX; ty = t.clientY; tt = Date.now(); }, { passive: true });
    ROOT.addEventListener('touchend', ev => {
      const t = ev.changedTouches[0]; const dx = t.clientX - tx, dy = t.clientY - ty;
      if (Date.now() - tt < 700 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { if (dx < 0) self.next && self.next(); else self.prev && self.prev(); }
    }, { passive: true });
  }
}


const DATA = {"kpis":{"operaciones":1850,"volumen_uf":16646637,"ticket_uf":8998.2,"tasa":4.77,"ltv":77.5,"dti":36.8,"mora30":16.2,"nps_promotores":42.4,"nps_neto":21.5,"cac":18.16,"margen":0.75,"satisfaccion":4.52,"edad_prom":47.8,"satisf_nuevo":4.52,"satisf_recurrente":4.51},"canales":[{"canal":"Sucursal","operaciones":546,"volumen_uf":5024962,"mora30":17.0,"cac":17.63,"margen":0.74,"solicitudes":685,"conversion":79.7,"costo_lead":7.07,"dias_decision":20.8},{"canal":"Web","operaciones":373,"volumen_uf":3404270,"mora30":17.2,"cac":17.72,"margen":0.77,"solicitudes":504,"conversion":74.0,"costo_lead":7.09,"dias_decision":21.81},{"canal":"App móvil","operaciones":244,"volumen_uf":2136505,"mora30":16.4,"cac":17.76,"margen":0.75,"solicitudes":362,"conversion":67.4,"costo_lead":6.88,"dias_decision":21.68},{"canal":"Corredora inmobiliaria","operaciones":236,"volumen_uf":2128883,"mora30":16.5,"cac":22.84,"margen":0.77,"solicitudes":379,"conversion":62.3,"costo_lead":8.11,"dias_decision":22.33},{"canal":"Alianza empresa","operaciones":166,"volumen_uf":1539814,"mora30":14.5,"cac":17.31,"margen":0.72,"solicitudes":302,"conversion":55.0,"costo_lead":6.9,"dias_decision":22.54},{"canal":"Referido","operaciones":174,"volumen_uf":1456074,"mora30":13.8,"cac":11.9,"margen":0.76,"solicitudes":313,"conversion":55.6,"costo_lead":5.33,"dias_decision":22.25},{"canal":"Contact center","operaciones":111,"volumen_uf":956129,"mora30":13.5,"cac":24.33,"margen":0.74,"solicitudes":255,"conversion":43.5,"costo_lead":7.98,"dias_decision":24.43}],"funnel_stages":{"Cursado":1850,"Desistida":318,"Rechazada":292,"En evaluación":194,"Preaprobada":146},"funnel_total":2800,"funnel_conversion_global":66.1,"motivos_no_conversion":{"Cambio de decisión":87,"Oferta competencia":86,"Historial crediticio":85,"Tasa no competitiva":77,"Propiedad no elegible":70,"Capacidad de pago":70,"Demora del proceso":68,"Documentación incompleta":67},"dias_hasta_decision_prom":22.0,"costo_lead_prom":7.06,"segmentos":[{"segmento":"Personas","operaciones":491,"volumen_uf":4407939,"mora30":13.8,"margen":0.73,"ltv":76.4,"dti":37.68,"ticket":8977.47,"share_volumen":26.5},{"segmento":"Select","operaciones":432,"volumen_uf":3716684,"mora30":15.0,"margen":0.75,"ltv":77.29,"dti":36.45,"ticket":8603.44,"share_volumen":22.3},{"segmento":"Universitario","operaciones":322,"volumen_uf":2955340,"mora30":18.3,"margen":0.78,"ltv":78.84,"dti":36.81,"ticket":9178.07,"share_volumen":17.8},{"segmento":"Private Banking","operaciones":309,"volumen_uf":2849258,"mora30":18.1,"margen":0.74,"ltv":78.72,"dti":37.04,"ticket":9220.9,"share_volumen":17.1},{"segmento":"Pyme","operaciones":296,"volumen_uf":2717416,"mora30":17.2,"margen":0.76,"ltv":76.66,"dti":35.52,"ticket":9180.46,"share_volumen":16.3}],"mensual":[{"mes":"2025-01","operaciones":120,"volumen_uf":1120040,"mora30":17.5,"nps":7.84,"satisf":4.47,"margen":0.78},{"mes":"2025-02","operaciones":118,"volumen_uf":1129724,"mora30":21.2,"nps":7.86,"satisf":4.53,"margen":0.78},{"mes":"2025-03","operaciones":112,"volumen_uf":1006717,"mora30":25.0,"nps":7.68,"satisf":4.47,"margen":0.78},{"mes":"2025-04","operaciones":131,"volumen_uf":1263972,"mora30":13.0,"nps":7.89,"satisf":4.47,"margen":0.77},{"mes":"2025-05","operaciones":147,"volumen_uf":1367081,"mora30":19.0,"nps":8.01,"satisf":4.61,"margen":0.79},{"mes":"2025-06","operaciones":144,"volumen_uf":1322273,"mora30":16.0,"nps":7.83,"satisf":4.48,"margen":0.69},{"mes":"2025-07","operaciones":144,"volumen_uf":1461575,"mora30":21.5,"nps":7.98,"satisf":4.52,"margen":0.73},{"mes":"2025-08","operaciones":153,"volumen_uf":1298263,"mora30":15.0,"nps":7.93,"satisf":4.52,"margen":0.77},{"mes":"2025-09","operaciones":133,"volumen_uf":1217925,"mora30":15.0,"nps":7.8,"satisf":4.45,"margen":0.75},{"mes":"2025-10","operaciones":114,"volumen_uf":1076753,"mora30":20.2,"nps":7.6,"satisf":4.37,"margen":0.72},{"mes":"2025-11","operaciones":125,"volumen_uf":1153745,"mora30":19.2,"nps":7.91,"satisf":4.55,"margen":0.76},{"mes":"2025-12","operaciones":120,"volumen_uf":1087804,"mora30":17.5,"nps":8.06,"satisf":4.57,"margen":0.72},{"mes":"2026-01","operaciones":23,"volumen_uf":143205,"mora30":4.3,"nps":8.39,"satisf":4.7,"margen":0.7},{"mes":"2026-02","operaciones":29,"volumen_uf":218617,"mora30":13.8,"nps":7.97,"satisf":4.55,"margen":0.69},{"mes":"2026-03","operaciones":29,"volumen_uf":216704,"mora30":6.9,"nps":7.62,"satisf":4.41,"margen":0.64},{"mes":"2026-04","operaciones":27,"volumen_uf":231452,"mora30":0.0,"nps":8.56,"satisf":4.78,"margen":0.92},{"mes":"2026-05","operaciones":31,"volumen_uf":242375,"mora30":3.2,"nps":8.61,"satisf":4.74,"margen":0.7},{"mes":"2026-06","operaciones":25,"volumen_uf":154525,"mora30":4.0,"nps":8.24,"satisf":4.64,"margen":0.77},{"mes":"2026-07","operaciones":37,"volumen_uf":229213,"mora30":8.1,"nps":7.62,"satisf":4.32,"margen":0.83},{"mes":"2026-08","operaciones":33,"volumen_uf":251942,"mora30":3.0,"nps":8.18,"satisf":4.55,"margen":0.72},{"mes":"2026-09","operaciones":29,"volumen_uf":236225,"mora30":6.9,"nps":8.03,"satisf":4.55,"margen":0.63},{"mes":"2026-10","operaciones":26,"volumen_uf":216507,"mora30":0.0,"nps":8.38,"satisf":4.73,"margen":0.84}],"regiones":[{"region":"RM","operaciones":551,"volumen_uf":4801205,"mora30":15.2,"nps":8.0,"satisf":4.55,"ltv":77.39,"dti":36.27,"tasa":4.75},{"region":"Valparaíso","operaciones":193,"volumen_uf":1819952,"mora30":17.1,"nps":7.98,"satisf":4.54,"ltv":77.82,"dti":36.58,"tasa":4.8},{"region":"Biobío","operaciones":166,"volumen_uf":1470760,"mora30":13.3,"nps":7.64,"satisf":4.43,"ltv":76.93,"dti":36.75,"tasa":4.76},{"region":"Los Lagos","operaciones":107,"volumen_uf":1015978,"mora30":16.8,"nps":7.82,"satisf":4.49,"ltv":75.7,"dti":37.83,"tasa":4.77},{"region":"Coquimbo","operaciones":111,"volumen_uf":939977,"mora30":16.2,"nps":8.12,"satisf":4.62,"ltv":77.34,"dti":34.18,"tasa":4.8},{"region":"Antofagasta","operaciones":107,"volumen_uf":911256,"mora30":18.7,"nps":8.14,"satisf":4.59,"ltv":77.34,"dti":38.39,"tasa":4.77},{"region":"Araucanía","operaciones":90,"volumen_uf":845322,"mora30":17.8,"nps":8.02,"satisf":4.5,"ltv":75.56,"dti":37.75,"tasa":4.7},{"region":"Los Ríos","operaciones":82,"volumen_uf":793580,"mora30":17.1,"nps":7.91,"satisf":4.54,"ltv":77.8,"dti":39.86,"tasa":4.83},{"region":"Maule","operaciones":84,"volumen_uf":760102,"mora30":13.1,"nps":7.7,"satisf":4.43,"ltv":78.81,"dti":37.36,"tasa":4.75},{"region":"O'Higgins","operaciones":80,"volumen_uf":749394,"mora30":20.0,"nps":8.0,"satisf":4.5,"ltv":76.31,"dti":36.47,"tasa":4.78},{"region":"Tarapacá","operaciones":80,"volumen_uf":747636,"mora30":18.8,"nps":7.46,"satisf":4.38,"ltv":80.19,"dti":37.92,"tasa":4.81},{"region":"Arica y Parinacota","operaciones":67,"volumen_uf":618892,"mora30":16.4,"nps":8.04,"satisf":4.57,"ltv":78.66,"dti":33.19,"tasa":4.8},{"region":"Atacama","operaciones":63,"volumen_uf":578257,"mora30":17.5,"nps":7.7,"satisf":4.43,"ltv":78.57,"dti":37.06,"tasa":4.72},{"region":"Ñuble","operaciones":62,"volumen_uf":534350,"mora30":14.5,"nps":7.74,"satisf":4.44,"ltv":78.23,"dti":37.39,"tasa":4.73},{"region":"Magallanes","operaciones":4,"volumen_uf":41968,"mora30":0.0,"nps":9.0,"satisf":5.0,"ltv":78.75,"dti":56.29,"tasa":4.82},{"region":"Aysén","operaciones":3,"volumen_uf":18008,"mora30":33.3,"nps":7.0,"satisf":4.0,"ltv":68.33,"dti":34.19,"tasa":4.2}],"tipo_vivienda":[{"tipo_vivienda":"Departamento usado","operaciones":489,"volumen_uf":4457095,"ltv":77.26,"dti":36.96,"tasa":4.76,"mora30":15.5},{"tipo_vivienda":"Departamento nuevo","operaciones":462,"volumen_uf":4216266,"ltv":77.41,"dti":36.62,"tasa":4.76,"mora30":17.3},{"tipo_vivienda":"Casa nueva","operaciones":448,"volumen_uf":4143297,"ltv":78.05,"dti":37.19,"tasa":4.77,"mora30":17.2},{"tipo_vivienda":"Casa usada","operaciones":451,"volumen_uf":3829979,"ltv":77.14,"dti":36.38,"tasa":4.78,"mora30":14.6}],"ejecutivos":[{"ejecutivo":"A. Rojas","operaciones":153,"volumen_uf":1363048,"mora30":15.0,"margen":0.72,"nps":7.95},{"ejecutivo":"G. Herrera","operaciones":142,"volumen_uf":1221305,"mora30":12.7,"margen":0.7,"nps":7.95},{"ejecutivo":"L. Muñoz","operaciones":138,"volumen_uf":1206798,"mora30":13.8,"margen":0.76,"nps":8.16},{"ejecutivo":"T. Núñez","operaciones":134,"volumen_uf":1164058,"mora30":10.4,"margen":0.74,"nps":8.1},{"ejecutivo":"E. Castro","operaciones":125,"volumen_uf":1112760,"mora30":17.6,"margen":0.73,"nps":7.6},{"ejecutivo":"C. Tapia","operaciones":117,"volumen_uf":945084,"mora30":14.5,"margen":0.77,"nps":7.79},{"ejecutivo":"V. Morales","operaciones":84,"volumen_uf":895997,"mora30":26.2,"margen":0.76,"nps":7.94},{"ejecutivo":"N. Fuentes","operaciones":87,"volumen_uf":868440,"mora30":21.8,"margen":0.66,"nps":7.89},{"ejecutivo":"P. Vega","operaciones":80,"volumen_uf":857209,"mora30":23.8,"margen":0.74,"nps":7.7},{"ejecutivo":"S. Bravo","operaciones":81,"volumen_uf":827381,"mora30":16.0,"margen":0.8,"nps":7.7},{"ejecutivo":"B. Reyes","operaciones":78,"volumen_uf":792228,"mora30":23.1,"margen":0.84,"nps":7.56},{"ejecutivo":"J. Cáceres","operaciones":74,"volumen_uf":748512,"mora30":25.7,"margen":0.73,"nps":7.72},{"ejecutivo":"D. Araya","operaciones":75,"volumen_uf":698283,"mora30":14.7,"margen":0.7,"nps":7.95},{"ejecutivo":"F. Soto","operaciones":71,"volumen_uf":685590,"mora30":23.9,"margen":0.78,"nps":7.59},{"ejecutivo":"M. Silva","operaciones":71,"volumen_uf":681843,"mora30":25.4,"margen":0.73,"nps":7.79},{"ejecutivo":"R. Pinto","operaciones":68,"volumen_uf":658464,"mora30":25.0,"margen":0.78,"nps":7.72},{"ejecutivo":"P. Vidal","operaciones":76,"volumen_uf":520317,"mora30":7.9,"margen":0.81,"nps":8.11},{"ejecutivo":"F. Silva","operaciones":68,"volumen_uf":509834,"mora30":1.5,"margen":0.82,"nps":8.43},{"ejecutivo":"M. Soto","operaciones":64,"volumen_uf":462213,"mora30":7.8,"margen":0.77,"nps":8.28},{"ejecutivo":"R. Leiva","operaciones":64,"volumen_uf":427273,"mora30":1.6,"margen":0.78,"nps":8.38}],"cohortes":[{"cohorte":"2025-01","operaciones":120,"mora30":17.5,"mora_dias":26.6},{"cohorte":"2025-02","operaciones":118,"mora30":21.2,"mora_dias":29.0},{"cohorte":"2025-03","operaciones":112,"mora30":25.0,"mora_dias":41.2},{"cohorte":"2025-04","operaciones":131,"mora30":13.0,"mora_dias":20.4},{"cohorte":"2025-05","operaciones":147,"mora30":19.0,"mora_dias":30.7},{"cohorte":"2025-06","operaciones":144,"mora30":16.0,"mora_dias":24.9},{"cohorte":"2025-07","operaciones":144,"mora30":21.5,"mora_dias":32.4},{"cohorte":"2025-08","operaciones":153,"mora30":15.0,"mora_dias":22.6},{"cohorte":"2025-09","operaciones":133,"mora30":15.0,"mora_dias":17.6},{"cohorte":"2025-10","operaciones":114,"mora30":20.2,"mora_dias":38.1},{"cohorte":"2025-11","operaciones":125,"mora30":19.2,"mora_dias":23.3},{"cohorte":"2025-12","operaciones":120,"mora30":17.5,"mora_dias":21.0},{"cohorte":"2026-01","operaciones":23,"mora30":4.3,"mora_dias":1.5},{"cohorte":"2026-02","operaciones":29,"mora30":13.8,"mora_dias":7.5},{"cohorte":"2026-03","operaciones":29,"mora30":6.9,"mora_dias":2.8},{"cohorte":"2026-04","operaciones":27,"mora30":0.0,"mora_dias":0.0},{"cohorte":"2026-05","operaciones":31,"mora30":3.2,"mora_dias":10.8},{"cohorte":"2026-06","operaciones":25,"mora30":4.0,"mora_dias":2.3},{"cohorte":"2026-07","operaciones":37,"mora30":8.1,"mora_dias":9.3},{"cohorte":"2026-08","operaciones":33,"mora30":3.0,"mora_dias":1.6},{"cohorte":"2026-09","operaciones":29,"mora30":6.9,"mora_dias":10.1},{"cohorte":"2026-10","operaciones":26,"mora30":0.0,"mora_dias":0.0}],"stress":{"tasa_prom":4.77,"tasa_stress_prom":6.77,"dividendo_prom":47.5,"dividendo_stress_prom":56.7,"dividendo_delta_pct":19.2,"dti_prom":36.8,"dti_stress_prom":43.9,"alto_dti_actual_pct":36.6,"alto_dti_stress_pct":58.8},"clasificacion_riesgo":[{"clasificacion":"Alto","operaciones":433,"volumen_uf":4348167,"margen":0.75,"mora30":12.5},{"clasificacion":"Bajo","operaciones":539,"volumen_uf":4412008,"margen":0.75,"mora30":16.9},{"clasificacion":"Medio","operaciones":878,"volumen_uf":7886462,"margen":0.75,"mora30":17.5}],"nps_canal":[{"canal":"Alianza empresa","nps":8.13},{"canal":"App móvil","nps":7.78},{"canal":"Contact center","nps":7.95},{"canal":"Corredora inmobiliaria","nps":7.95},{"canal":"Referido","nps":7.95},{"canal":"Sucursal","nps":7.87},{"canal":"Web","nps":7.91}],"mensual_kpi":{"ops":[120,118,112,131,147,144,144,153,133,114,125,120,23,29,29,27,31,25,37,33,29,26],"ticket":[9334.0,9574.0,8989.0,9649.0,9300.0,9182.0,10150.0,8485.0,9157.0,9445.0,9230.0,9065.0,6226.0,7539.0,7473.0,8572.0,7819.0,6181.0,6195.0,7635.0,8146.0,8327.0],"tasa":[4.84,4.87,4.78,4.88,4.81,4.77,4.77,4.89,4.8,4.77,4.85,4.79,4.44,4.44,4.52,4.51,4.47,4.43,4.41,4.55,4.53,4.5],"ltv":[78.5,78.9,78.5,78.2,77.8,78.0,78.4,78.3,77.7,78.3,79.0,78.5,74.6,73.1,75.9,70.6,70.3,73.0,76.1,69.8,72.6,72.1],"dti":[36.7,36.8,37.5,38.0,37.0,35.9,35.5,36.4,37.0,38.3,35.7,36.3,35.0,41.5,36.7,38.0,36.8,31.4,33.7,37.5,41.0,40.2],"mora":[17.5,21.2,25.0,13.0,19.0,16.0,21.5,15.0,15.0,20.2,19.2,17.5,4.3,13.8,6.9,0.0,3.2,4.0,8.1,3.0,6.9,0.0],"nps_prom":[41.7,39.8,33.9,44.3,42.9,42.4,45.8,42.5,41.4,37.7,35.2,46.7,56.5,41.4,27.6,59.3,61.3,56.0,35.1,51.5,44.8,50.0],"cac":[18.57,17.52,17.73,17.04,18.33,18.08,17.93,19.76,18.19,17.04,19.07,17.96,15.49,16.63,19.38,17.5,19.65,18.54,19.51,18.04,19.26,17.85],"margen":[0.78,0.78,0.78,0.77,0.79,0.69,0.73,0.77,0.75,0.72,0.76,0.72,0.7,0.69,0.64,0.92,0.7,0.77,0.83,0.72,0.63,0.84],"vol":[1120040,1129724,1006717,1263972,1367081,1322273,1461575,1298263,1217925,1076753,1153745,1087804,143205,218617,216704,231452,242375,154525,229213,251942,236225,216507]},"cohort_heat":{"segmentos":["Personas","Select","Universitario","Private Banking","Pyme"],"meses":["2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10"],"rows":[{"segmento":"Personas","cells":[[27,14.8],[30,30.0],[33,36.4],[29,6.9],[46,19.6],[37,13.5],[33,18.2],[30,16.7],[30,13.3],[26,19.2],[26,11.5],[32,9.4],[11,0.0],[11,9.1],[10,0.0],[11,0.0],[13,0.0],[13,0.0],[10,0.0],[14,0.0],[11,0.0],[8,0.0]]},{"segmento":"Select","cells":[[23,17.4],[29,13.8],[23,21.7],[35,11.4],[27,18.5],[31,19.4],[34,26.5],[39,7.7],[31,12.9],[26,19.2],[34,17.6],[17,23.5],[5,20.0],[9,0.0],[9,11.1],[4,0.0],[10,10.0],[5,0.0],[13,15.4],[13,7.7],[5,0.0],[10,0.0]]},{"segmento":"Universitario","cells":[[18,27.8],[19,15.8],[24,25.0],[15,26.7],[27,14.8],[28,14.3],[30,16.7],[31,16.1],[27,14.8],[21,23.8],[20,30.0],[28,25.0],[5,0.0],[2,0.0],[2,0.0],[5,0.0],[1,0.0],[1,0.0],[6,0.0],[3,0.0],[5,20.0],[4,0.0]]},{"segmento":"Private Banking","cells":[[30,13.3],[23,21.7],[17,5.9],[32,21.9],[28,21.4],[26,15.4],[25,16.0],[19,21.1],[21,14.3],[21,19.0],[22,22.7],[20,20.0],[0,null],[4,50.0],[3,33.3],[2,0.0],[4,0.0],[3,0.0],[4,25.0],[0,null],[3,33.3],[2,0.0]]},{"segmento":"Pyme","cells":[[22,18.2],[17,23.5],[15,26.7],[20,0.0],[19,21.1],[22,18.2],[22,31.8],[34,17.6],[24,20.8],[20,20.0],[23,17.4],[23,13.0],[2,0.0],[3,33.3],[5,0.0],[5,0.0],[3,0.0],[3,33.3],[4,0.0],[3,0.0],[5,0.0],[2,0.0]]}]},"map":{"viewBox":"0 0 200 1023","paths":{"Arica y Parinacota":"M134,7 136,9 137,15 141,16 142,17 140,20 142,22 143,29 142,32 145,39 140,45 136,46 134,43 124,43 116,48 115,37 116,28 114,25 122,23 125,20 127,16 126,9 126,6 129,7 133,3 133,5 134,7Z","Tarapacá":"M119,74 119,61 117,58 118,55 116,48 123,44 134,43 136,46 140,45 143,42 143,41 144,41 146,44 156,53 150,62 153,64 153,69 148,71 148,72 149,72 149,75 150,77 149,78 149,81 155,85 153,88 153,92 154,93 153,97 146,102 137,105 132,112 129,107 127,106 121,106 120,105 120,101 118,96 119,93 118,90 119,74Z","Antofagasta":"M156,93 160,103 160,111 163,115 163,121 165,124 165,131 168,137 167,138 167,143 168,144 173,145 181,143 185,148 178,175 159,184 158,187 156,187 155,190 154,190 152,195 153,197 155,198 157,203 154,204 153,208 150,208 149,211 143,210 142,212 143,214 141,216 142,217 141,221 138,223 134,223 132,225 127,225 125,225 124,224 121,226 116,224 111,227 109,227 108,228 109,227 107,221 109,217 108,214 111,213 113,207 111,203 112,200 110,193 110,189 112,179 111,170 114,164 112,160 111,162 109,161 109,154 110,153 110,150 111,148 112,150 114,150 116,145 115,142 117,134 117,126 120,108 121,106 127,106 129,107 132,112 137,105 146,102 153,97 154,93 156,93Z","Magallanes":"M153,989 157,993 155,992 155,994 151,994 152,995 143,992 142,993 159,997 157,997 161,999 149,999 152,1001 161,1001 161,1004 163,1003 162,1005 165,1007 163,1010 162,1007 158,1008 160,1005 157,1003 145,1003 150,1001 145,1002 148,996 144,999 141,995 141,998 137,996 138,998 133,998 138,1000 138,1004 142,1004 137,1005 136,1002 136,1006 133,1003 136,1002 127,1000 132,999 129,999 133,996 125,999 123,997 126,996 121,996 131,993 132,996 132,992 153,989Z M113,990 106,991 116,992 114,993 116,995 112,994 114,995 112,997 110,996 110,993 107,995 106,993 100,993 104,989 108,991 116,989 113,990Z M165,988 181,990 184,995 179,1000 176,1000 177,996 175,996 172,998 168,999 167,997 170,997 167,996 162,997 161,991 156,990 165,988Z M129,988 133,989 132,990 140,990 124,993 123,990 126,990 123,989 126,988 127,991 129,988Z M89,963 90,965 92,963 93,967 93,964 95,965 97,970 97,968 99,969 99,966 101,967 99,970 102,969 102,972 98,973 99,975 94,973 97,971 93,972 93,968 90,968 93,974 90,973 91,971 89,972 90,970 87,971 89,963Z M82,961 83,964 84,962 87,963 85,966 88,967 85,969 81,966 86,971 82,972 84,974 81,974 82,971 77,970 80,968 77,968 79,968 77,966 73,972 71,971 74,974 69,976 68,974 72,972 70,974 67,972 74,967 71,967 75,967 76,964 74,963 80,965 78,963 81,964 79,963 82,961Z M112,953 115,965 113,966 108,963 111,970 111,968 116,970 117,972 104,966 103,962 109,961 107,957 112,953Z M58,948 59,951 59,949 60,953 62,952 61,956 63,954 62,950 66,956 66,952 72,955 67,958 70,956 70,958 72,956 77,959 74,960 75,961 70,960 73,961 73,963 70,962 72,964 70,964 73,966 68,965 68,968 66,965 63,968 57,967 64,966 62,964 65,964 63,963 66,961 62,962 65,958 62,958 61,962 58,962 61,961 58,960 63,957 54,958 60,955 54,955 54,953 50,951 58,953 55,949 58,948Z M23,931 31,938 36,939 35,937 46,943 46,941 48,946 50,945 49,942 52,945 51,946 57,948 46,947 49,947 40,940 36,940 38,941 36,942 33,939 33,942 31,942 28,936 25,936 24,934 26,935 23,933 23,931Z M91,929 92,934 82,939 79,942 73,939 75,942 67,940 76,944 67,944 71,945 68,946 69,948 66,948 72,953 68,953 52,943 60,943 64,947 66,945 62,943 66,942 60,941 62,939 59,935 66,931 67,932 65,936 68,933 67,935 71,935 77,929 91,929Z M107,974 110,974 106,981 107,979 109,981 107,979 110,975 117,980 116,978 120,979 111,975 111,973 104,972 102,968 119,976 121,975 118,973 122,972 126,977 124,978 126,977 125,980 127,981 128,978 125,972 130,974 131,978 131,975 133,976 132,974 134,974 139,977 132,983 135,982 136,984 135,982 139,979 140,980 140,977 144,977 121,967 119,959 136,952 136,950 131,948 118,951 113,948 113,939 115,938 115,940 117,940 120,937 116,936 116,933 113,933 119,931 124,934 134,924 141,931 148,926 151,929 151,988 147,987 149,989 141,990 129,987 131,985 128,983 129,987 127,984 127,987 124,987 123,983 123,987 119,986 119,988 115,987 117,983 115,987 109,987 114,988 108,989 104,987 107,984 102,985 106,983 100,985 103,981 96,983 95,982 98,981 94,978 92,980 94,981 91,983 91,980 90,982 88,980 87,982 88,980 84,980 86,981 82,982 82,979 80,978 82,977 87,980 85,978 90,979 83,976 90,978 92,978 88,975 101,977 104,974 107,974Z M25,878 29,880 27,882 29,881 30,888 28,885 22,888 25,885 21,888 19,887 22,885 18,886 20,883 18,883 27,884 24,883 27,881 25,878Z M33,882 33,879 31,882 25,876 30,873 23,872 26,870 30,872 34,877 29,877 34,879 35,882 33,882Z M11,859 16,863 18,861 16,864 18,862 18,864 22,863 19,864 20,866 16,865 18,866 14,868 13,871 15,870 14,872 10,871 13,867 7,869 9,863 14,866 15,863 13,864 8,861 11,859Z M5,851 4,849 9,848 14,857 10,856 9,851 4,855 5,851Z M12,827 17,831 14,833 13,830 12,835 11,830 7,834 5,832 8,831 4,831 6,827 9,828 6,830 10,828 9,830 11,831 10,828 13,830 12,827Z M102,912 122,912 155,922 139,917 134,919 129,926 125,925 111,931 111,929 107,932 103,931 107,933 103,936 106,937 101,949 103,955 102,959 95,962 83,956 78,956 70,949 74,945 77,945 75,950 80,948 80,945 83,944 85,950 77,953 84,952 85,944 94,942 99,936 97,933 93,933 89,927 73,926 71,930 68,928 72,925 68,928 62,926 59,932 62,928 66,930 58,935 60,939 56,941 56,939 54,941 50,939 55,936 47,934 54,933 51,927 51,931 50,929 45,931 46,933 44,932 47,929 45,929 46,927 49,926 49,923 45,923 47,922 47,918 44,913 51,918 59,914 56,918 59,917 59,920 61,920 64,914 61,918 60,913 64,911 69,918 67,922 59,925 68,925 65,923 68,922 70,918 66,911 70,910 70,906 66,901 66,903 57,898 57,895 57,896 53,898 58,899 57,902 59,899 69,905 65,908 53,901 53,904 59,906 55,906 58,907 55,909 59,907 61,908 54,915 51,903 53,916 48,914 45,909 46,907 50,912 46,905 50,904 46,905 46,903 44,907 42,903 43,903 40,902 43,900 38,899 40,895 47,902 45,898 47,900 47,898 45,897 43,892 45,893 45,889 42,887 43,891 40,893 38,888 36,891 35,887 37,884 34,887 33,884 40,882 44,885 40,882 44,881 42,877 49,877 43,874 47,869 43,873 42,880 37,882 35,880 37,878 35,879 33,875 36,875 32,872 38,875 41,874 35,871 39,869 33,871 32,866 30,870 24,866 26,864 23,865 27,863 27,861 29,862 25,862 29,860 32,863 31,864 39,867 30,859 33,858 38,861 41,860 38,859 42,857 40,857 42,855 37,859 32,857 31,854 37,852 32,853 31,850 37,847 37,850 40,848 42,852 44,851 40,846 36,846 38,840 43,844 38,838 35,838 34,847 30,843 31,825 39,826 58,840 58,845 47,857 50,860 48,863 51,867 50,869 52,874 56,877 55,881 65,876 74,877 74,887 71,889 75,892 71,901 81,909 80,912 102,912Z M12,849 14,846 10,847 13,846 10,847 11,844 9,846 10,843 8,845 7,840 10,840 8,842 10,840 15,846 13,844 18,843 12,844 10,840 16,842 13,840 17,842 16,837 20,843 23,835 19,833 21,831 23,834 22,831 18,832 21,830 17,830 21,828 17,830 17,827 20,828 17,827 22,824 22,827 24,824 26,826 25,829 28,825 26,832 28,830 29,832 27,833 30,841 26,847 29,849 26,850 30,851 30,853 26,852 29,854 29,857 28,855 27,859 25,856 27,859 25,861 24,859 21,861 19,859 24,857 19,858 25,854 21,855 23,852 20,854 19,851 21,851 20,849 24,850 20,847 23,847 26,841 23,844 21,842 23,844 20,846 20,843 18,847 18,844 17,849 15,847 17,849 17,851 18,849 17,857 12,850 14,848 12,849Z","Aysén":"M23,810 26,816 24,817 26,822 29,822 26,825 18,822 20,817 23,821 24,819 22,815 23,810Z M13,808 20,811 19,813 22,811 20,814 22,813 22,816 17,818 13,808Z M10,807 10,811 11,808 10,811 12,810 14,818 15,817 15,820 17,821 13,825 15,822 12,823 12,815 6,817 11,814 8,815 10,811 7,813 6,809 8,808 8,810 10,807Z M42,727 44,735 38,734 42,733 35,732 35,729 33,732 34,728 42,727Z M36,717 41,720 31,722 30,720 36,720 30,720 29,717 36,717Z M60,711 61,713 59,716 62,712 66,715 63,718 60,717 63,721 53,726 51,723 56,723 53,721 51,722 49,718 51,716 55,718 53,715 57,716 54,713 57,712 59,714 57,712 60,711Z M29,799 23,799 27,794 31,796 26,798 32,797 35,800 37,799 33,797 37,797 33,796 39,796 36,795 40,793 33,796 32,794 37,792 31,794 29,792 34,791 28,791 32,785 35,790 34,785 36,785 37,790 36,785 41,785 38,784 40,781 36,785 34,783 35,780 37,782 41,779 37,780 34,777 37,776 30,774 37,772 21,775 16,770 19,765 14,771 13,769 13,771 5,772 5,775 10,773 9,777 11,776 8,779 3,775 3,771 5,769 7,770 6,768 11,767 10,765 14,766 13,762 20,764 15,762 17,762 16,760 20,762 20,758 25,758 22,757 26,755 23,755 24,751 19,757 16,756 21,754 17,754 19,753 16,753 15,751 22,753 18,750 23,749 23,751 27,750 29,755 31,753 29,749 32,751 36,749 33,751 38,753 31,754 37,754 37,757 31,757 37,757 38,754 38,758 32,761 28,759 32,761 38,759 42,763 38,760 39,758 44,760 39,770 46,767 44,768 43,764 47,762 54,765 47,761 51,755 55,754 51,754 52,751 59,751 48,750 51,746 56,745 53,743 47,748 49,740 51,738 51,740 55,735 59,739 62,740 64,738 48,733 50,734 53,733 51,726 57,726 72,719 66,722 66,715 70,716 67,714 68,710 65,714 64,711 61,711 62,709 55,708 58,706 57,704 55,707 53,704 57,704 59,695 60,698 62,696 65,697 63,696 63,692 62,695 58,694 62,694 63,692 64,695 69,696 73,693 78,700 84,700 84,712 93,711 99,715 95,723 91,721 79,721 79,725 89,727 94,735 84,745 88,753 82,758 86,761 87,772 81,775 83,786 80,785 80,788 73,792 73,796 69,800 69,805 75,815 72,816 71,820 68,820 69,828 63,832 60,832 56,839 38,825 33,826 34,824 32,824 30,822 35,819 40,823 38,818 43,817 34,816 40,815 33,815 32,812 28,809 30,807 25,808 28,805 32,807 33,813 34,811 37,812 35,813 32,807 35,806 35,809 36,806 42,807 41,809 44,807 43,810 47,810 46,813 57,811 56,809 55,813 52,813 54,807 52,811 49,810 46,803 59,808 49,804 50,802 45,800 45,794 44,801 40,802 38,800 27,801 29,799Z","Atacama":"M153,208 153,210 152,212 153,215 153,217 154,219 156,231 152,234 152,240 159,251 157,253 158,254 155,256 154,255 154,256 152,256 152,258 150,256 148,256 146,257 146,260 147,261 146,261 145,265 144,264 144,267 142,269 141,277 140,279 138,279 135,285 134,284 132,288 129,290 127,309 123,311 123,312 122,314 123,319 118,320 116,316 112,316 111,307 107,307 105,309 103,309 100,315 99,314 97,313 97,311 94,310 91,311 91,309 90,304 95,297 94,294 98,289 97,282 100,271 103,269 103,266 102,263 103,261 102,258 102,256 104,256 104,254 105,255 105,253 105,250 107,247 108,242 107,237 109,236 108,234 108,228 109,227 111,227 116,224 121,226 124,224 125,225 127,225 132,225 134,223 138,223 141,221 142,217 141,216 143,214 142,212 143,210 147,210 148,211 150,210 150,208 153,208Z","Coquimbo":"M87,361 86,351 87,341 88,338 88,340 90,340 92,337 93,337 93,334 92,332 95,330 94,326 95,322 94,320 94,315 91,311 94,310 97,311 97,313 99,314 100,315 103,309 105,309 107,307 111,307 112,316 116,316 118,320 123,319 125,329 123,334 126,336 126,338 125,338 124,341 122,343 119,341 120,344 118,345 115,357 116,360 115,360 114,363 112,361 111,363 110,374 112,377 112,381 116,382 118,384 116,386 114,386 116,388 115,392 113,392 113,389 109,389 108,386 107,385 103,387 100,386 100,387 98,389 97,389 96,388 94,390 91,389 90,390 91,384 90,384 91,381 89,381 90,379 89,374 87,361Z","Valparaíso":"M-707,255 -704,256 -708,258 -707,255Z M89,412 90,409 90,405 91,405 90,404 92,402 91,399 92,395 90,390 91,389 94,390 96,388 97,389 100,387 100,386 103,387 107,385 108,386 109,389 113,389 113,392 115,392 117,393 117,396 119,397 120,399 118,401 119,404 122,409 121,412 118,414 117,416 113,412 111,414 109,410 107,410 107,409 104,409 101,411 101,416 97,417 96,421 94,422 94,427 92,429 93,431 92,432 90,431 89,434 86,436 83,436 84,434 84,432 87,430 88,426 86,422 87,419 85,414 87,414 87,412 89,412Z","RM":"M107,409 107,410 110,410 111,414 114,412 117,416 120,413 122,420 124,418 126,419 127,421 125,425 124,432 125,435 124,437 126,438 125,441 126,443 126,444 124,445 123,444 121,445 121,443 119,442 119,439 115,439 114,435 113,434 108,436 107,435 105,436 105,438 102,440 103,441 100,442 97,442 95,438 93,440 92,438 89,437 89,438 86,437 89,434 90,431 92,432 93,431 92,429 94,427 94,422 96,421 97,417 101,416 101,411 107,409Z","Los Lagos":"M22,688 26,691 22,693 20,690 22,688Z M46,659 51,664 46,661 46,659Z M40,643 38,645 49,644 47,647 52,655 45,659 47,663 42,663 43,660 42,665 49,672 46,670 47,672 43,671 49,678 44,677 45,683 41,682 41,686 29,682 35,671 34,662 38,646 37,643 40,643Z M62,635 58,636 58,641 56,643 43,642 45,638 47,639 52,635 46,638 44,635 45,638 41,634 39,622 44,610 44,602 57,605 67,614 84,611 81,615 84,624 82,632 86,651 82,653 76,652 80,661 76,667 78,673 86,680 86,683 81,685 83,689 89,692 85,696 87,700 86,703 83,699 78,700 74,697 73,693 69,696 64,695 63,692 62,694 58,694 62,691 58,689 58,683 62,681 62,676 65,678 62,669 63,662 70,664 62,656 68,653 72,661 70,654 73,653 70,652 71,648 67,650 62,646 66,641 73,639 74,632 72,640 68,641 62,635Z","Los Ríos":"M62,577 62,578 61,581 62,580 66,582 69,581 69,582 73,583 75,582 74,583 75,583 82,580 86,583 87,592 89,593 87,597 87,599 84,598 84,601 85,604 87,603 87,605 85,607 84,607 83,610 81,612 67,614 66,612 64,611 61,607 57,605 50,605 49,603 46,604 44,602 45,599 44,596 49,592 50,594 51,594 51,593 53,595 54,593 54,594 54,592 56,594 56,593 53,592 53,592 55,590 56,591 54,590 54,589 57,588 55,588 56,586 56,587 56,586 56,587 55,586 56,585 55,586 55,587 54,587 54,588 54,588 53,589 53,589 53,592 52,591 52,592 51,592 50,588 54,584 54,580 56,580 58,577 62,577Z","Araucanía":"M64,532 66,533 67,534 70,534 72,539 75,540 78,543 81,543 83,545 86,544 86,550 87,551 88,549 92,548 93,545 99,545 101,548 100,550 101,554 105,559 103,563 99,563 92,568 93,577 91,579 91,582 90,583 91,584 90,586 88,586 86,583 82,580 75,583 74,583 75,582 73,583 69,582 69,581 66,582 62,580 61,581 62,577 58,577 56,580 54,580 55,579 54,576 49,560 48,556 51,554 53,556 52,552 57,548 57,546 55,544 56,542 56,540 58,538 58,536 57,536 56,535 57,533 64,532Z","Biobío":"M53,551 52,553 53,556 51,554 48,556 49,545 45,536 45,533 47,529 45,526 47,521 48,522 51,523 55,521 56,518 55,517 56,513 54,511 56,510 56,509 56,507 57,509 59,510 60,507 59,506 59,504 60,505 61,502 63,502 63,506 68,510 68,512 69,513 66,515 72,514 76,517 74,519 74,522 82,522 84,520 89,520 89,517 90,517 92,519 99,520 99,522 96,524 99,530 98,532 97,535 98,538 97,539 99,540 99,542 101,546 93,545 92,548 88,549 87,551 86,550 86,544 83,545 81,543 78,543 75,540 72,539 70,534 66,534 66,533 65,533 64,532 57,533 56,535 57,536 58,536 58,538 56,540 56,542 55,544 57,546 57,548 53,551Z","Ñuble":"M73,515 70,514 69,515 66,515 69,513 68,512 68,510 63,506 63,502 61,502 64,490 70,492 70,494 72,494 73,496 71,496 72,497 73,496 74,497 75,496 77,497 78,494 81,497 84,497 86,500 91,501 94,505 95,502 96,503 99,500 100,501 100,507 101,509 100,509 99,508 98,512 97,512 98,513 98,514 99,515 99,516 96,516 99,520 92,519 90,517 89,517 89,520 84,520 82,522 74,522 74,519 76,518 73,515Z","Maule":"M79,456 82,459 84,459 86,462 87,460 93,462 93,460 95,458 97,460 98,458 99,459 100,458 102,461 106,460 109,464 111,462 112,464 114,464 114,468 111,469 110,471 113,472 113,476 114,478 113,478 114,480 113,481 114,485 116,485 113,487 113,488 114,488 113,490 114,491 113,494 112,495 110,494 107,497 107,502 103,501 103,503 102,504 100,503 100,501 99,500 96,503 95,502 94,505 91,501 86,500 84,497 81,497 78,494 77,497 75,496 74,497 73,496 72,497 71,496 73,496 73,495 69,494 70,492 64,491 63,490 68,485 67,479 70,476 69,474 71,472 72,470 76,467 76,461 79,456Z","O'Higgins":"M79,450 81,445 80,441 83,435 89,438 89,437 92,438 93,440 95,438 97,442 100,442 103,441 102,440 105,438 105,436 107,435 108,436 113,434 114,435 115,439 119,439 119,442 121,444 122,448 119,450 118,456 116,457 117,459 114,464 112,464 111,462 109,464 106,460 102,461 100,458 99,459 98,458 97,460 95,458 93,460 93,462 87,460 86,462 84,459 82,459 79,456 79,450Z"},"centroids":{"Arica y Parinacota":[132,23],"Tarapacá":[137,75],"Antofagasta":[136,171],"Magallanes":[57,899],"Aysén":[43,768],"Atacama":[127,259],"Coquimbo":[104,353],"Valparaíso":[100,409],"RM":[109,430],"Los Lagos":[67,658],"Los Ríos":[62,592],"Araucanía":[74,559],"Biobío":[69,529],"Ñuble":[83,507],"Maule":[94,482],"O'Higgins":[101,449]}}};
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

class Component extends MiniLogic {
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


const app = new Component({});
app._render();
