#!/usr/bin/env python3
"""Собирает PWA-версию в docs/ из единственного исходника vibe-tracker.html.

Что делает:
  1. Компилирует Tailwind-утилиты в docs/tailwind.css (вместо play-CDN).
  2. Копирует Chart.js в docs/vendor/ (чтобы приложение работало офлайн).
  3. Оборачивает страницу в полноценный HTML-документ с манифестом, мета-тегами
     для iOS/Android и регистрацией service worker.
  4. Проставляет в sw.js версию кэша = хэш содержимого, чтобы телефоны получали обновления.

Запуск:  npm install && npm run build:pwa
"""
import hashlib, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'vibe-tracker.html', ROOT / 'docs'

TW_CDN = '<script src="https://cdn.tailwindcss.com/3.4.17"></script>'
TW_CFG = re.compile(r'<script>\s*// Tailwind используется.*?</script>\n', re.S)
CHART_CDN = '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"></script>'

HEAD = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#08070f">
<meta name="description" content="Геймифицированный трекер привычек с аналитикой и прогнозами">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Вайб-Трекер">
<style>
  /* Отступы под вырез/полосу статуса: в артефакте их даёт обёртка, здесь задаём сами */
  :root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);background:#08070f}
  [hidden]{display:none!important}
  img{max-width:100%}
  html{-webkit-tap-highlight-color:transparent}
</style>
<link rel="stylesheet" href="tailwind.css">
"""
TAIL = """
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
</script>
</body>
</html>
"""

def main():
    src = SRC.read_text(encoding='utf-8')
    for needle in (TW_CDN, CHART_CDN):
        if needle not in src:
            sys.exit(f'В исходнике не найден тег: {needle}')
    subprocess.run(['npx', 'tailwindcss', '-c', 'tools/tailwind.config.cjs', '-i', 'tools/tailwind.in.css',
                    '-o', str(OUT / 'tailwind.css'), '--minify'], cwd=ROOT, check=True)
    shutil.copy(ROOT / 'node_modules/chart.js/dist/chart.umd.js', OUT / 'vendor/chart.umd.js')

    body = TW_CFG.sub('', src.replace(TW_CDN, ''))
    body = body.replace(CHART_CDN, '<script src="vendor/chart.umd.js"></script>')
    # <title>, шрифты и <style> исходника идут в <head>, остальное — в <body>
    split = body.index('</style>') + len('</style>')
    html = HEAD + body[:split] + '\n</head>\n<body>\n' + body[split:] + TAIL
    (OUT / 'index.html').write_text(html, encoding='utf-8')

    h = hashlib.sha256()
    for f in ('index.html', 'tailwind.css', 'vendor/chart.umd.js', 'manifest.webmanifest'):
        h.update((OUT / f).read_bytes())
    sw = (OUT / 'sw.js').read_text(encoding='utf-8')
    sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'vt-{h.hexdigest()[:10]}';", sw)
    (OUT / 'sw.js').write_text(sw, encoding='utf-8')
    print('PWA собрана в docs/, версия кэша', h.hexdigest()[:10])

if __name__ == '__main__':
    main()
