document.addEventListener("DOMContentLoaded", () => {
  const B = window.BIZ; if (!B) return;
  const { biz, offer, sale, num, THEMES, save } = B;
  const LPD = { lpHead: "إعلانات فيديو بالدارجة لمتجرك", lpSub: "", lpCta: "تواصل معنا على واتساب", lpSteps: "ترسل لنا صور منتجك ومعلوماته\nنجهّز لك نسخة معاينة لتشاهدها\nتؤكد الدفع فنسلمك الإعلان الجاهز", lpFaq: "", lpUrl: "", lpDisc: "yes", lpPrices: "yes" };
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

  /* ---- site builder ---- */
  async function buildSite(preview) {
    const f = biz.f, lp = biz.lp, th = THEMES[f.bTheme] || THEMES.green, acc = f.bColor || "#22b573", o = offer();
    const items = ((await B.getPort()) || []).sort((a, b) => b.created - a.created).filter(w => !biz.unsel.includes(w.id));
    const files = [], urls = {}, warn = []; let total = 0;
    const add = async (name, blob) => { total += blob.size || 0; if (preview) urls[name] = URL.createObjectURL(blob); else files.push({ name, data: new Uint8Array(await blob.arrayBuffer()) }); };
    const P = n => urls[n] || n, cards = [];
    for (let i = 0; i < items.length; i++) {
      const w = items[i], vn = "videos/ad-" + (i + 1) + ".mp4", pn = "posters/ad-" + (i + 1) + ".jpg";
      await add(vn, w.blob); if (w.blob.size > 8 * 1048576) warn.push(w.title + ": " + (w.blob.size / 1048576).toFixed(1) + " MB");
      const pb = await poster(w.blob); if (pb) await add(pn, pb);
      cards.push({ w, vn, pn: pb ? pn : "" });
    }
    if (biz.logo) { try { await add("logo.png", await (await fetch(biz.logo)).blob()); } catch (e) { } }
    await add("og.jpg", await ogBlob());
    const hasLogo = !!(urls["logo.png"] || files.some(x => x.name === "logo.png"));
    const wa = intl(f.bPhone), waLink = wa ? "https://wa.me/" + wa + "?text=" + encodeURIComponent("السلام عليكم، أريد معرفة تفاصيل خدمة إعلانات الفيديو.") : "#contact";
    const tags = [...new Set(cards.flatMap(c => c.w.tags && c.w.tags.length ? c.w.tags : ["إعلان"]))];
    const steps = lp.lpSteps.split("\n").map(s => s.trim()).filter(Boolean);
    const faq = lp.lpFaq.split("\n").map(l => l.split("|").map(s => s.trim())).filter(a => a[0] && a[1]);
    const pk = biz.pkgs.filter(p => p.name || p.price);
    const base = lp.lpUrl ? lp.lpUrl.replace(/\/?$/, "/") : "", desc = lp.lpSub || f.bSlogan || lp.lpHead, brand = f.bName || "خدمة الإعلانات";
    const soc = f.bSocial ? (/^https?:\/\//.test(f.bSocial) ? `<a href="${esc(f.bSocial)}" rel="noopener">${esc(f.bSocial)}</a>` : esc(f.bSocial)) : "";
    const css = `:root{--a:${th.a};--b:${th.b};--t:${th.t};--m:${th.m};--box:${th.box};--acc:${acc};--on:${lum(acc) > .6 ? "#10190f" : "#fff"}}
*{box-sizing:border-box}[hidden]{display:none!important}
body{margin:0;background:linear-gradient(var(--a),var(--b)) fixed;color:var(--t);font:17px/1.8 Cairo,Tahoma,"Segoe UI",system-ui,sans-serif}
.w{max-width:960px;margin:0 auto;padding:0 18px}.hero{padding:44px 0 26px;text-align:center}
.logo{width:84px;height:84px;object-fit:contain;border-radius:18px;background:var(--box)}.brand{font-weight:800;font-size:1.2rem}
h1{font-size:clamp(1.7rem,6vw,2.6rem);line-height:1.35;margin:14px 0 8px}.sub{color:var(--m);max-width:620px;margin:0 auto 20px}
.btn{display:inline-block;background:var(--acc);color:var(--on);font-weight:800;padding:12px 28px;border-radius:999px;text-decoration:none}
section{padding:24px 0}h2{font-size:1.5rem;margin:0 0 14px;border-inline-start:5px solid var(--acc);padding-inline-start:10px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.chips button{font:inherit;background:var(--box);color:var(--t);border:0;border-radius:999px;padding:2px 16px;cursor:pointer}.chips button.on{background:var(--acc);color:var(--on)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.vid{margin:0;background:var(--box);border-radius:14px;overflow:hidden}.vid video{width:100%;display:block;background:#000;aspect-ratio:9/16;object-fit:cover}.vid figcaption{padding:10px 12px}
.tag{display:inline-block;background:var(--acc);color:var(--on);border-radius:8px;padding:0 8px;font-size:.78rem;margin-inline-end:4px}
.offer{background:var(--acc);color:var(--on);border-radius:14px;padding:10px 16px;font-weight:800;text-align:center;margin-bottom:14px}
.pk{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--box);border-radius:14px;padding:14px 16px;margin-bottom:10px;border-inline-start:6px solid var(--acc)}
.pk small{color:var(--m);display:block}.pr{font-weight:800;color:var(--acc);font-size:1.4rem;white-space:nowrap;text-align:left}.pr s{display:block;color:var(--m);font-size:.9rem;font-weight:400}
ol{padding-inline-start:22px}li{margin:8px 0}details{background:var(--box);border-radius:12px;padding:10px 14px;margin-bottom:8px}summary{cursor:pointer;font-weight:700}
a{color:var(--acc)}.btn{color:var(--on)}footer{padding:24px 0 96px;color:var(--m);font-size:.9rem;text-align:center}
.fab{position:fixed;inset-inline:16px;bottom:14px;z-index:5}.fab .btn{display:block;text-align:center;box-shadow:0 6px 20px #0006}
@media(min-width:700px){.fab{inset-inline:auto 24px;width:260px}}`;
    const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(brand)} – ${esc(lp.lpHead)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(brand + " – " + lp.lpHead)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(base ? base + "og.jpg" : P("og.jpg"))}">
<meta name="theme-color" content="${th.a}"><link rel="icon" href="${hasLogo ? P("logo.png") : "data:,"}">
<style>${css}</style></head><body>
<header class="hero"><div class="w">${hasLogo ? `<img class="logo" src="${P("logo.png")}" alt="${esc(brand)}">` : ""}<div class="brand">${esc(brand)}</div>
<h1>${esc(lp.lpHead)}</h1>${lp.lpSub ? `<p class="sub">${esc(lp.lpSub)}</p>` : ""}<a class="btn" href="${esc(waLink)}">${esc(lp.lpCta)}</a></div></header>
<main class="w">
${cards.length ? `<section id="work"><h2>أعمالنا</h2>
<div class="chips"><button class="on" data-f="*">الكل</button>${tags.map(t => `<button data-f="${esc(t)}">${esc(t)}</button>`).join("")}</div>
<div class="grid">${cards.map(c => `<figure class="vid" data-tags="${esc((c.w.tags && c.w.tags.length ? c.w.tags : ["إعلان"]).join("|"))}"><video controls playsinline preload="none"${c.pn ? ` poster="${P(c.pn)}"` : ""}><source src="${P(c.vn)}" type="video/mp4"></video><figcaption>${(c.w.tags && c.w.tags.length ? c.w.tags : ["إعلان"]).map(t => `<span class="tag">${esc(t)}</span>`).join("")}<div>${esc(c.w.title)}</div></figcaption></figure>`).join("")}</div></section>` : ""}
${lp.lpPrices === "yes" && pk.length ? `<section id="prices"><h2>الباقات والأسعار</h2>${o.text ? `<div class="offer">${esc(o.text)}</div>` : ""}${pk.map(p => { const sp = sale(p, o.d), pr = +p.price || 0; return `<div class="pk"><div><b>${esc(p.name || "باقة")}</b>${p.inc ? `<small>${esc(p.inc)}</small>` : ""}</div><div class="pr">${pr ? (sp ? `<s>${num(pr)} دج</s>${num(sp)} دج` : `${num(pr)} دج`) : "اتصل للسعر"}</div></div>`; }).join("")}</section>` : ""}
${steps.length ? `<section id="steps"><h2>كيف نعمل</h2><ol>${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol></section>` : ""}
${faq.length ? `<section id="faq"><h2>أسئلة شائعة</h2>${faq.map(a => `<details><summary>${esc(a[0])}</summary><p>${esc(a[1])}</p></details>`).join("")}</section>` : ""}
<section id="contact"><h2>تواصل معنا</h2><p>${f.bPhone ? `واتساب: <a href="${esc(waLink)}" dir="ltr">${esc(f.bPhone)}</a><br>` : ""}${soc ? soc + "<br>" : ""}${f.bArea ? esc(f.bArea) : ""}</p><a class="btn" href="${esc(waLink)}">${esc(lp.lpCta)}</a></section>
</main>
<footer><div class="w">© ${new Date().getFullYear()} ${esc(brand)}${lp.lpDisc === "yes" ? "<br>الإعلانات المعروضة مُعدّة بمساعدة الذكاء الاصطناعي." : ""}</div></footer>
<div class="fab"><a class="btn" href="${esc(waLink)}">${esc(lp.lpCta)}</a></div>
<script>document.querySelectorAll("[data-f]").forEach(function(b){b.onclick=function(){var t=b.dataset.f;document.querySelectorAll("[data-f]").forEach(function(x){x.classList.toggle("on",x===b)});document.querySelectorAll(".vid").forEach(function(v){v.hidden=t!=="*"&&v.dataset.tags.split("|").indexOf(t)<0})}})</script>
</body></html>`;
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
Return ONLY JSON: {"headline":string (max 9 words),"sub":string (max 25 words),"steps":[3 or 4 short strings],"faq":[{"q":string,"a":string}] (3 or 4 items)}.
Rules: never invent statistics, client counts, testimonials, guarantees, prices or delivery times. Where a detail is unknown, answer in general terms such as "نتفق عليه حسب طلبك". The real workflow is: the client sends photos and product details, receives a preview version, confirms payment, then receives the final video.`;
      const model = $("#mText").value || "gemini-2.5-flash";
      const j = await withKeys("kText", k => gem(`models/${model}:generateContent`, { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: .7 } }, k));
      const d = JSON.parse(j.candidates[0].content.parts.map(p => p.text || "").join("").replace(/```json|```/g, "").trim());
      const set = (id, v) => { biz.lp[id] = v; $("#" + id).value = v; };
      if (d.headline) set("lpHead", d.headline); if (d.sub) set("lpSub", d.sub);
      if (Array.isArray(d.steps)) set("lpSteps", d.steps.join("\n"));
      if (Array.isArray(d.faq)) set("lpFaq", d.faq.map(x => x.q + " | " + x.a).join("\n"));
      save(); lpMsg("تمت الكتابة. راجع النصوص وعدّلها بما يطابق سياستك قبل التصدير.");
    } catch (e) { lpMsg("تعذر الاقتراح: " + errText(e), true); }
    $("#btnLpAi").disabled = false;
  };
  renderLanding();
});
