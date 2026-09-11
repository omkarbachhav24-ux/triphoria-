import { chromium } from '@playwright/test';
const BASE = process.env.RD_BASE || 'http://127.0.0.1:3010';
const routes = (process.env.RD_ROUTES || '/').split(',');
const vps = [
  { w: 1440, h: 900, tag: 'desktop' },
  { w: 768, h: 1024, tag: 'tablet' },
  { w: 375, h: 812, tag: 'mobile' },
];
const b = await chromium.launch();
const errs = [];
for (const r of routes) {
  for (const vp of vps) {
    const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`${r} ${vp.tag} pageerror: ${e.message}`));
    p.on('console', (m) => {
      if (m.type() === 'error' && !/favicon|404 \(Not Found\).*\.(png|svg|jpg)/i.test(m.text()))
        errs.push(`${r} ${vp.tag} console: ${m.text().slice(0, 160)}`);
    });
    await p.goto(BASE + r, { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(900);
    const slug = r.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
    const file = `/tmp/rd_${slug}_${vp.tag}.png`;
    await p.screenshot({ path: file, fullPage: vp.tag === 'desktop' });
    const bodyOverflow = await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    console.log(`  ${r.padEnd(16)} ${vp.tag.padEnd(8)} -> ${file}  hOverflow=${bodyOverflow}px`);
    await ctx.close();
  }
}
await b.close();
console.log(errs.length ? '\nISSUES:\n' + errs.join('\n') : '\nno pageerrors / console errors');
process.exit(errs.length ? 1 : 0);
