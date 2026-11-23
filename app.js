const VERSION = "1.4.0";
const API = "https://generativelanguage.googleapis.com/v1beta/";
const $ = s => document.querySelector(s);
const S = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("bup_" + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem("bup_" + k, JSON.stringify(v)); }
};
const VOICES = "Zephyr:مشرق,Puck:مرح,Charon:إخباري,Kore:حازم,Fenrir:حماسي,Leda:شبابي,Orus:حازم,Aoede:خفيف,Callirrhoe:مريح,Autonoe:مشرق,Enceladus:هامس,Iapetus:واضح,Umbriel:مريح,Algieba:ناعم,Despina:ناعم,Erinome:واضح,Algenib:خشن,Rasalgethi:إخباري,Laomedeia:مرح,Achernar:هادئ,Alnilam:حازم,Schedar:متوازن,Gacrux:ناضج,Pulcherrima:مباشر,Achird:ودود,Zubenelgenubi:عفوي,Vindemiatrix:لطيف,Sadachbia:حيوي,Sadaltager:عليم,Sulafat:دافئ".split(",");
const LANGS = {
  darija: "Algerian Darija (الدارجة الجزائرية) exactly as spoken on the street in Algeria, written in Arabic script",
  mix: "Algerian Darija mixed with common French words, the way Algerians really speak, written in Arabic script (French words may stay in Latin letters)",
  fusha: "simple Modern Standard Arabic"
};
let shots = [], audioBlob = null, clips = [], ff = null, imgs = [];

function msg(t, err) { const s = $("#status"); s.textContent = t; s.className = err ? "err" : ""; s.hidden = !t; }
const keys = n => (S.get(n, "") || "").split(/\s+/).filter(Boolean);
const rot = { kText: 0, kAudio: 0 }, cool = {};

async function gem(path, body, key, method = "POST") {
  const r = await fetch(API + path + (path.includes("?") ? "&" : "?") + "key=" + key, {
    method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error?.message || r.statusText); e.status = r.status; throw e; }
  return j;
}

async function withKeys(pool, fn) {
  const ks = keys(pool);
  if (!ks.length) throw new Error("أضف مفتاحاً واحداً على الأقل من الإعدادات.");
  let last;
  for (let i = 0; i < ks.length; i++) {
    const idx = (rot[pool] + i) % ks.length, k = ks[idx];
    if (cool[k] > Date.now()) continue;
    try { const r = await fn(k); rot[pool] = idx; return r; }
    catch (e) {
      last = e;
      if ([429, 503, 403].includes(e.status) || /API key/i.test(e.message)) {
        cool[k] = Date.now() + (e.status === 429 ? 60000 : 600000);
        msg("المفتاح …" + k.slice(-4) + " غير متاح، الانتقال للتالي", true);
        continue;
      }
      throw e;
    }
  }
  throw last || new Error("كل المفاتيح مستنفدة مؤقتاً. انتظر دقيقة أو أضف مفاتيح.");
}

/* ---------- Settings ---------- */
function fillSel(sel, list, cur) {
  sel.innerHTML = list.map(m => `<option>${m}</option>`).join("");
  if (cur && list.includes(cur)) sel.value = cur;
}
function initModels() {
  fillSel($("#mText"), S.get("mods", { t: ["gemini-2.5-flash"] }).t, S.get("mText"));
  fillSel($("#mTTS"), S.get("mods", { s: ["gemini-2.5-flash-preview-tts"] }).s || ["gemini-2.5-flash-preview-tts"], S.get("mTTS"));
}
async function loadModels() {
  msg("جاري جلب النماذج…");
  const pool = keys("kText").length ? "kText" : "kAudio";
  const j = await withKeys(pool, k => gem("models?pageSize=200", null, k, "GET"));
  const all = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => m.name.replace("models/", ""));
  const bad = /tts|image|embed|live|audio|aqa|robotics|computer|veo|imagen/;
  const t = all.filter(n => n.startsWith("gemini") && !bad.test(n));
  const s = all.filter(n => /tts/.test(n));
  S.set("mods", { t: t.length ? t : ["gemini-2.5-flash"], s: s.length ? s : ["gemini-2.5-flash-preview-tts"] });
  initModels(); msg("");
}
async function testKeys() {
  const out = $("#testOut"); out.innerHTML = "";
  for (const n of ["kText", "kAudio"]) {
    const ks = (($("#" + n).value) || "").split(/\s+/).filter(Boolean);
    for (const k of ks) {
      let ok = true, m = "";
      try { await gem("models?pageSize=1", null, k, "GET"); } catch (e) { ok = false; m = e.message.slice(0, 60); }
      out.innerHTML += `<div class="${ok ? "ok" : "bad"}">${n === "kText" ? "نص" : "صوت"} …${k.slice(-4)} ${ok ? "يعمل" : "✗ " + m}</div>`;
    }
  }
  if (!out.innerHTML) out.textContent = "لا توجد مفاتيح.";
}

