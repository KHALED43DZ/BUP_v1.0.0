document.addEventListener("DOMContentLoaded", () => {
  const B = window.BIZ; if (!B) return;
  const { biz, offer, sale, num, THEMES, save } = B;
  const N = n => B.num(n).replace(/ /g, "\u00A0");
  const LPD = { lpHead: "إعلانات فيديو بالدارجة لمتجرك", lpSub: "", lpCta: "تواصل معنا على واتساب", lpSteps: "أرسل صور منتجك | ترسل لنا صور المنتج ومعلوماته والسعر أو العرض الذي تريد الترويج له.\nنجهّز لك معاينة | نكتب لك السيناريو ونجهّز نسخة معاينة لتشاهدها.\nتستلم إعلانك | بعد تأكيد الدفع نسلمك الإعلان الجاهز للنشر.", lpFaq: "", lpUrl: "", lpDisc: "yes", lpPrices: "yes" };
  biz.lp = Object.assign({}, LPD, biz.lp); biz.unsel = biz.unsel || [];
  const lum = h => { const c = parseInt(h.slice(1), 16); return (0.299 * (c >> 16) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255; };
  const intl = p => { const d = String(p || "").replace(/[^\d+]/g, ""); if (d.startsWith("+")) return d.slice(1); if (d.startsWith("00")) return d.slice(2); if (/^0\d{9}$/.test(d)) return "213" + d.slice(1); return d; };

  /* ---- minimal ZIP writer (store, UTF-8 names) ---- */
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = crcT[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipStore(files) {
    const enc = new TextEncoder(), chunks = [], cd = []; let off = 0;
    const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
    files.forEach(f => {
      const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      const lh = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(sz), ...u32(sz), ...u16(nm.length), 0, 0]);
      chunks.push(lh, nm, f.data); cd.push({ nm, crc, sz, off }); off += lh.length + nm.length + sz;
    });
    const start = off;
    cd.forEach(e => {
      const h = new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(e.crc), ...u32(e.sz), ...u32(e.sz), ...u16(e.nm.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(e.off)]);
      chunks.push(h, e.nm); off += h.length + e.nm.length;
    });
    chunks.push(new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(cd.length), ...u16(cd.length), ...u32(off - start), ...u32(start), 0, 0]));
    return new Blob(chunks, { type: "application/zip" });
  }

  /* ---- assets ---- */
  const poster = blob => new Promise(ok => {
    const v = document.createElement("video"), u = URL.createObjectURL(blob);
    const done = r => { URL.revokeObjectURL(u); ok(r); };
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.3, (v.duration || 1) / 2); } catch (e) { done(null); } };
    v.onseeked = () => {
      try { const s = Math.min(1, 480 / v.videoWidth), c = document.createElement("canvas"); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s); c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); c.toBlob(b => done(b), "image/jpeg", .8); } catch (e) { done(null); }
    };
    v.onerror = () => done(null); v.src = u; setTimeout(() => done(null), window.__posterTimeout || 8000);
  });
  async function ogBlob() {
    const f = biz.f, th = THEMES[f.bTheme] || THEMES.green, acc = f.bColor || "#22b573", c = document.createElement("canvas"); c.width = 1200; c.height = 630;
    const x = c.getContext("2d"), fam = "Cairo, Tahoma, 'Segoe UI', sans-serif";
    const g = x.createLinearGradient(0, 0, 1200, 630); g.addColorStop(0, th.a); g.addColorStop(1, th.b); x.fillStyle = g; x.fillRect(0, 0, 1200, 630);
    x.fillStyle = acc; x.fillRect(0, 0, 1200, 14); x.direction = "rtl"; x.textAlign = "center";
    const fit = (t, px, w, mw) => { let s = px; x.font = `${w} ${s}px ${fam}`; while (x.measureText(t).width > mw && s > 20) { s -= 2; x.font = `${w} ${s}px ${fam}`; } };
    x.fillStyle = th.t; fit(f.bName || "", 92, "bold", 1040); x.fillText(f.bName || "", 600, 230);
    x.fillStyle = acc; fit(biz.lp.lpHead, 56, "bold", 1040); x.fillText(biz.lp.lpHead, 600, 340);
    x.fillStyle = th.m; fit(f.bSlogan || "", 38, "normal", 1040); x.fillText(f.bSlogan || "", 600, 420);
    x.fillStyle = th.t; fit(f.bPhone ? "واتساب: " + f.bPhone : "", 48, "bold", 1040); x.fillText(f.bPhone ? "واتساب: " + f.bPhone : "", 600, 540);
    return new Promise(ok => c.toBlob(ok, "image/jpeg", .85));
  }

  /* ---- site builder (design modelled on the reference landing page) ---- */
  const hex2 = h => { const c = parseInt(h.slice(1), 16); return [c >> 16, (c >> 8) & 255, c & 255]; };
  const rgba = (h, a) => { const [r, g, b] = hex2(h); return `rgba(${r},${g},${b},${a})`; };
  const lighten = (h, t) => "#" + hex2(h).map(v => Math.round(v + (255 - v) * t).toString(16).padStart(2, "0")).join("");
  const WA_PATH = "M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z", CAM_PATH = "M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4zm-8 12.5v-7l6 3.5-6 3.5z";
  const WA_SVG = `<svg viewBox="0 0 24 24"><path d="${WA_PATH}"/></svg>`, PLAY_SVG = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
  const durOf = b => Promise.race([mediaDur(b), new Promise(r => setTimeout(() => r(0), window.__posterTimeout || 4000))]);

  async function buildSite(preview) {
    const f = biz.f, lp = biz.lp, th = THEMES[f.bTheme] || THEMES.green, acc = f.bColor || "#22b573", acc2 = lighten(acc, .35), o = offer();
    const light = f.bTheme === "light", on = lum(acc) > .6 ? "#10190f" : "#ffffff";
    const items = ((await B.getPort()) || []).sort((a, b) => b.created - a.created).filter(w => !biz.unsel.includes(w.id));
    const files = [], urls = {}, warn = []; let total = 0;
    const add = async (name, blob) => { total += blob.size || 0; if (preview) urls[name] = URL.createObjectURL(blob); else files.push({ name, data: new Uint8Array(await blob.arrayBuffer()) }); };
    const P = n => urls[n] || n, cards = [];
    for (let i = 0; i < items.length; i++) {
      const w = items[i], vn = "videos/ad-" + (i + 1) + ".mp4", pn = "posters/ad-" + (i + 1) + ".jpg";
      await add(vn, w.blob); if (w.blob.size > 8 * 1048576) warn.push(w.title + ": " + (w.blob.size / 1048576).toFixed(1) + " MB");
      const pb = await poster(w.blob); if (pb) await add(pn, pb);
      cards.push({ w, vn, pn: pb ? pn : "", dur: Math.round(await durOf(w.blob)) });
    }
    if (biz.logo) { try { await add("logo.png", await (await fetch(biz.logo)).blob()); } catch (e) { } }
    await add("og.jpg", await ogBlob());
    const hasLogo = !!(urls["logo.png"] || files.some(x => x.name === "logo.png"));
    const wa = intl(f.bPhone), brand = f.bName || "خدمة الإعلانات", base = lp.lpUrl ? lp.lpUrl.replace(/\/?$/, "/") : "", desc = lp.lpSub || f.bSlogan || lp.lpHead;
    const tagsOf = c => (c.w.tags && c.w.tags.length ? c.w.tags : ["إعلان"]);
    const tags = [...new Set(cards.flatMap(tagsOf))];
    const steps = lp.lpSteps.split("\n").map(s => s.trim()).filter(Boolean).map(s => { const a = s.split("|").map(x => x.trim()); return { t: a[0], d: a[1] || "" }; });
    const faq = lp.lpFaq.split("\n").map(l => l.split("|").map(s => s.trim())).filter(a => a[0] && a[1]);
    const pk = lp.lpPrices === "yes" ? biz.pkgs.filter(p => p.name || p.price) : [];
    const typeOpts = [...$("#type").options].map(x => x.textContent).concat("نوع آخر");
    const A = esc, offerMsg = o.text ? "سلام، حاب نستفيد من العرض (" + o.text + ") ونطلب فيديو إعلاني بالدارجة لمتجري." : "سلام، حاب نطلب فيديو إعلاني بالدارجة لمتجري.";
    const priceTxt = p => { const sp = sale(p, o.d), pr = +p.price || 0; return pr ? N(sp || pr) + " دج" : ""; };
    const card = light ? "#ffffff" : "rgba(255,255,255,.055)", line = light ? "rgba(0,0,0,.1)" : "rgba(255,255,255,.1)";
    const nav = [cards.length && ["#work", "نماذج أعمالنا"], pk.length && ["#prices", "الأسعار"], steps.length && ["#steps", "كيف نعمل"], ["#order", "اطلب إعلانك"]].filter(Boolean);
    const css = `:root{--bg:${th.b};--bg2:${th.a};--ink:${th.t};--mut:${th.m};--card:${card};--line:${line};--acc:${acc};--acc2:${acc2};--on:${on};--wa:#25D366}
*{box-sizing:border-box;margin:0}html{scroll-behavior:smooth}[hidden]{display:none!important}
body{background:var(--bg);color:var(--ink);font-family:Cairo,Tajawal,"Segoe UI",system-ui,sans-serif;line-height:1.7;overflow-x:hidden}
a{color:inherit;text-decoration:none}button{font:inherit;cursor:pointer;border:0;color:inherit}img,video{max-width:100%}
.wrap{max-width:1120px;margin:0 auto;padding:0 18px}.gt{background:linear-gradient(135deg,var(--acc2),var(--acc));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.gbg{background:linear-gradient(135deg,var(--acc2),var(--acc));color:var(--on)}
header{position:fixed;top:0;left:0;right:0;z-index:40;background:${rgba(th.b, .86)};-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
header .bar{height:4px;background:var(--acc)}.nav{display:flex;align-items:center;justify-content:space-between;height:72px}
.ls{display:flex;align-items:center;gap:12px}.lbox{width:46px;height:46px;border-radius:14px;border:1px solid ${rgba(acc, .4)};background:var(--card);display:grid;place-items:center;overflow:hidden}.lbox img{width:100%;height:100%;object-fit:contain;padding:3px}.lbox svg{width:26px;height:26px;fill:currentColor}
.bn{font-size:1.4rem;font-weight:900;line-height:1}.bt{font-size:.72rem;color:var(--mut);margin-top:4px}
nav.dt{display:none;gap:28px;font-weight:700;font-size:.92rem;color:var(--mut)}nav.dt a:hover{color:var(--acc)}
.wab{display:none;align-items:center;gap:8px;background:var(--wa);color:#04210f;font-weight:900;border-radius:12px;padding:9px 18px;font-size:.9rem}.wab svg{width:16px;height:16px;fill:currentColor}
.burger{width:44px;height:44px;border-radius:12px;background:var(--card);border:1px solid var(--line);font-size:1.3rem}.right{display:flex;align-items:center;gap:12px}
#mm{display:none;background:${rgba(th.b, .97)};border-bottom:1px solid var(--line);padding:8px 18px 18px}#mm.on{display:block}#mm a{display:block;padding:11px 14px;border-radius:12px;font-weight:700;color:var(--mut)}
@media(min-width:768px){nav.dt{display:flex}.burger,#mm{display:none!important}}@media(min-width:640px){.wab{display:inline-flex}}
.hero{padding:128px 0 64px;text-align:center;background:radial-gradient(circle at 50% 12%,${rgba(acc, .2)},transparent 55%),radial-gradient(circle at 82% 40%,${rgba(acc2, .13)},transparent 50%)}
.lc{display:inline-flex;flex-direction:column;align-items:center;padding:14px 22px;border-radius:24px;background:var(--card);border:1px solid ${rgba(acc, .3)};box-shadow:0 20px 50px ${rgba(acc, .12)};margin-bottom:22px}.lc img{height:104px;width:auto;object-fit:contain}
.fb{display:flex;align-items:center;gap:12px}.ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center}.ic svg{width:30px;height:30px;fill:currentColor}.nm{font-size:2.3rem;font-weight:900}
.pill{margin-top:10px;padding:2px 16px;border-radius:999px;border:1px solid ${rgba(acc, .4)};font-size:.8rem;font-weight:800;color:var(--acc2)}
h1{font-size:clamp(1.9rem,6.5vw,3.5rem);font-weight:900;line-height:1.25;color:var(--acc);margin-bottom:12px;text-shadow:0 2px 18px ${rgba(acc, .35)}}
.t1{font-size:clamp(1.1rem,3.2vw,1.6rem);font-weight:800;margin-bottom:10px}.lead{max-width:680px;margin:0 auto 28px;color:var(--mut);font-size:1.05rem}
.promo{max-width:780px;margin:0 auto 32px;padding:12px 24px;border-radius:999px;font-weight:900;font-size:clamp(.95rem,2.4vw,1.25rem);color:var(--on);background:linear-gradient(90deg,var(--acc),var(--acc2),var(--acc));background-size:200% auto;animation:shine 4s linear infinite;box-shadow:0 18px 40px ${rgba(acc, .3)}}
.cta{display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center}@media(min-width:640px){.cta{flex-direction:row}}
.b{display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:16px;font-weight:900;padding:15px 30px;font-size:1.05rem;transition:.2s;width:100%}@media(min-width:640px){.b{width:auto}}
.b svg{width:24px;height:24px;fill:currentColor}.b.wa{background:var(--wa);color:#04210f;animation:ring 2.4s infinite}.b.wa:hover{filter:brightness(1.1)}
.b.gh{background:var(--card);border:1px solid ${rgba(acc, .4)};color:var(--ink)}.b.gh i{width:28px;height:28px;border-radius:50%;display:grid;place-items:center}.b.gh svg{width:16px;height:16px}
section{padding:72px 0;border-top:1px solid var(--line)}.alt{background:${light ? "rgba(0,0,0,.025)" : "rgba(255,255,255,.025)"}}
.sh{text-align:center;max-width:720px;margin:0 auto 40px}.k{display:inline-block;font-weight:800;font-size:.85rem;color:var(--acc);margin-bottom:6px}.kb{padding:2px 16px;border-radius:999px;background:${rgba(acc, .14)}}
h2{font-size:clamp(1.6rem,4.5vw,2.3rem);font-weight:900;line-height:1.3}.sh p{color:var(--mut);margin-top:8px}
.pg{display:grid;gap:26px}@media(min-width:768px){.pg{grid-template-columns:1fr 1fr}}
.pk{position:relative;border-radius:26px;background:var(--card);border:1px solid var(--line);padding:30px 34px 30px 30px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;transition:.25s}.pk:hover{border-color:${rgba(acc, .6)}}
.pk:before{content:"";position:absolute;top:0;bottom:0;right:0;width:8px;background:var(--acc)}
.ph{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:18px}.ph h3{font-size:1.5rem;font-weight:900;line-height:1.3}.ph p{color:var(--mut);margin-top:4px}
.pb{flex:none;text-align:left;border-radius:16px;padding:8px 16px;background:${rgba(th.b, .55)};border:1px solid var(--line)}.pb s{display:block;color:var(--mut);font-weight:700}.pb b{display:block;font-size:1.8rem;font-weight:900;color:var(--acc);line-height:1.2;white-space:nowrap}
.of{margin-bottom:18px;padding:10px 14px;border-radius:12px;background:${rgba(acc, .14)};border:1px solid ${rgba(acc, .4)};font-weight:800;font-size:.92rem}
.pk ul{list-style:none;padding:0;margin:0 0 26px;display:grid;gap:10px;color:var(--mut);font-size:.95rem}.pk li:before{content:"✓";color:var(--acc);font-weight:900;margin-inline-end:10px}
.pk .b{width:100%;padding:14px 14px;font-size:.98rem}
.fl{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-bottom:36px}.fl button{padding:9px 20px;border-radius:12px;background:var(--card);border:1px solid var(--line);font-weight:700;color:var(--mut)}.fl button.on{background:var(--acc);color:var(--on);border-color:transparent;font-weight:800;box-shadow:0 8px 20px ${rgba(acc, .25)}}
.sg{display:flex;flex-wrap:wrap;justify-content:center;gap:22px}.vc{flex:1 1 100%;max-width:100%}@media(min-width:560px){.vc{flex:0 1 calc(50% - 11px)}}@media(min-width:960px){.vc{flex:0 1 calc(25% - 17px)}}
.vc{border-radius:24px;background:var(--card);border:1px solid var(--line);overflow:hidden;display:flex;flex-direction:column;transition:.25s}.vc:hover{border-color:${rgba(acc, .6)}}
.vt{position:relative;aspect-ratio:9/14;padding:16px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;background:linear-gradient(160deg,${rgba(acc, .35)},var(--bg2) 60%,var(--bg));background-size:cover;background-position:center;color:#fff}
.vt .r{display:flex;justify-content:space-between;gap:8px}.chp{padding:2px 12px;border-radius:999px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);font-size:.75rem;font-weight:800;color:var(--acc2)}.du{padding:2px 10px;border-radius:8px;background:var(--acc);color:var(--on);font-size:.75rem;font-weight:900}
.pl{margin:auto;display:grid;justify-items:center;gap:8px}.pl i{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;box-shadow:0 10px 30px #0006;transition:.2s;color:var(--on)}.vc:hover .pl i{transform:scale(1.1)}.pl i svg{width:30px;height:30px;fill:currentColor}.pl span{font-size:.75rem;font-weight:800;background:rgba(0,0,0,.55);padding:2px 14px;border-radius:999px}
.ex{background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);padding:10px 12px;border-radius:16px;font-size:.78rem;line-height:1.6}
.vi{padding:18px}.vi h3{font-size:1.1rem;font-weight:900}.vi button{margin-top:12px;width:100%;padding:10px;border-radius:12px;background:var(--bg);font-weight:800;font-size:.9rem;color:var(--ink)}.vi button:hover{background:var(--acc);color:var(--on)}
.st{display:grid;gap:24px}@media(min-width:768px){.st{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}}
.sc{padding:30px;border-radius:24px;background:var(--card);border:1px solid var(--line)}.sn{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;font-size:1.5rem;font-weight:900;margin-bottom:18px}.sc h3{font-size:1.2rem;font-weight:900;margin-bottom:8px}.sc p{color:var(--mut);font-size:.92rem}
.fq{max-width:760px;margin:0 auto;display:grid;gap:10px}.fq details{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 18px}.fq summary{cursor:pointer;font-weight:800}.fq p{color:var(--mut);margin-top:8px}
.fm{max-width:760px;margin:0 auto;border-radius:26px;background:var(--card);border:1px solid var(--line);padding:34px 30px 30px;position:relative;overflow:hidden;box-shadow:0 25px 60px #0003}.fm:before{content:"";position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,var(--acc),var(--acc2))}
.fm .g{display:grid;gap:18px;margin-bottom:18px}@media(min-width:640px){.fm .g{grid-template-columns:1fr 1fr}}.fm label{display:block;font-weight:800;font-size:.9rem;margin-bottom:6px}
.fm input,.fm select,.fm textarea{width:100%;padding:13px 14px;border-radius:12px;background:var(--bg);color:var(--ink);border:1px solid var(--line);font:inherit}.fm input:focus,.fm select:focus,.fm textarea:focus{outline:2px solid var(--acc)}.fm .b{width:100%;margin-top:18px}
footer{padding:56px 0 96px;border-top:2px solid ${rgba(acc, .5)};text-align:center}.fn{display:inline-flex;gap:12px;align-items:center;font-size:clamp(1.5rem,4vw,2rem);font-weight:900}.fn small{color:var(--acc2);font-size:1.1rem}
.fbr{font-weight:800;color:var(--mut);margin:14px 0 22px}.fln{display:flex;flex-wrap:wrap;justify-content:center;gap:22px;color:var(--mut);font-size:.88rem;border-top:1px solid var(--line);padding-top:22px}.dis{margin-top:16px;color:var(--mut);font-size:.82rem}
.fab{position:fixed;bottom:20px;left:20px;z-index:40;display:flex;align-items:center;gap:10px;background:var(--wa);color:#04210f;font-weight:900;padding:13px 16px;border-radius:999px;box-shadow:0 14px 34px #0007;animation:ring 2.4s infinite}.fab svg{width:26px;height:26px;fill:currentColor}.fab span{display:none;font-size:.9rem}@media(min-width:640px){.fab span{display:inline}}
#md{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.85);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);padding:16px}#md.on{display:flex}
.mb{width:100%;max-width:420px;background:var(--bg2);border:1px solid var(--line);border-radius:24px;overflow:hidden}.mh{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line)}.mh h4{font-weight:900}.mh span{font-size:.75rem;font-weight:800;color:var(--acc2)}
.mx{width:36px;height:36px;border-radius:50%;background:var(--bg)}.mx:hover{background:var(--acc);color:var(--on)}#mw{aspect-ratio:9/16;max-height:62vh;width:100%;background:#000;margin:0 auto}.mf{padding:14px;background:var(--bg);display:flex;justify-content:space-between;align-items:center;gap:10px}.mf span{font-size:.78rem;font-weight:700;color:var(--mut)}.mf button{padding:9px 14px;border-radius:12px;background:var(--wa);color:#04210f;font-weight:900;font-size:.78rem}
@keyframes ring{0%{transform:scale(.96);box-shadow:0 0 0 0 rgba(37,211,102,.6)}70%{transform:scale(1);box-shadow:0 0 0 15px rgba(37,211,102,0)}100%{transform:scale(.96);box-shadow:0 0 0 0 rgba(37,211,102,0)}}
@keyframes shine{0%{background-position:200% center}100%{background-position:-200% center}}`;
    const logoBox = hasLogo ? `<img src="${P("logo.png")}" alt="${A(brand)}">` : `<svg viewBox="0 0 24 24"><path d="${CAM_PATH}"/></svg>`;
    const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${A(brand)} | ${A(lp.lpHead)}</title><meta name="description" content="${A(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="${A(brand + " | " + lp.lpHead)}"><meta property="og:description" content="${A(desc)}"><meta property="og:image" content="${A(base ? base + "og.jpg" : P("og.jpg"))}">
<meta name="theme-color" content="${th.b}"><link rel="icon" href="${hasLogo ? P("logo.png") : "data:,"}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>${css}</style></head><body>
<header><div class="bar"></div><div class="wrap"><div class="nav">
<a href="#" class="ls"><div class="lbox ${hasLogo ? "" : "gbg"}">${logoBox}</div><div><div class="bn gt">${A(brand)}</div>${f.bSlogan ? `<div class="bt">${A(f.bSlogan)}</div>` : ""}</div></a>
<nav class="dt">${nav.map(n => `<a href="${n[0]}">${n[1]}</a>`).join("")}</nav>
<div class="right"><button class="wab" data-wa="${A("سلام، شفت صفحة " + brand + " وحاب نستفسر على إعلان فيديو بالدارجة لمتجري.")}">${WA_SVG}<span>تواصل عبر واتساب</span></button><button class="burger" id="bg" aria-label="القائمة">☰</button></div>
</div></div><div id="mm">${nav.map(n => `<a href="${n[0]}">${n[1]}</a>`).join("")}</div></header>
<section class="hero" style="border:0"><div class="wrap">
<div class="lc">${hasLogo ? `<img src="${P("logo.png")}" alt="${A(brand)}">` : `<div class="fb"><div class="ic gbg"><svg viewBox="0 0 24 24"><path d="${CAM_PATH}"/></svg></div><span class="nm gt">${A(brand)}</span></div>`}${f.bSlogan ? `<div class="pill">${A(f.bSlogan)}</div>` : ""}</div>
<h1>${A(lp.lpHead)}</h1>${f.bSlogan ? `<p class="t1">${A(f.bSlogan)}</p>` : ""}${lp.lpSub ? `<p class="lead">${A(lp.lpSub)}</p>` : ""}
${o.text ? `<div class="promo">🔥 ${A(o.text)}</div>` : ""}
<div class="cta"><button class="b wa" data-wa="${A(offerMsg)}">${WA_SVG}<span>${A(lp.lpCta)}</span></button>${cards.length ? `<a class="b gh" href="#work"><i class="gbg">${PLAY_SVG}</i><span>شاهد النماذج</span></a>` : ""}</div>
</div></section>
${cards.length ? `<section id="work" class="alt"><div class="wrap"><div class="sh"><span class="k">شوف الخدمة بعينك</span><h2>نماذج من أعمالنا</h2><p>تصفح أمثلة من الإعلانات التي نصنعها واضغط على أي نموذج للمشاهدة.</p></div>
<div class="fl"><button class="on" data-f="*">جميع النماذج</button>${tags.map(t => `<button data-f="${A(t)}">${A(t)}</button>`).join("")}</div>
<div class="sg">${cards.map(c => `<div class="vc" data-tags="${A(tagsOf(c).join("|"))}" data-title="${A(c.w.title)}" data-cat="${A(tagsOf(c).join(" • "))}" data-video="${A(P(c.vn))}">
<div class="vt" data-open style="${c.pn ? `background-image:linear-gradient(to bottom,rgba(0,0,0,.2),rgba(0,0,0,.7)),url('${A(P(c.pn))}')` : ""}"><div class="r"><span class="chp">${A(tagsOf(c)[0])}</span>${c.dur ? `<span class="du">${c.dur} ثانية</span>` : ""}</div>
<div class="pl"><i class="gbg">${PLAY_SVG}</i><span>اضغط للمشاهدة</span></div>${c.w.excerpt ? `<div class="ex">«${A(c.w.excerpt)}»</div>` : `<div></div>`}</div>
<div class="vi"><h3>${A(c.w.title)}</h3><button data-open>مشاهدة النموذج</button></div></div>`).join("")}</div></div></section>` : ""}
${pk.length ? `<section id="prices"><div class="wrap"><div class="sh"><span class="k kb">الباقات والأسعار</span><h2>اختر الباقة المناسبة لك</h2>${o.text ? `<p>${A(o.text)}</p>` : ""}</div>
<div class="pg">${pk.map(p => { const sp = sale(p, o.d), pr = +p.price || 0, ls = (p.inc || "").split("\n").map(s => s.trim()).filter(Boolean), msg = "سلام، حاب نطلب [" + (p.name || "باقة") + (pr ? " بسعر " + priceTxt(p) : "") + "]" + (o.text ? " مع الاستفادة من العرض (" + o.text + ")." : "."); return `<div class="pk"><div><div class="ph"><div><h3>${A(p.name || "باقة")}</h3>${ls[0] ? `<p>${A(ls[0])}</p>` : ""}</div>${pr ? `<div class="pb">${sp ? `<s>${N(pr)} دج</s>` : ""}<b>${N(sp || pr)} دج</b></div>` : ""}</div>${o.text ? `<div class="of">🎁 ${A(o.text)}</div>` : ""}${ls.length > 1 ? `<ul>${ls.slice(1).map(x => `<li>${A(x)}</li>`).join("")}</ul>` : ""}</div><button class="b wa" data-wa="${A(msg)}">${WA_SVG}<span>اطلب هذه الباقة عبر واتساب</span></button></div>`; }).join("")}</div></div></section>` : ""}
${steps.length ? `<section id="steps" class="alt"><div class="wrap"><div class="sh"><span class="k">بكل بساطة</span><h2>كيف نعمل؟</h2></div><div class="st">${steps.map((s, i) => `<div class="sc"><div class="sn ${i % 2 ? "" : "gbg"}"${i % 2 ? ` style="background:var(--acc);color:var(--on)"` : ""}>${i + 1}</div><h3>${A(s.t)}</h3>${s.d ? `<p>${A(s.d)}</p>` : ""}</div>`).join("")}</div></div></section>` : ""}
${faq.length ? `<section id="faq"><div class="wrap"><div class="sh"><h2>أسئلة شائعة</h2></div><div class="fq">${faq.map(a => `<details><summary>${A(a[0])}</summary><p>${A(a[1])}</p></details>`).join("")}</div></div></section>` : ""}
<section id="order" class="alt"><div class="wrap"><form class="fm" id="of"><div class="sh" style="margin-bottom:26px"><span class="k kb">تواصل مباشر وسريع</span><h2>جهّز طلبك وأرسله عبر واتساب</h2><p>املأ البيانات التالية وستفتح محادثة واتساب برسالة جاهزة ومنظمة.</p></div>
<div class="g"><div><label for="sn">اسم المتجر أو النشاط</label><input id="sn" required placeholder="مثال: متجر الأناقة"></div>
<div><label for="sp">الباقة المختارة</label><select id="sp">${pk.length ? pk.map(p => `<option value="${A((p.name || "باقة") + (priceTxt(p) ? " بسعر " + priceTxt(p) : ""))}">${A((p.name || "باقة") + (priceTxt(p) ? " — " + priceTxt(p) : ""))}</option>`).join("") : `<option value="لم أحدد بعد">لم أحدد بعد</option>`}</select></div></div>
<div class="g" style="grid-template-columns:1fr"><div><label for="st2">نوع الإعلان المطلوب</label><select id="st2">${typeOpts.map(t => `<option>${A(t)}</option>`).join("")}</select></div>
<div><label for="sx">تفاصيل إضافية (اختياري)</label><textarea id="sx" rows="3" placeholder="اكتب لنا نبذة قصيرة عن المنتج أو العرض الذي تريد الإعلان عنه..."></textarea></div></div>
<button class="b wa" type="submit">${WA_SVG}<span>إرسال الطلب إلى واتساب${f.bPhone ? " (" + A(f.bPhone) + ")" : ""}</span></button></form></div></section>
<footer><div class="wrap">${f.bPhone ? `<a class="fn" href="https://wa.me/${wa}" dir="ltr"><span>${A(f.bPhone)}</span><small dir="rtl">:واتساب</small></a>` : ""}
<p class="fbr">${A(brand)}${f.bArea ? " • " + A(f.bArea) : ""}</p>${f.bSocial ? `<p class="fbr" style="margin-top:-12px">${/^https?:\/\//.test(f.bSocial) ? `<a href="${A(f.bSocial)}" rel="noopener">${A(f.bSocial)}</a>` : A(f.bSocial)}</p>` : ""}
<div class="fln">${nav.map(n => `<a href="${n[0]}">${n[1]}</a>`).join("")}</div>
<p class="dis">© ${new Date().getFullYear()} ${A(brand)}${lp.lpDisc === "yes" ? " • الإعلانات المعروضة مُعدّة بمساعدة الذكاء الاصطناعي" : ""}</p></div></footer>
<button class="fab" data-wa="${A("سلام، حاب نستفسر على إعلان فيديو بالدارجة من " + brand + ".")}" aria-label="واتساب">${WA_SVG}<span>اطلب عبر واتساب</span></button>
<div id="md"><div class="mb"><div class="mh"><div><h4 id="mt"></h4><span id="mc"></span></div><button class="mx" id="mxb" aria-label="إغلاق">✕</button></div><div id="mw"></div><div class="mf"><span>حاب إعلان كيما هذا؟</span><button id="mo">اطلب مثله عبر واتساب</button></div></div></div>
<script>
var PH="${wa}",BR=${JSON.stringify(brand).replace(/</g, "\\u003c")};
function wa(t){window.open("https://wa.me/"+PH+"?text="+encodeURIComponent(t),"_blank","noopener")}
var md=document.getElementById("md"),mw=document.getElementById("mw");
function closeM(){md.classList.remove("on");mw.innerHTML=""}
document.addEventListener("click",function(e){
var w=e.target.closest("[data-wa]");if(w){wa(w.getAttribute("data-wa"));return}
var fb=e.target.closest(".fl button");if(fb){var t=fb.getAttribute("data-f");document.querySelectorAll(".fl button").forEach(function(x){x.classList.toggle("on",x===fb)});document.querySelectorAll(".vc").forEach(function(v){v.hidden=t!=="*"&&v.getAttribute("data-tags").split("|").indexOf(t)<0});return}
var op=e.target.closest("[data-open]");if(op){var c=op.closest(".vc");document.getElementById("mt").textContent=c.getAttribute("data-title");document.getElementById("mc").textContent=c.getAttribute("data-cat");mw.innerHTML="";var v=document.createElement("video");v.src=c.getAttribute("data-video");v.controls=true;v.autoplay=true;v.setAttribute("playsinline","");v.style.cssText="width:100%;height:100%;object-fit:contain;background:#000";mw.appendChild(v);document.getElementById("mo").onclick=function(){closeM();wa('سلام، عجبني نموذج "'+c.getAttribute("data-title")+'" وحاب نطلب إعلان كيما هذا لمتجري.')};md.classList.add("on");return}
if(e.target===md||e.target.closest("#mxb")){closeM();return}
if(e.target.closest("#bg")){document.getElementById("mm").classList.toggle("on");return}
if(e.target.closest("#mm a")){document.getElementById("mm").classList.remove("on")}});
document.getElementById("of").addEventListener("submit",function(e){e.preventDefault();var n=document.getElementById("sx").value.trim();
var m="سلام، حاب نطلب إعلان فيديو بالدارجة من *"+BR+"*:\\n• اسم المتجر/النشاط: "+document.getElementById("sn").value.trim()+"\\n• الباقة: "+document.getElementById("sp").value+"\\n• نوع الإعلان: "+document.getElementById("st2").value;if(n)m+="\\n• تفاصيل إضافية: "+n;wa(m)});
</script></body></html>`;
    if (!preview) {
      const enc = new TextEncoder();
      files.unshift({ name: "index.html", data: enc.encode(html) });
      files.push({ name: ".nojekyll", data: new Uint8Array(0) });
      files.push({ name: "README.txt", data: enc.encode("طريقة النشر على GitHub Pages\n==============================\n1) أنشئ مستودعاً جديداً (Public) على github.com.\n2) فك ضغط هذا الملف، ثم اسحب كل محتوياته (index.html ومجلدات videos و posters وبقية الملفات) إلى صفحة المستودع عبر Add file ثم Upload files، واضغط Commit changes.\n   ملاحظة: الحد الأقصى لكل ملف عند الرفع من المتصفح 25 ميغابايت.\n3) من Settings ثم Pages اختر Deploy from a branch ثم main ثم root واضغط Save.\n4) بعد دقيقة أو دقيقتين يظهر رابط موقعك في أعلى صفحة Pages.\n5) إن أردت أن تظهر صورة المعاينة عند مشاركة الرابط، ضع الرابط النهائي في خانة \"رابط الموقع النهائي\" في التطبيق ثم أعد إنشاء الملف.\n") });
    }
    return { html, files, warn, total, count: cards.length };
  }
  window.__buildSite = buildSite; window.__zipStore = zipStore;

  /* ---- UI ---- */
  Object.keys(LPD).forEach(id => {
    const el = $("#" + id); el.value = biz.lp[id];
    const h = () => { biz.lp[id] = el.value; save(); }; el.addEventListener("input", h); el.addEventListener("change", h);
  });
  async function renderLanding() {
    let list; try { list = ((await B.getPort()) || []).sort((a, b) => b.created - a.created); } catch (e) { return; }
    $("#lpVids").innerHTML = list.length ? list.map(w => `<label class="chk"><input type="checkbox" data-lpv="${esc(w.id)}"${biz.unsel.includes(w.id) ? "" : " checked"}><span>${esc(w.title)}</span><span class="chip">${esc((w.tags && w.tags.length ? w.tags : ["إعلان"]).join(" • "))}</span><span class="mut">${(w.blob.size / 1048576).toFixed(1)} MB</span></label>`).join("") : `<p class="mut">احفظ أعمالاً في معرض الأعمال أولاً لتظهر هنا.</p>`;
  }
  window.renderLanding = renderLanding;
  $("#lpVids").addEventListener("change", e => {
    const id = e.target.dataset.lpv; if (!id) return;
    biz.unsel = biz.unsel.filter(x => x !== id); if (!e.target.checked) biz.unsel.push(id); save();
  });
  const lpMsg = (t, err) => { const m = $("#lpMsg"); m.textContent = t; m.style.color = err ? "var(--r)" : ""; };
  $("#btnLpPrev").onclick = async () => {
    lpMsg("جاري تجهيز المعاينة…");
    try { const s = await buildSite(true); window.open(URL.createObjectURL(new Blob([s.html], { type: "text/html" })), "_blank"); lpMsg("فُتحت المعاينة في نافذة جديدة (" + s.count + " فيديو)."); }
    catch (e) { lpMsg("تعذرت المعاينة: " + errText(e), true); }
  };
  $("#btnLpZip").onclick = async () => {
    lpMsg("جاري إنشاء الملف…"); $("#btnLpZip").disabled = true;
    try {
      const s = await buildSite(false), blob = zipStore(s.files), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "BUP_landing.zip"; a.click();
      lpMsg("تم إنشاء BUP_landing.zip (" + (blob.size / 1048576).toFixed(1) + " MB، " + s.count + " فيديو)." + (s.warn.length ? " تنبيه: فيديوهات كبيرة قد تتجاوز حد الرفع من المتصفح (25 MB للملف) أو تبطئ الصفحة: " + s.warn.join("، ") : ""), s.warn.length > 0);
    } catch (e) { lpMsg("تعذر إنشاء الملف: " + errText(e), true); }
    $("#btnLpZip").disabled = false;
  };
  $("#btnLpAi").onclick = async () => {
    const f = biz.f, pk = biz.pkgs.filter(p => p.name).map(p => p.name + (p.inc ? " (" + p.inc + ")" : "")).join("; ");
    $("#btnLpAi").disabled = true; lpMsg("Gemini يكتب الصياغات…");
    try {
      const prompt = `You write landing-page copy in Arabic (professional tone with a light Algerian touch) for a small service that makes short video ads in Algerian Darija for shops and small businesses in Algeria.
Brand: ${f.bName || "-"}. Slogan: ${f.bSlogan || "-"}. Coverage: ${f.bArea || "-"}. Packages: ${pk || "-"}.
Return ONLY JSON: {"headline":string (max 9 words),"sub":string (max 25 words),"steps":[{"t":string (short title),"d":string (one short sentence)}] (3 or 4 items),"faq":[{"q":string,"a":string}] (3 or 4 items)}.
Rules: never invent statistics, client counts, testimonials, guarantees, prices or delivery times. Where a detail is unknown, answer in general terms such as "نتفق عليه حسب طلبك". The real workflow is: the client sends photos and product details, receives a preview version, confirms payment, then receives the final video.`;
      const model = $("#mText").value || "gemini-2.5-flash";
      const j = await withKeys("kText", k => gem(`models/${model}:generateContent`, { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: .7 } }, k));
      const d = JSON.parse(j.candidates[0].content.parts.map(p => p.text || "").join("").replace(/```json|```/g, "").trim());
      const set = (id, v) => { biz.lp[id] = v; $("#" + id).value = v; };
      if (d.headline) set("lpHead", d.headline); if (d.sub) set("lpSub", d.sub);
      if (Array.isArray(d.steps)) set("lpSteps", d.steps.map(x => typeof x === "string" ? x : x.t + " | " + (x.d || "")).join("\n"));
      if (Array.isArray(d.faq)) set("lpFaq", d.faq.map(x => x.q + " | " + x.a).join("\n"));
      save(); lpMsg("تمت الكتابة. راجع النصوص وعدّلها بما يطابق سياستك قبل التصدير.");
    } catch (e) { lpMsg("تعذر الاقتراح: " + errText(e), true); }
    $("#btnLpAi").disabled = false;
  };
  renderLanding();
});
