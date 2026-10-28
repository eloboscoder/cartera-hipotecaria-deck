"""Ensambla source/Main.dc.html (archivo de canvas de Claude) a partir de source/canvas-src/ y data/data_verified.json.

Uso:  python3 source/assemble.py
"""
import json, pathlib
R = pathlib.Path(__file__).resolve().parent
P = R / 'canvas-src'
css_base = (P/'css_base.css').read_text()
css_extra = (P/'css_extra.css').read_text()
css_base = css_base.replace(".stage{\n  position:relative; width:100%; height:100vh; min-height:560px; overflow:hidden;\n  background:radial-gradient(ellipse 70% 60% at 100% 0%, var(--bg2), transparent 65%), var(--bg);",
  ".stage{\n  position:relative; width:100%; height:100vh; min-height:560px; overflow:hidden;\n  background-color:var(--bg); background-image:radial-gradient(ellipse 70% 60% at 100% 0%, var(--bg2), transparent 65%);")
css_base = css_base.replace(".fade-el{opacity:1; transform:none; animation:fadeUpFallback 700ms var(--ease) both;}", ".fade-el{opacity:1; transform:none; animation:fadeUpFallback 700ms var(--ease) backwards;}")
css_base = css_base.replace(".pop-el{opacity:1; transform:none; animation:popInFallback 600ms var(--ease) both;}", ".pop-el{opacity:1; transform:none; animation:popInFallback 600ms var(--ease) backwards;}")
css_extra = css_extra.replace(".reco{ animation:flipIn 900ms var(--ease) both;", ".reco{ animation:flipIn 900ms var(--ease) backwards;")
tpl = (P/'template.html').read_text()
data_obj = json.loads((R.parent/'data'/'data_verified.json').read_text())
data = 'const DATA = ' + json.dumps(data_obj, ensure_ascii=False, separators=(',',':')) + ';'
js = (P/'script_body.js').read_text()
head = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Cartera Hipotecaria 2025–2026 — Lectura Ejecutiva</title>
<script src="./support.js"></script>
<script src="/_blob/8e9165669943580e825ea7bde3763ce6"></script>
<script src="/_blob/408636b96d75049aa7dbedc6b3eff745"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Anton&family=Permanent+Marker&display=swap">
<style>'''
out = head + css_base + css_extra + '</style>\n</helmet>\n\n' + tpl + '\n</x-dc>\n<script type="text/x-dc" data-dc-script data-props=\'{"$preview":{"width":1440,"height":900}}\'>\n' + data + '\n' + js + '</script>\n</body>\n</html>\n'
(R/'Main.dc.html').write_text(out)
print('Main.dc.html', len(out))