/* ---------- Script generation ---------- */
async function imgB64(file, max = 1024, q = .85) {
  const b = await createImageBitmap(file).catch(() => createImageBitmap(file, { resizeWidth: max })), s = Math.min(1, max / Math.max(b.width, b.height));
  const c = document.createElement("canvas"); c.width = b.width * s; c.height = b.height * s;
  c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
  b.close && b.close();
  return c.toDataURL("image/jpeg", q).split(",")[1];
}
function buildPrompt(f, hasImg) {
  const n = f.dur / 10, used = f.type === "used";
  return `You are a senior ad creative for the Algerian market. Create a ${f.dur}-second video ad.
Product: ${f.name}. Details: ${f.desc}. Category: ${used ? "USED / second-hand item" : f.type}. Audience: ${f.aud || "general Algerian public"}. Offer/CTA: ${f.offer || "invite viewers to order now"}.
Tone: ${f.tone}. Visual style: ${f.style}. ${f.people}.
${hasImg ? hasImg + " reference image(s) are attached, numbered #1 to #" + hasImg + " in the order given. Describe each one briefly in the images array (what it shows, e.g. front of the product, shop interior). Describe the exact look of the product/place inside style_bible so every shot keeps it identical. For each shot, refs lists the image numbers (1 to " + hasImg + ") the user should upload to Flow as reference for that shot: the 1 to 3 most relevant only, or an empty array if none fits." : "No reference images were attached, so refs must be an empty array and images an empty array."}
${used ? usedRules(f) : ""}
Return ONLY JSON: {"title":string,"style_bible":string,"images":[string],"shots":[{"flow_prompt":string,"refs":[number],"shoot_yourself":boolean,"voiceover":string}],"caption":string}
Rules:
- Exactly ${n} shots of 10 seconds each. Structure: strong hook in the first 3 seconds, problem, product as the solution, benefits, then a clear call to action with the offer in the last shot.
- style_bible: one English paragraph (lighting, color palette, lens, product look) repeated inside every flow_prompt.
- flow_prompt: English, for Google Flow/Veo, aspect ratio ${f.ratio}. Describe action, camera movement, setting, lighting. No on-screen text, no speech, no music.
- voiceover: in ${LANGS[f.lang]}. Only 15 to 18 words per shot (each shot lasts 10 seconds and Darija is spoken fast, so the voiceover must fit in about 8.5 seconds), natural spoken ad copy, no stage directions.
- caption: a short social media caption in the same language with hashtags.`;
}
function readForm() {
  const g = id => $("#" + id).value.trim();
  return { name: g("name"), desc: g("desc"), aud: g("aud"), offer: g("offer"), type: g("type"), lang: g("lang"), tone: g("tone"), style: g("style"), people: g("people"), ratio: g("ratio"), dur: +g("dur"), ucond: g("ucond"), uuse: g("uuse"), udef: g("udef"), uwork: g("uwork"), ureason: g("ureason"), uprice: g("uprice"), udisc: g("udisc") };
}
async function generate() {
  const f = readForm();
  if (!f.name) return msg("اكتب اسم المنتج أولاً.", true);
  $("#btnGen").disabled = true; msg("Gemini يكتب السيناريو…");
  try {
    const files = imgs.map(x => x.f), parts = [];
    for (let i = 0; i < files.length; i++) {
      parts.push({ text: "Image #" + (i + 1) + ":" });
      parts.push({ inlineData: { mimeType: "image/jpeg", data: await imgB64(files[i]) } });
    }
    parts.push({ text: buildPrompt(f, files.length) });
    const model = $("#mText").value || "gemini-2.5-flash";
    const j = await withKeys("kText", k => gem(`models/${model}:generateContent`, { contents: [{ parts }], generationConfig: { responseMimeType: "application/json", temperature: .9 } }, k));
    const txt = j.candidates[0].content.parts.map(p => p.text || "").join("").replace(/```json|```/g, "").trim();
    const d = JSON.parse(txt);
    shots = d.shots; audioBlob = null; resetAudioUI();
    cur = { id: Date.now().toString(36), created: Date.now(), name: f.name, caption: d.caption || "", thumbs: await Promise.all(files.map(x => imgB64(x, 240, .7))), images: d.images || [], voice: $("#voice").value, form: Object.fromEntries(FIELDS.map(k => [k, $("#" + k).value])) };
    await saveCur(); renderGallery(cur.thumbs.map(t => "data:image/jpeg;base64," + t), cur.images); renderShots(d); renderProjects(); msg("");
  } catch (e) { msg("تعذر الإنشاء: " + e.message, true); }
  $("#btnGen").disabled = false;
}
function renderShots(d) {
  $("#shots").innerHTML = shots.map((s, i) => `<div class="shot"><b>لقطة ${i + 1}</b>
    <label>برومبت Flow<textarea class="en" rows="5" data-i="${i}" data-k="flow_prompt">${s.flow_prompt}</textarea></label>${refsHtml(s)}${s.shoot_yourself ? `<div class="shoot">🎥 يُنصح بتصويرها بنفسك بهاتفك لأنها تُظهر العيوب أو التجربة الفعلية</div>` : ""}
    <label>التعليق الصوتي<textarea rows="3" data-i="${i}" data-k="voiceover">${s.voiceover}</textarea></label>
    <button data-copy="${i}">نسخ البرومبت</button></div>`).join("");
  $("#cap").textContent = d.caption ? "الوصف المقترح: " + d.caption : "";
  ["secRes", "secAud", "secMerge"].forEach(id => $("#" + id).hidden = false);
  $("#secRes").scrollIntoView({ behavior: "smooth" });
}

