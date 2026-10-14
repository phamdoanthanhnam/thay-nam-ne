const { chromium } = require('playwright');
(async()=>{ const b = await chromium.launch(); const fs=require('fs');
 // icons
 const ip = await b.newPage(); for (const s of [192,512]){ await ip.setViewportSize({width:s,height:s}); await ip.setContent(`<body style="margin:0"><img src="data:image/svg+xml;base64,${fs.readFileSync('public/icon.svg').toString('base64')}" width=${s} height=${s}>`); await ip.screenshot({path:`public/icon-${s}.png`}); }
 const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'vi-VN'});
 const p = await ctx.newPage(); await p.goto('http://localhost:8787/'); await p.waitForTimeout(800);
 fs.mkdirSync('frames',{recursive:true});
 await p.screenshot({path:'screens/01-trang-chinh.png'}); await p.screenshot({path:'frames/1.png'});
 await p.click('#tPhoto'); await p.waitForTimeout(300); await p.screenshot({path:'screens/02-chup-bai.png'}); await p.screenshot({path:'frames/2.png'});
 await p.click('#tType'); await p.selectOption('#genre','ta');
 await p.fill('#txt','con mèo nhà em rất đẹp. con mèo có bộ lông màu vàng , nó thích nằm sưởi nắng'); await p.dispatchEvent('#txt','input');
 await p.screenshot({path:'frames/3.png'});
 await p.click('#fixBtn'); await p.waitForSelector('#result:not(.hide)'); await p.waitForTimeout(900);
 await p.screenshot({path:'screens/03-ket-qua.png'}); await p.screenshot({path:'frames/4.png'});
 await p.locator('#weakCard').scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await p.screenshot({path:'screens/04-diem-yeu-loi-khen.png'}); await p.screenshot({path:'frames/5.png'});
 await p.locator('#guide').scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await p.screenshot({path:'screens/05-huong-dan-video.png'});
 await ctx.setOffline(true); await p.evaluate(()=>dispatchEvent(new Event('offline'))); await p.waitForTimeout(300); await p.evaluate(()=>scrollTo(0,0)); await p.screenshot({path:'screens/06-mat-mang.png'});
 await p.screenshot({path:'screens/00-full.png',fullPage:true}).catch(()=>{});
 console.log(await p.textContent('#stat')); await b.close(); })();
