import { chromium } from '@playwright/test';
const BASE = 'http://127.0.0.1:3010';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

// hero headline visibility
const h1 = p.locator('h1.type-display').first();
const h1box = await h1.boundingBox();
const h1text = (await h1.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
const h1opacity = await h1.evaluate((el) => getComputedStyle(el).opacity);
console.log('HERO h1  text=', JSON.stringify(h1text), ' box=', h1box && `${Math.round(h1box.width)}x${Math.round(h1box.height)}`, ' opacity=', h1opacity);

// a word span inside TextReveal
const word = p.locator('h1.type-display span span span').first();
const wbox = await word.boundingBox().catch(() => null);
const wtransform = await word.evaluate((el) => getComputedStyle(el).transform).catch(() => 'n/a');
console.log('word span box=', wbox && `${Math.round(wbox.width)}x${Math.round(wbox.height)}`, ' transform=', wtransform);

await p.screenshot({ path: 'C:/tmp/rd_hero_vp.png' });

// scroll to How It Works and shoot
await p.evaluate(() => document.getElementById('how-it-works')?.scrollIntoView());
await p.waitForTimeout(1000);
const hiw = p.locator('#how-it-works h2.type-h1').first();
console.log('HOW-IT-WORKS h2 text=', JSON.stringify((await hiw.innerText().catch(()=>'')).slice(0,60)), ' opacity=', await hiw.evaluate((el)=>getComputedStyle(el).opacity).catch(()=>'n/a'));
await p.screenshot({ path: 'C:/tmp/rd_hiw_vp.png' });

await p.evaluate(() => document.getElementById('services')?.scrollIntoView());
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/tmp/rd_services_vp.png' });

await p.evaluate(() => document.getElementById('contact')?.scrollIntoView());
await p.waitForTimeout(1000);
await p.screenshot({ path: 'C:/tmp/rd_cta_vp.png' });

await b.close();