const COLORS = ["#d93a31", "#c77700", "#12805a", "#2563eb", "#7c3aed", "#be185d"];
function renderGallery(srcs, descs = [], rm = false) {
  $("#gallery").innerHTML = srcs.map((s, i) => `<figure><img src="${s}" alt=""><b style="background:${COLORS[i % 6]}">#${i + 1}</b><figcaption>${esc(descs[i] || "")}</figcaption>${rm ? `<button class="x" data-rm="${i}">✕</button>` : ""}</figure>`).join("");
}
const refsHtml = s => (s.refs && s.refs.length) ? `<div class="refs">ارفع كمرجع في Flow: ${s.refs.map(r => `<span class="tag" style="background:${COLORS[(r - 1) % 6]}">#${r}</span>`).join(" ")}</div>` : "";

async function addImages(fl) {
  const got = [...fl]; $("#img").value = "";
  if (!got.length) return;
  msg("جاري تحضير الصور…"); let added = 0; const bad = [];
  for (const f of got) {
    if (imgs.length >= 6) break;
    if (imgs.some(x => x.f.name === f.name && x.f.size === f.size && x.f.lastModified === f.lastModified)) continue;
    try { imgs.push({ f, t: "data:image/jpeg;base64," + await imgB64(f, 240, .7) }); added++; } catch (e) { bad.push(f.name); }
    renderGallery(imgs.map(x => x.t), [], true);
  }
  let t = "تمت إضافة " + added + " من " + got.length + " (المجموع " + imgs.length + "/6). لإضافة المزيد اضغط اختيار الملفات مرة أخرى.";
  if (bad.length) t += " تعذر قراءة: " + bad.join("، ");
  msg(t, bad.length > 0); setTimeout(() => msg(""), 6000);
}

