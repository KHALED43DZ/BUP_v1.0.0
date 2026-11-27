document.addEventListener("DOMContentLoaded", () => {
  const DEF = {
    f: { bName: "", bSlogan: "", bPhone: "", bSocial: "", bArea: "نخدم كل ولايات الجزائر", bTitle: "إعلانات فيديو بالدارجة لمتجرك", bTheme: "green", bColor: "#22b573", bOcc: "none", bDisc: "", bGift: "", bEnd: "", bFmt: "story" },
    pkgs: [{ name: "إعلان واحد", inc: "فيديو 10 إلى 15 ثانية مع تعليق صوتي بالدارجة", price: "", sale: "" }], logo: ""
  };
  const saved = S.get("biz", {});
  const biz = { f: Object.assign({}, DEF.f, saved.f), pkgs: saved.pkgs || DEF.pkgs, logo: saved.logo || "", lp: saved.lp || {}, unsel: saved.unsel || [] };
  const TYPE_OPTS = [...$("#type").options].map(o => o.textContent).concat("أخرى");
  const save = () => S.set("biz", biz);
  const THEMES = {
    green: { a: "#0f1f1a", b: "#11161b", t: "#ffffff", m: "#9fb0aa", box: "rgba(255,255,255,.07)" },
    night: { a: "#0b1730", b: "#0b0e18", t: "#ffffff", m: "#9aa7c4", box: "rgba(255,255,255,.07)" },
    light: { a: "#f7f7f2", b: "#ecebe3", t: "#15201b", m: "#5d6a64", box: "rgba(0,0,0,.06)" }
  };
  const OCC = { ramadan: "عروض رمضان", eid: "عروض العيد", school: "عروض الدخول المدرسي", bf: "الجمعة السوداء", ny: "عروض رأس السنة" };
  const num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const lum = h => { const c = parseInt(h.slice(1), 16); return (0.299 * (c >> 16) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255; };
  const rr = (x, X, Y, W, H, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); };
  let logoImg = null, drawT, tok = 0;

  function offer() {
    const f = biz.f, end = f.bEnd ? new Date(f.bEnd + "T23:59:59") : null, active = !end || end >= new Date();
    const d = active ? (+f.bDisc || 0) : 0, parts = [];
    if (active) { if (OCC[f.bOcc]) parts.push(OCC[f.bOcc]); if (d > 0) parts.push("تخفيض " + d + "%"); if (f.bGift) parts.push(f.bGift); }
    let text = parts.join(" • ");
    if (text && f.bEnd) { const [, m, dd] = f.bEnd.split("-"); text += " — حتى " + dd + "/" + m; }
    return { text, d, expired: !!end && !active };
  }
  function sale(p, d) {
    const price = +p.price || 0; let s = +p.sale || 0;
    if (!s && d > 0 && price) s = Math.round(price * (1 - d / 100) / 100) * 100;
    return s > 0 && s < price ? s : 0;
  }
  function wrap(x, text, maxW, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean), lines = []; let l = "";
    for (const w of words) { const t = l ? l + " " + w : w; if (x.measureText(t).width > maxW && l) { lines.push(l); l = w; } else l = t; }
    if (l) lines.push(l);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "…"); }
    return lines;
  }
  const drawSoon = () => { clearTimeout(drawT); drawT = setTimeout(draw, 250); };

  async function draw() {
    const my = ++tok;
    try { await document.fonts.load("bold 30px Cairo"); await document.fonts.load("30px Cairo"); } catch (e) { }
    if (my !== tok) return;
    const c = $("#card"), f = biz.f, story = f.bFmt === "story", W = 1080, H = story ? 1920 : 1080;
    const th = THEMES[f.bTheme] || THEMES.green, acc = f.bColor || "#22b573";
    c.width = W; c.height = H;
    const x = c.getContext("2d"), F = (px, w = "bold") => `${w} ${px}px Cairo, Tahoma, "Segoe UI", sans-serif`;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.a); g.addColorStop(1, th.b);
    x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = acc; x.fillRect(0, 0, W, 12);
    x.direction = "rtl"; x.textBaseline = "alphabetic";
    const pad = 64, R = W - pad; let y = pad + 12;
    const ls = story ? 150 : 110; let tx = R;
    if (logoImg) {
      x.save(); rr(x, R - ls, y, ls, ls, 24); x.clip(); x.fillStyle = th.box; x.fillRect(R - ls, y, ls, ls);
      const s = Math.min(ls / logoImg.width, ls / logoImg.height), w = logoImg.width * s, h = logoImg.height * s;
      x.drawImage(logoImg, R - ls + (ls - w) / 2, y + (ls - h) / 2, w, h); x.restore(); tx = R - ls - 24;
    }
    x.textAlign = "right"; x.fillStyle = th.t; x.font = F(story ? 64 : 52); x.fillText(f.bName || "اسم علامتك", tx, y + (story ? 72 : 58));
    if (f.bSlogan) { x.fillStyle = th.m; x.font = F(story ? 34 : 28, "normal"); x.fillText(f.bSlogan, tx, y + (story ? 125 : 100)); }
    y += ls + (story ? 50 : 34);
    x.textAlign = "center"; x.fillStyle = acc; x.font = F(story ? 54 : 42); x.fillText(f.bTitle || "", W / 2, y + (story ? 50 : 38)); y += story ? 100 : 70;
    const o = offer();
    if (o.text) {
      const bh = story ? 100 : 70; x.fillStyle = acc; rr(x, pad, y, W - 2 * pad, bh, bh / 2); x.fill();
      let fs = story ? 40 : 30; x.font = F(fs); while (x.measureText(o.text).width > W - 2 * pad - 60 && fs > 16) { fs -= 2; x.font = F(fs); }
      x.fillStyle = lum(acc) > .6 ? "#10190f" : "#fff"; x.textAlign = "center"; x.fillText(o.text, W / 2, y + bh / 2 + fs * .35); y += bh + (story ? 36 : 24);
    }
    const fh = story ? 190 : 130, fy = H - pad - fh;
    const list = biz.pkgs.filter(p => p.name || p.price).slice(0, 5), n = list.length, gap = story ? 28 : 16, avail = fy - y - 20;
    if (!n) { x.textAlign = "center"; x.fillStyle = th.m; x.font = F(36, "normal"); x.fillText("أضف باقاتك وأسعارك لتظهر هنا", W / 2, y + 80); }
    else {
      const bh = Math.min(story ? 280 : 190, (avail - gap * (n - 1)) / n);
      list.forEach((p, i) => {
        const by = y + i * (bh + gap), sp = sale(p, o.d), price = +p.price || 0;
        x.fillStyle = th.box; rr(x, pad, by, W - 2 * pad, bh, 22); x.fill(); x.fillStyle = acc; rr(x, R - 10, by, 10, bh, 5); x.fill();
        x.textAlign = "right"; x.fillStyle = th.t; x.font = F(bh * .21); x.fillText(p.name || "", R - 36, by + bh * .34);
        x.fillStyle = th.m; x.font = F(bh * .125, "normal");
        wrap(x, p.inc, W - 2 * pad - 400, story ? 3 : 2).forEach((ln, k) => x.fillText(ln, R - 36, by + bh * .56 + k * bh * .17));
        x.textAlign = "left"; const lx = pad + 36;
        if (sp) {
          x.fillStyle = th.m; x.font = F(bh * .13, "normal"); const t = num(price) + " دج"; x.fillText(t, lx, by + bh * .34);
          const w = x.measureText(t).width; x.fillStyle = th.m; x.fillRect(lx, by + bh * .34 - bh * .045, w, 3);
          x.fillStyle = acc; x.font = F(bh * .26); x.fillText(num(sp) + " دج", lx, by + bh * .72);
        } else if (price) { x.fillStyle = acc; x.font = F(bh * .27); x.fillText(num(price) + " دج", lx, by + bh * .6); }
        else { x.fillStyle = th.m; x.font = F(bh * .14, "normal"); x.fillText("اتصل للسعر", lx, by + bh * .56); }
      });
    }
    x.fillStyle = acc; x.globalAlpha = .5; x.fillRect(pad, fy, W - 2 * pad, 3); x.globalAlpha = 1;
    x.textAlign = "center";
    if (f.bPhone) { x.fillStyle = th.t; x.font = F(story ? 48 : 38); x.fillText("واتساب: " + f.bPhone, W / 2, fy + (story ? 80 : 58)); }
    const sub = [f.bSocial, f.bArea].filter(Boolean).join("  •  ");
    if (sub) { x.fillStyle = th.m; x.font = F(story ? 30 : 24, "normal"); x.fillText(sub, W / 2, fy + (story ? 140 : 100)); }
  }

  function loadLogo(src) {
    if (!src) { logoImg = null; return drawSoon(); }
    const i = new Image(); i.onload = () => { logoImg = i; draw(); }; i.src = src;
  }
  function noteOffer() {
    const o = offer();
    $("#offerNote").textContent = o.expired ? "انتهى تاريخ العرض: لن يظهر الشريط ولا التخفيض التلقائي." : (o.d ? "تُحسب أسعار ما بعد التخفيض تلقائياً للباقات التي لم تحدد لها سعر عرض." : "");
  }
  function renderPkgs() {
    $("#pkgList").innerHTML = biz.pkgs.map((p, i) => `<div class="shot"><div class="row between"><b>باقة ${i + 1}</b><button data-pdel="${i}">حذف</button></div>
      <label>الاسم<input data-pi="${i}" data-pk="name" value="${esc(p.name)}"></label>
      <label>ما تشمله<textarea rows="2" data-pi="${i}" data-pk="inc">${esc(p.inc)}</textarea></label>
      <div class="grid"><label>السعر العادي (دج)<input type="number" inputmode="numeric" data-pi="${i}" data-pk="price" value="${esc(p.price)}"></label>
      <label>سعر العرض (اختياري)<input type="number" inputmode="numeric" data-pi="${i}" data-pk="sale" value="${esc(p.sale)}"></label></div></div>`).join("");
    $("#btnPkg").disabled = biz.pkgs.length >= 5;
  }

  Object.keys(DEF.f).forEach(id => {
    const el = $("#" + id); el.value = biz.f[id];
    const h = () => { biz.f[id] = el.value; save(); noteOffer(); drawSoon(); };
    el.addEventListener("input", h); el.addEventListener("change", h);
  });
  $("#pkgList").addEventListener("input", e => { const d = e.target.dataset; if (d.pi != null) { biz.pkgs[+d.pi][d.pk] = e.target.value; save(); drawSoon(); } });
  $("#pkgList").addEventListener("click", e => { const i = e.target.dataset.pdel; if (i != null) { biz.pkgs.splice(+i, 1); save(); renderPkgs(); drawSoon(); } });
  $("#btnPkg").onclick = () => { if (biz.pkgs.length < 5) { biz.pkgs.push({ name: "", inc: "", price: "", sale: "" }); save(); renderPkgs(); drawSoon(); } };
  $("#bLogoIn").onchange = async e => {
    const fl = e.target.files[0]; if (!fl) return;
    try {
      const bm = await createImageBitmap(fl), s = Math.min(1, 256 / Math.max(bm.width, bm.height)), cv = document.createElement("canvas");
      cv.width = bm.width * s; cv.height = bm.height * s; cv.getContext("2d").drawImage(bm, 0, 0, cv.width, cv.height);
      biz.logo = cv.toDataURL("image/png"); save(); loadLogo(biz.logo);
    } catch (err) { msg("تعذر قراءة الشعار: " + errText(err), true); }
  };
  const cardBlob = () => new Promise(ok => $("#card").toBlob(ok, "image/png"));
  $("#btnCardDl").onclick = async () => { const b = await cardBlob(), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "BUP_prices_" + biz.f.bFmt + ".png"; a.click(); };
  $("#btnCardSh").onclick = async () => {
    const file = new File([await cardBlob()], "prices.png", { type: "image/png" });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] }); else msg("المشاركة المباشرة غير مدعومة، استعمل التحميل.", true); }
    catch (e) { if (e.name !== "AbortError") msg("تعذرت المشاركة: " + errText(e), true); }
  };
  const show = b => { $("#viewAds").hidden = true; $("#viewBiz").hidden = !b; $("#viewMain").hidden = b; window.scrollTo(0, 0); if (b) { draw(); renderTpl(); renderPort(); } };
  $("#btnBiz").onclick = () => show($("#viewBiz").hidden);
  $("#btnBack").onclick = () => show(false);

  /* ---------- Stage 2 ---------- */
  const tplData = () => {
    const f = biz.f, nm = ($("#tName").value || "").trim() || "صاحب المتجر", brand = f.bName || "[اسم علامتك]", o = offer();
    const phone = f.bPhone ? "\nللتواصل: " + f.bPhone : "";
    const pk = biz.pkgs.filter(p => p.name || p.price).map(p => {
      const sp = sale(p, o.d), pr = +p.price || 0;
      return "• " + (p.name || "باقة") + (pr ? ": " + (sp ? "~" + num(pr) + "~ " + num(sp) : num(pr)) + " دج" : "") + (p.inc ? " — " + p.inc : "");
    }).join("\n");
    return [
      ["الرسالة الأولى", `السلام عليكم ${nm}،\nمعاك ${brand}. نصنع إعلانات فيديو قصيرة بالدارجة الجزائرية للمتاجر والمشاريع، تنشرها على تيك توك وإنستغرام وفيسبوك.${f.bSlogan ? "\n" + f.bSlogan : ""}\nتحب نوريك أمثلة من أعمالنا؟${phone}`],
      ["إرسال الباقات والأسعار", `أهلا ${nm}، هذي باقاتنا:\n${pk || "• [أضف باقاتك في صفحتي]"}${o.text ? "\n\n" + o.text : ""}\n\nإذا حبيت نبدأ قولي وأنا نوضحلك الخطوات.${phone}`],
      ["طلب معلومات المنتج", `تمام ${nm}، باش نبدأ نحتاج:\n1) صور واضحة للمنتج من عدة زوايا\n2) اسم المنتج ومميزاته\n3) السعر والعرض إن وجد\n4) رقم التواصل أو رابط الطلب\n5) الفئة اللي تحب تستهدفها\nنبعثلك بعدها نسخة معاينة تشوفها قبل ما تقرر.`],
      ["إرسال المعاينة", `هذي نسخة المعاينة للإعلان (عليها علامة "نموذج للمعاينة"). إذا عجبتك نسلمك النسخة الأصلية بدون العلامة بعد تأكيد الدفع. واش رأيك؟${phone}`],
      ["متابعة وتذكير", o.text ? `السلام عليكم ${nm}، تذكير بسيط: ${o.text}.\nنقدر نبدأ معاك في أي وقت.${phone}` : `السلام عليكم ${nm}، نتابع معاك بخصوص الإعلان. واش تحب نوضحلك حاجة أو نعدل في العرض؟${phone}`]
    ];
  };
  const renderTpl = () => {
    $("#tplList").innerHTML = tplData().map((t, i) => `<div class="shot"><b>${t[0]}</b><textarea rows="6">${esc(t[1])}</textarea>
      <div class="row"><button data-tcopy="${i}">نسخ</button><button data-twa="${i}">إرسال عبر واتساب</button></div></div>`).join("");
  };
  $("#tName").addEventListener("input", renderTpl);
  $("#tplList").addEventListener("click", e => {
    const d = e.target.dataset, box = e.target.closest(".shot"); if (!box || (d.tcopy == null && d.twa == null)) return;
    const text = box.querySelector("textarea").value;
    if (d.twa != null) window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
    else { navigator.clipboard.writeText(text); msg("تم النسخ."); setTimeout(() => msg(""), 1200); }
  });

  $("#btnSelfAd").onclick = () => {
    const f = biz.f, o = offer(), set = (id, v) => { $("#" + id).value = v; };
    const lines = biz.pkgs.filter(p => p.name || p.price).map(p => {
      const sp = sale(p, o.d), pr = +p.price || 0;
      return (p.name || "باقة") + (p.inc ? " (" + p.inc + ")" : "") + (pr ? ": " + (sp ? num(sp) + " دج بدل " + num(pr) : num(pr) + " دج") : "");
    });
    newProject();
    set("name", f.bName || "خدمة إعلانات الفيديو");
    set("desc", ["خدمة صناعة إعلانات فيديو قصيرة بالدارجة الجزائرية للمتاجر والمشاريع الصغيرة، تُنشر على تيك توك وإنستغرام وفيسبوك.", f.bSlogan, lines.length ? "الباقات: " + lines.join(" | ") : "", f.bArea].filter(Boolean).join(" "));
    set("aud", "أصحاب المتاجر والمشاريع الصغيرة في الجزائر");
    set("offer", [o.text, f.bPhone ? "واتساب " + f.bPhone : ""].filter(Boolean).join(" — "));
    set("type", "service"); set("lang", "darija"); set("tone", "energetic"); set("people", "with people"); set("ratio", "9:16"); set("dur", "20");
    toggleUsed(); saveDraft(); show(false); msg("تم تجهيز نموذج إعلان خدمتك. راجعه ثم اضغط «أنشئ السيناريو والبرومبتات».");
  };

  const W = { all: () => DB.tx("readonly", s => s.getAll(), "w"), put: v => DB.tx("readwrite", s => s.put(v), "w"), del: id => DB.tx("readwrite", s => s.delete(id), "w") };
  let portCache = {};
  const photoCtl = w => {
    const ph = w.photos || [];
    return `<div class="phc"><div class="phs">${ph.map((p, i) => `<span class="pth"><img src="data:image/jpeg;base64,${p}" alt=""><button data-wrp="${w.id}|${i}" aria-label="حذف الصورة">✕</button></span>`).join("")}</div>
      <div class="row">${ph.length < 3 ? `<label class="btnl">+ صورة العميل<input type="file" accept="image/*" data-wadd="${w.id}"></label>` : ""}${ph.length ? `<label class="chk"><input type="checkbox" data-wshow="${w.id}"${w.show !== false ? " checked" : ""}> إظهار في الصفحة</label>` : ""}</div></div>`;
  };
  async function renderPort() {
    let list; try { list = ((await W.all()) || []).sort((x, y) => y.created - x.created); } catch (e) { $("#portList").innerHTML = `<p class="mut">تعذر قراءة المعرض: ${esc(errText(e))}</p>`; return; }
    portCache = Object.fromEntries(list.map(w => [w.id, w]));
    $("#portList").innerHTML = list.length ? list.map(w => `<div class="card"><video src="${URL.createObjectURL(w.blob)}#t=0.1" controls playsinline preload="metadata"></video><b>${esc(w.title)}</b><span class="mut">${new Date(w.created).toLocaleDateString("fr-FR")}</span><select data-wtag="${w.id}">${TYPE_OPTS.map(t => `<option${t === ((w.tags && w.tags[0]) || "أخرى") ? " selected" : ""}>${t}</option>`).join("")}</select>
      ${photoCtl(w)}<div class="row"><button data-wsh="${w.id}">مشاركة</button><button data-wdl="${w.id}">تحميل</button><button data-wdel="${w.id}">حذف</button></div></div>`).join("")
      : `<p class="mut">لا توجد أعمال بعد. بعد دمج إعلان اضغط «حفظ في معرض الأعمال».</p>`;
    if (window.renderLanding) window.renderLanding();
  }
  $("#portList").addEventListener("change", async e => {
    const id = e.target.dataset.wtag, w = portCache[id]; if (!id || !w) return;
    w.tags = [e.target.value, ...(w.tags || []).slice(1)]; await W.put(w); if (window.renderLanding) window.renderLanding();
  });
  $("#portList").addEventListener("change", async e => {
    const d = e.target.dataset;
    if (d.wshow) { const w = portCache[d.wshow]; if (w) { w.show = e.target.checked; await W.put(w); } return; }
    if (d.wadd) {
      const w = portCache[d.wadd], fl = e.target.files[0]; if (!w || !fl) return;
      try { msg("جاري تجهيز الصورة…"); w.photos = [...(w.photos || []), await imgB64(fl, 800, .8)].slice(0, 3); w.show = true; await W.put(w); msg(""); renderPort(); }
      catch (err) { msg("تعذر قراءة الصورة: " + errText(err), true); }
    }
  });
  $("#portList").addEventListener("click", async e => {
    const d = e.target.dataset;
    if (d.wrp) { const [id, i] = d.wrp.split("|"), pw = portCache[id]; if (pw) { pw.photos.splice(+i, 1); await W.put(pw); renderPort(); } return; }
    const w = portCache[d.wsh || d.wdl || d.wdel]; if (!w) return;
    if (d.wsh) shareBlob(w.blob, w.name);
    if (d.wdl) { const a = document.createElement("a"); a.href = URL.createObjectURL(w.blob); a.download = w.name; a.click(); }
    if (d.wdel && confirm("حذف هذا العمل من المعرض؟")) { await W.del(w.id); renderPort(); }
  });
  $("#btnPort").onclick = async () => {
    const it = (window.__last || {}).prev || (window.__last || {}).out; if (!it) return;
    const title = prompt("عنوان العمل في المعرض:", it.name.replace(/_(preview|original)\.mp4$/, "")); if (title === null) return;
    const ph = (cur && cur.photos) || [], rf = ((cur && cur.shots && cur.shots[0] && cur.shots[0].refs) || []).filter(n => n >= 1 && n <= ph.length), pick = rf.length ? rf.slice(0, 3).map(n => ph[n - 1]) : ph.slice(0, 1);
    try { await W.put({ id: Date.now().toString(36), title: title || "عمل", created: Date.now(), blob: it.blob, name: it.name, tags: [$("#portType").value || "أخرى", ...(dlgMode ? ["حوار"] : [])], excerpt: ((cur && cur.shots && cur.shots[0] && cur.shots[0].voiceover) || "").slice(0, 120), photos: pick, show: pick.length > 0 }); msg("تم الحفظ في معرض الأعمال."); setTimeout(() => msg(""), 2000); renderPort(); }
    catch (err) { msg("تعذر الحفظ: " + errText(err), true); }
  };
  window.BIZ = { biz, offer, sale, num, THEMES, save, getPort: async () => (await W.all()) || [] };
  renderPkgs(); noteOffer(); loadLogo(biz.logo); renderTpl(); renderPort();
});