const usedRules = f => `
THIS IS A USED, SECOND-HAND ITEM AND THE AD MUST BE COMPLETELY HONEST:
- Condition: ${f.ucond || "not specified"}. Time used: ${f.uuse || "not specified"}. Reason for selling: ${f.ureason || "not specified"}. Price: ${f.uprice || "not specified"}.
- Known defects (must be shown and mentioned, never hidden): ${f.udef || "none declared"}.
- What works / what does not: ${f.uwork || "not specified"}.
- Every flow_prompt must state that the item looks exactly like the reference image(s), keeps every scratch, stain, wear mark and dent, and must NOT be cleaned, polished, repaired, restyled, upgraded or made to look new. Use plain natural lighting with no glamour or beauty enhancement.
- One shot must be an honest close-up on the defects. Set "shoot_yourself" to true for shots that show defects or demonstrate the item working, because the seller should film them with their own phone (still write a flow_prompt as a fallback); false for the others.
- Voiceover: sincere and trustworthy, no exaggeration, never say "like new" unless the condition is excellent. Say the real defects out loud in a friendly honest way (in Darija for example "نقولك الحقيقة"), mention what works, the reason for selling and the price, and invite the buyer to inspect and test before buying.
- The caption ${f.udisc === "yes" ? "must end with a short note that the photos are real and the video was made with AI assistance" : "must stay honest about the condition"}.
`;
const toggleUsed = () => { $("#usedBox").hidden = $("#type").value !== "used"; };
async function detectDefects() {
  if (!imgs.length) return msg("أضف صور المنتج أولاً.", true);
  $("#btnDef").disabled = true; msg("Gemini يفحص الصور…");
  try {
    const parts = [];
    for (let i = 0; i < imgs.length; i++) { parts.push({ text: "Image #" + (i + 1) + ":" }); parts.push({ inlineData: { mimeType: "image/jpeg", data: await imgB64(imgs[i].f) } }); }
    parts.push({ text: "These are photos of a USED item being sold. In Arabic, list only the defects, wear, scratches, stains, dents or damage that are CLEARLY visible, one per line, each ending with the image number like (#1). Be accurate and neutral: never invent a defect and never hide one. If nothing is clearly visible write: لا توجد عيوب واضحة في الصور. Output plain lines only." });
    const model = $("#mText").value || "gemini-2.5-flash";
    const j = await withKeys("kText", k => gem(`models/${model}:generateContent`, { contents: [{ parts }] }, k));
    const t = j.candidates[0].content.parts.map(p => p.text || "").join("").trim(), el = $("#udef");
    el.value = (el.value.trim() ? el.value.trim() + "\n" : "") + t;
    msg("راجع قائمة العيوب وعدّلها: قد يفوّت الذكاء الاصطناعي عيباً أو يخطئ.");
  } catch (e) { msg("تعذر الفحص: " + errText(e), true); }
  $("#btnDef").disabled = false;
}

/* ---------- Voice ---------- */
function wav(pcm, sr = 24000) {
  const b = new ArrayBuffer(44 + pcm.length), v = new DataView(b);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, pcm.length, true);
  new Uint8Array(b, 44).set(pcm);
  return new Blob([b], { type: "audio/wav" });
}
async function tts(text) {
  const f = readForm(), voice = $("#voice").value;
  const style = `Read this Algerian advertisement in a ${f.tone} tone with a natural Algerian accent, at a brisk, lively advertising pace, with short pauses between sentences: `;
  const model = $("#mTTS").value || "gemini-2.5-flash-preview-tts";
  const j = await withKeys("kAudio", k => gem(`models/${model}:generateContent`, {
    contents: [{ parts: [{ text: style + text }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } }
  }, k));
  const d = j.candidates[0].content.parts.find(p => p.inlineData).inlineData.data;
  return wav(Uint8Array.from(atob(d), c => c.charCodeAt(0)));
}
async function genAudio() {
  $("#btnAud").disabled = true; msg("جاري توليد الصوت…");
  try {
    audioBlob = await tts(shots.map(s => s.voiceover).join("\n"));
    showAudio(); cur && (cur.voice = $("#voice").value); await saveCur(); renderProjects();
    msg("");
  } catch (e) { msg("تعذر توليد الصوت: " + e.message, true); }
  $("#btnAud").disabled = false;
}
async function preview() {
  msg("تجربة الصوت…");
  try { const a = new Audio(URL.createObjectURL(await tts("مرحبا بيكم! هذا هو الصوت لي راح يقدّم إعلانكم."))); a.play(); msg(""); }
  catch (e) { msg("تعذر التجربة: " + e.message, true); }
}

/* ---------- Merge ---------- */
const errText = e => (e && e.message) || (typeof e === "string" ? e : (() => { try { return JSON.stringify(e); } catch { return String(e); } })()) || "خطأ غير معروف";
const mediaDur = f => new Promise(ok => { const v = document.createElement("video"), u = URL.createObjectURL(f); v.preload = "metadata"; v.onloadedmetadata = () => { ok(v.duration || 0); URL.revokeObjectURL(u); }; v.onerror = () => ok(0); v.src = u; });
const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("تعذر تحميل " + src)); document.head.appendChild(s); });
async function loadFF() {
  if (ff) return ff;
  const cdn = "https://cdn.jsdelivr.net/npm/";
  msg("تحميل أداة الدمج (مرة واحدة، حوالي 30 ميغابايت)…");
  await loadScript(cdn + "@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
  await loadScript(cdn + "@ffmpeg/util@0.12.1/dist/umd/index.js");
  const { toBlobURL } = FFmpegUtil, core = cdn + "@ffmpeg/core@0.12.6/dist/esm/";
  const f = new FFmpegWASM.FFmpeg();
  f.on("progress", ({ progress }) => msg("جاري " + (window.__ph || "الدمج") + "… " + Math.round(Math.min(1, Math.max(0, progress)) * 100) + "%"));
  await f.load({
    classWorkerURL: await toBlobURL(cdn + "@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js", "text/javascript"),
    coreURL: await toBlobURL(core + "ffmpeg-core.js", "text/javascript"),
    wasmURL: await toBlobURL(core + "ffmpeg-core.wasm", "application/wasm")
  });
  return (ff = f);
}
function renderClips() {
  $("#clipList").innerHTML = clips.map((c, i) => `<li>${c.name} <button data-up="${i}">▲</button><button data-dn="${i}">▼</button><button data-rm="${i}">✕</button></li>`).join("");
}
const vidSize = b => new Promise(ok => { const v = document.createElement("video"), u = URL.createObjectURL(b); v.preload = "metadata"; v.onloadedmetadata = () => { ok({ w: v.videoWidth, h: v.videoHeight }); URL.revokeObjectURL(u); }; v.onerror = () => ok({ w: 0, h: 0 }); v.src = u; });
function setOut(id, blob, name) {
  const u = URL.createObjectURL(blob), d = $("#" + id + "-dl");
  $("#" + id).src = u; d.href = u; d.download = name;
  ["", "-dl", "-sh", "-lbl"].forEach(s => $("#" + id + s).hidden = false);
  $("#" + id + "-sh").onclick = () => shareBlob(blob, name);
}
async function shareBlob(b, name) {
  const file = new File([b], name, { type: "video/mp4" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: name });
    else msg("المشاركة المباشرة غير مدعومة في متصفحك، استعمل زر التحميل.", true);
  } catch (e) { if (e.name !== "AbortError") msg("تعذرت المشاركة: " + errText(e), true); }
}
async function wmPng(W, H) {
  const text = S.get("wmText", "نموذج للمعاينة") || "نموذج للمعاينة", brand = S.get("wmBrand", ""), op = +S.get("wmOp", "0.75") || .75, two = S.get("wm2", "no") === "yes";
  try { await document.fonts.load("bold 30px Cairo"); } catch (e) { }
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"), font = px => `bold ${px}px Cairo, Tahoma, "Segoe UI", sans-serif`;
  const band = ang => {
    const bh = Math.round(H * .085), len = Math.hypot(W, H) * 1.3;
    x.save(); x.translate(W / 2, H / 2); x.rotate(ang * Math.PI / 180);
    x.fillStyle = `rgba(0,0,0,${op})`; x.fillRect(-len / 2, -bh / 2, len, bh);
    x.beginPath(); x.rect(-len / 2, -bh / 2, len, bh); x.clip();
    x.fillStyle = "#fff"; x.font = font(bh * .52); x.textAlign = "center"; x.textBaseline = "middle"; x.direction = "rtl";
    const unit = text + "   ◆   "; let line = unit; while (x.measureText(line).width < len) line += unit;
    x.fillText(line, 0, 0); x.restore();
  };
  band(-25); if (two) band(25);
  if (brand) {
    const bh = Math.round(H * .05); x.fillStyle = "rgba(0,0,0,.7)"; x.fillRect(0, H - bh, W, bh);
    x.fillStyle = "#fff"; x.font = font(bh * .55); x.textAlign = "center"; x.textBaseline = "middle"; x.direction = "rtl"; x.fillText(brand, W / 2, H - bh / 2);
  }
  const b = await new Promise(ok => c.toBlob(ok, "image/png"));
  return new Uint8Array(await b.arrayBuffer());
}
async function makePreview(f, blob) {
  const { w, h } = await vidSize(blob);
  if (!w) throw new Error("تعذر قراءة أبعاد الفيديو");
  const s = Math.min(1, (w > h ? 640 : 480) / w), W = Math.round(w * s / 2) * 2, H = Math.round(h * s / 2) * 2;
  await f.writeFile("wm.png", await wmPng(W, H));
  const r = await f.exec(["-y", "-i", "out.mp4", "-i", "wm.png", "-filter_complex", "[0:v]scale=" + W + ":" + H + "[b];[b][1:v]overlay=0:0", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "prev.mp4"]);
  if (r !== 0) throw new Error("فشل ترميز المعاينة");
  const d = await f.readFile("prev.mp4");
  await f.deleteFile("prev.mp4").catch(() => { }); await f.deleteFile("wm.png").catch(() => { });
  return new Blob([d], { type: "video/mp4" });
}
async function merge() {
  if (!audioBlob) return msg("ولّد الصوت أولاً.", true);
  if (!clips.length) return msg("ارفع مقاطع Flow أولاً.", true);
  $("#btnMerge").disabled = true; ["prev", "prev-dl", "prev-sh", "prev-lbl"].forEach(i => $("#" + i).hidden = true);
  try {
    const f = await loadFF(); msg("جاري الدمج…");
    await f.writeFile("a.wav", new Uint8Array(await audioBlob.arrayBuffer()));
    let list = "";
    for (let i = 0; i < clips.length; i++) {
      await f.writeFile(`c${i}.mp4`, new Uint8Array(await clips[i].arrayBuffer()));
      list += `file 'c${i}.mp4'\n`;
    }
    await f.writeFile("l.txt", list);
    const vd = (await Promise.all(clips.map(mediaDur))).reduce((s, x) => s + x, 0), ad = await mediaDur(audioBlob);
    let af = "apad", note = "";
    if (vd > 1 && ad > vd - 0.2) {
      const r = Math.min(1.25, ad / (vd - 0.3));
      af = "atempo=" + r.toFixed(3) + ",apad"; note = " (تسريع الصوت ×" + r.toFixed(2) + ")";
      if (ad / r > vd) note += " الصوت ما زال أطول وسيُقص، اختصر النص.";
    }
    const base = ["-y", "-f", "concat", "-safe", "0", "-i", "l.txt", "-i", "a.wav", "-map", "0:v:0", "-map", "1:a:0"];
    const tail = ["-af", af, "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", "out.mp4"];
    let code = await f.exec([...base, "-c:v", "copy", ...tail]);
    if (code !== 0) code = await f.exec([...base, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", ...tail]);
    if (code !== 0) throw new Error("فشل الدمج، تأكد أن المقاطع بصيغة mp4.");
    const data = await f.readFile("out.mp4"), outBlob = new Blob([data], { type: "video/mp4" });
    const fn = (cur && cur.name ? cur.name : "ad").replace(/[^\w\u0600-\u06FF]+/g, "_");
    setOut("out", outBlob, fn + "_original.mp4");
    for (let i = 0; i < clips.length; i++) await f.deleteFile(`c${i}.mp4`).catch(() => { });
    msg("تم الدمج." + note);
    if ($("#mkPrev").value === "yes") {
      try { window.__ph = "إنشاء المعاينة"; setOut("prev", await makePreview(f, outBlob), fn + "_preview.mp4"); msg("تم إنشاء النسختين." + note); }
      catch (e) { msg("تم الدمج، لكن تعذر إنشاء المعاينة: " + errText(e), true); }
      window.__ph = "الدمج";
    }
    ["out.mp4", "a.wav", "l.txt"].forEach(n => f.deleteFile(n).catch(() => { }));
  } catch (e) { msg("خطأ في الدمج: " + errText(e), true); }
  $("#btnMerge").disabled = false;
}

/* ---------- Projects ---------- */
let cur = null, saveT;
const FIELDS = ["name", "desc", "aud", "offer", "type", "lang", "tone", "style", "people", "ratio", "dur", "ucond", "uuse", "udef", "uwork", "ureason", "uprice", "udisc"];
const LN = { darija: "دارجة", mix: "دارجة + فرنسية", fusha: "فصحى" };
const esc = s => String(s).replace(/[&<>"']/g, c => "&#" + c.charCodeAt(0) + ";");
const DB = {
  open() { return this.p || (this.p = new Promise((ok, no) => { const r = indexedDB.open("bup", 1); r.onupgradeneeded = () => r.result.createObjectStore("p", { keyPath: "id" }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); })); },
  async tx(m, f) { const d = await this.open(); return new Promise((ok, no) => { const t = d.transaction("p", m), q = f(t.objectStore("p")); t.oncomplete = () => ok(q && q.result); t.onerror = () => no(t.error); }); },
  all() { return this.tx("readonly", s => s.getAll()); }, get(id) { return this.tx("readonly", s => s.get(id)); },
  put(p) { return this.tx("readwrite", s => s.put(p)); }, del(id) { return this.tx("readwrite", s => s.delete(id)); }
};
async function saveCur() {
  if (!cur) return;
  cur.shots = shots; cur.audio = audioBlob; cur.updated = Date.now();
  try { await DB.put(cur); } catch (e) { msg("تعذر حفظ المشروع: " + errText(e), true); }
}
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(saveCur, 700); };
function resetAudioUI() { $("#aud-el").hidden = true; $("#aud-dl").hidden = true; $("#aud-info").textContent = ""; }
function showAudio() {
  const url = URL.createObjectURL(audioBlob), a = $("#aud-el");
  a.src = url; a.hidden = false; $("#aud-dl").href = url; $("#aud-dl").hidden = false;
  a.onloadedmetadata = () => $("#aud-info").textContent = `مدة الصوت ${a.duration.toFixed(1)} ث، ومدة الفيديو المتوقعة ${shots.length * 10} ث.` + (a.duration > shots.length * 10 ? " الصوت أطول من الفيديو: سيُسرَّع قليلاً عند الدمج، والأفضل اختصار النص." : "");
}
async function renderProjects() {
  const list = ((await DB.all()) || []).sort((x, y) => y.updated - x.updated);
  $("#projects").innerHTML = list.length ? list.map(p => `<div class="card${cur && cur.id === p.id ? " on" : ""}">
    ${(p.thumbs && p.thumbs[0]) || p.thumb ? `<img src="data:image/jpeg;base64,${(p.thumbs && p.thumbs[0]) || p.thumb}" alt="">` : `<div class="ph">▶</div>`}
    <b>${esc(p.name)}</b><span class="mut">${p.shots.length * 10} ث · ${LN[p.form.lang] || ""} · ${new Date(p.updated).toLocaleDateString("fr-FR")}${p.audio ? " · 🔊" : ""}</span>
    <div class="row"><button data-open="${p.id}">فتح</button><button data-del="${p.id}">حذف</button></div></div>`).join("")
    : `<p class="mut">لا توجد مشاريع بعد. أول إعلان تنشئه سيُحفظ هنا تلقائياً.</p>`;
}
async function openProject(id) {
  const p = await DB.get(id); if (!p) return;
  cur = p; shots = p.shots; audioBlob = p.audio || null;
  FIELDS.forEach(k => { if (p.form[k] !== undefined) $("#" + k).value = p.form[k]; }); toggleUsed(); if (p.voice) $("#voice").value = p.voice;
  imgs = []; resetAudioUI(); renderGallery((p.thumbs || []).map(t => "data:image/jpeg;base64," + t), p.images); renderShots({ caption: p.caption }); if (audioBlob) showAudio(); renderProjects();
}
function newProject() {
  cur = null; shots = []; audioBlob = null; resetAudioUI();
  FIELDS.forEach(k => { const e = $("#" + k); if (e.tagName !== "SELECT") e.value = ""; });
  $("#img").value = ""; imgs = []; renderGallery([]); ["secRes", "secAud", "secMerge"].forEach(id => $("#" + id).hidden = true);
  renderProjects(); window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Events ---------- */
document.addEventListener("DOMContentLoaded", () => {
  $("#ver").textContent = "الإصدار " + VERSION;
  $("#voice").innerHTML = VOICES.map(v => { const [n, d] = v.split(":"); return `<option value="${n}">${n} (${d})</option>`; }).join("");
  $("#voice").value = S.get("voice", "Kore");
  $("#voice").onchange = () => S.set("voice", $("#voice").value);
  $("#kText").value = S.get("kText", ""); $("#kAudio").value = S.get("kAudio", "");
  $("#wmText").value = S.get("wmText", "نموذج للمعاينة"); $("#wmBrand").value = S.get("wmBrand", ""); $("#wmOp").value = S.get("wmOp", "0.75"); $("#wm2").value = S.get("wm2", "no");
  initModels(); renderProjects(); navigator.storage?.persist?.();
  $("#btnNew").onclick = newProject; $("#type").onchange = toggleUsed; $("#btnDef").onclick = detectDefects; toggleUsed();
  $("#img").onchange = e => addImages(e.target.files);
  $("#gallery").addEventListener("click", e => { const r = e.target.dataset.rm; if (r != null && imgs.length) { imgs.splice(+r, 1); renderGallery(imgs.map(x => x.t), [], true); } });
  $("#projects").addEventListener("click", async e => {
    const d = e.target.dataset;
    if (d.open) openProject(d.open);
    if (d.del && confirm("حذف هذا المشروع نهائياً؟")) { await DB.del(d.del); if (cur && cur.id === d.del) cur = null; renderProjects(); }
  });
  $("#btnSet").onclick = () => $("#dlg").showModal();
  $("#btnSave").onclick = () => {
    S.set("kText", $("#kText").value); S.set("kAudio", $("#kAudio").value);
    S.set("mText", $("#mText").value); S.set("mTTS", $("#mTTS").value);
    ["wmText", "wmBrand", "wmOp", "wm2"].forEach(k => S.set(k, $("#" + k).value)); $("#dlg").close();
  };
  $("#btnTest").onclick = testKeys;
  $("#btnModels").onclick = async () => { S.set("kText", $("#kText").value); S.set("kAudio", $("#kAudio").value); try { await loadModels(); } catch (e) { msg(e.message, true); } };
  $("#btnGen").onclick = generate; $("#btnPrev").onclick = preview; $("#btnAud").onclick = genAudio; $("#btnMerge").onclick = merge;
  $("#shots").addEventListener("input", e => { const t = e.target; if (t.dataset.i) { shots[t.dataset.i][t.dataset.k] = t.value; saveSoon(); } });
  $("#shots").addEventListener("click", e => { const i = e.target.dataset.copy; if (i != null) { navigator.clipboard.writeText(shots[i].flow_prompt); msg("تم النسخ."); setTimeout(() => msg(""), 1200); } });
  $("#btnCopyAll").onclick = () => { navigator.clipboard.writeText(shots.map((s, i) => `لقطة ${i + 1}${s.shoot_yourself ? " [صوّرها بنفسك]" : ""}${s.refs && s.refs.length ? " (صور مرجعية: " + s.refs.map(r => "#" + r).join(" ") + ")" : ""}:\n${s.flow_prompt}`).join("\n\n")); msg("تم نسخ الكل."); setTimeout(() => msg(""), 1200); };
  $("#clips").onchange = e => { clips = [...e.target.files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); renderClips(); };
  $("#clipList").addEventListener("click", e => {
    const d = e.target.dataset, sw = (a, b) => { if (b >= 0 && b < clips.length) [clips[a], clips[b]] = [clips[b], clips[a]]; };
    if (d.up != null) sw(+d.up, +d.up - 1); if (d.dn != null) sw(+d.dn, +d.dn + 1); if (d.rm != null) clips.splice(+d.rm, 1);
    renderClips();
  });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").then(r => r.update()).catch(() => { });
});
