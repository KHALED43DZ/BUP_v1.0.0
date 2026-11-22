const VERSION = "1.0.0";
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
let shots = [], audioBlob = null, clips = [], ff = null;

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
async function imgB64(file) {
  const b = await createImageBitmap(file), s = Math.min(1, 1024 / Math.max(b.width, b.height));
  const c = document.createElement("canvas"); c.width = b.width * s; c.height = b.height * s;
  c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", .85).split(",")[1];
}
function buildPrompt(f, hasImg) {
  const n = f.dur / 10;
  return `You are a senior ad creative for the Algerian market. Create a ${f.dur}-second video ad.
Product: ${f.name}. Details: ${f.desc}. Category: ${f.type}. Audience: ${f.aud || "general Algerian public"}. Offer/CTA: ${f.offer || "invite viewers to order now"}.
Tone: ${f.tone}. Visual style: ${f.style}. ${f.people}.
${hasImg ? "Study the attached product image and describe the product's exact look (shape, colors, packaging) inside style_bible so every shot keeps it identical." : ""}
Return ONLY JSON: {"title":string,"style_bible":string,"shots":[{"flow_prompt":string,"voiceover":string}],"caption":string}
Rules:
- Exactly ${n} shots of 10 seconds each. Structure: strong hook in the first 3 seconds, problem, product as the solution, benefits, then a clear call to action with the offer in the last shot.
- style_bible: one English paragraph (lighting, color palette, lens, product look) repeated inside every flow_prompt.
- flow_prompt: English, for Google Flow/Veo, aspect ratio ${f.ratio}. Describe action, camera movement, setting, lighting. No on-screen text, no speech, no music.
- voiceover: in ${LANGS[f.lang]}. About 20 to 24 words per shot, natural spoken ad copy, no stage directions.
- caption: a short social media caption in the same language with hashtags.`;
}
function readForm() {
  const g = id => $("#" + id).value.trim();
  return { name: g("name"), desc: g("desc"), aud: g("aud"), offer: g("offer"), type: g("type"), lang: g("lang"), tone: g("tone"), style: g("style"), people: g("people"), ratio: g("ratio"), dur: +g("dur") };
}
async function generate() {
  const f = readForm();
  if (!f.name) return msg("اكتب اسم المنتج أولاً.", true);
  $("#btnGen").disabled = true; msg("Gemini يكتب السيناريو…");
  try {
    const parts = []; const file = $("#img").files[0];
    if (file) parts.push({ inlineData: { mimeType: "image/jpeg", data: await imgB64(file) } });
    parts.push({ text: buildPrompt(f, !!file) });
    const model = $("#mText").value || "gemini-2.5-flash";
    const j = await withKeys("kText", k => gem(`models/${model}:generateContent`, { contents: [{ parts }], generationConfig: { responseMimeType: "application/json", temperature: .9 } }, k));
    const txt = j.candidates[0].content.parts.map(p => p.text || "").join("").replace(/```json|```/g, "").trim();
    const d = JSON.parse(txt);
    shots = d.shots; renderShots(d); msg("");
  } catch (e) { msg("تعذر الإنشاء: " + e.message, true); }
  $("#btnGen").disabled = false;
}
function renderShots(d) {
  $("#shots").innerHTML = shots.map((s, i) => `<div class="shot"><b>لقطة ${i + 1}</b>
    <label>برومبت Flow<textarea class="en" rows="5" data-i="${i}" data-k="flow_prompt">${s.flow_prompt}</textarea></label>
    <label>التعليق الصوتي<textarea rows="3" data-i="${i}" data-k="voiceover">${s.voiceover}</textarea></label>
    <button data-copy="${i}">نسخ البرومبت</button></div>`).join("");
  $("#cap").textContent = d.caption ? "الوصف المقترح: " + d.caption : "";
  ["secRes", "secAud", "secMerge"].forEach(id => $("#" + id).hidden = false);
  $("#secRes").scrollIntoView({ behavior: "smooth" });
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
  const style = `Read this Algerian advertisement in a ${f.tone} tone with a natural Algerian accent, at a lively advertising pace, with short pauses between sentences: `;
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
    const url = URL.createObjectURL(audioBlob), a = $("#aud-el");
    a.src = url; a.hidden = false; $("#aud-dl").href = url; $("#aud-dl").hidden = false;
    a.onloadedmetadata = () => $("#aud-info").textContent = `مدة الصوت ${a.duration.toFixed(1)} ث، ومدة الفيديو المتوقعة ${shots.length * 10} ث.` + (a.duration > shots.length * 10 ? " الصوت أطول من الفيديو وسيُقص، اختصر النص." : "");
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
const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("تعذر تحميل " + src)); document.head.appendChild(s); });
async function loadFF() {
  if (ff) return ff;
  const cdn = "https://cdn.jsdelivr.net/npm/";
  msg("تحميل أداة الدمج (مرة واحدة، حوالي 30 ميغابايت)…");
  await loadScript(cdn + "@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js");
  await loadScript(cdn + "@ffmpeg/util@0.12.1/dist/umd/index.js");
  const { toBlobURL } = FFmpegUtil, core = cdn + "@ffmpeg/core@0.12.6/dist/umd/";
  const f = new FFmpegWASM.FFmpeg();
  f.on("progress", ({ progress }) => msg("جاري الدمج… " + Math.round(Math.min(1, Math.max(0, progress)) * 100) + "%"));
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
async function merge() {
  if (!audioBlob) return msg("ولّد الصوت أولاً.", true);
  if (!clips.length) return msg("ارفع مقاطع Flow أولاً.", true);
  $("#btnMerge").disabled = true;
  try {
    const f = await loadFF(); msg("جاري الدمج…");
    await f.writeFile("a.wav", new Uint8Array(await audioBlob.arrayBuffer()));
    let list = "";
    for (let i = 0; i < clips.length; i++) {
      await f.writeFile(`c${i}.mp4`, new Uint8Array(await clips[i].arrayBuffer()));
      list += `file 'c${i}.mp4'\n`;
    }
    await f.writeFile("l.txt", list);
    const base = ["-f", "concat", "-safe", "0", "-i", "l.txt", "-i", "a.wav", "-map", "0:v:0", "-map", "1:a:0"];
    const tail = ["-af", "apad", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", "out.mp4"];
    let code = await f.exec([...base, "-c:v", "copy", ...tail]);
    if (code !== 0) code = await f.exec([...base, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", ...tail]);
    if (code !== 0) throw new Error("فشل الدمج، تأكد أن المقاطع بصيغة mp4.");
    const data = await f.readFile("out.mp4"), url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
    $("#out").src = url; $("#out").hidden = false; $("#out-dl").href = url; $("#out-dl").hidden = false;
    for (let i = 0; i < clips.length; i++) await f.deleteFile(`c${i}.mp4`).catch(() => { });
    msg("تم الدمج.");
  } catch (e) { msg("خطأ في الدمج: " + e.message, true); }
  $("#btnMerge").disabled = false;
}

/* ---------- Events ---------- */
document.addEventListener("DOMContentLoaded", () => {
  $("#ver").textContent = "الإصدار " + VERSION;
  $("#voice").innerHTML = VOICES.map(v => { const [n, d] = v.split(":"); return `<option value="${n}">${n} (${d})</option>`; }).join("");
  $("#voice").value = S.get("voice", "Kore");
  $("#voice").onchange = () => S.set("voice", $("#voice").value);
  $("#kText").value = S.get("kText", ""); $("#kAudio").value = S.get("kAudio", "");
  initModels();
  $("#btnSet").onclick = () => $("#dlg").showModal();
  $("#btnSave").onclick = () => {
    S.set("kText", $("#kText").value); S.set("kAudio", $("#kAudio").value);
    S.set("mText", $("#mText").value); S.set("mTTS", $("#mTTS").value); $("#dlg").close();
  };
  $("#btnTest").onclick = testKeys;
  $("#btnModels").onclick = async () => { S.set("kText", $("#kText").value); S.set("kAudio", $("#kAudio").value); try { await loadModels(); } catch (e) { msg(e.message, true); } };
  $("#btnGen").onclick = generate; $("#btnPrev").onclick = preview; $("#btnAud").onclick = genAudio; $("#btnMerge").onclick = merge;
  $("#shots").addEventListener("input", e => { const t = e.target; if (t.dataset.i) shots[t.dataset.i][t.dataset.k] = t.value; });
  $("#shots").addEventListener("click", e => { const i = e.target.dataset.copy; if (i != null) { navigator.clipboard.writeText(shots[i].flow_prompt); msg("تم النسخ."); setTimeout(() => msg(""), 1200); } });
  $("#btnCopyAll").onclick = () => { navigator.clipboard.writeText(shots.map((s, i) => `لقطة ${i + 1}:\n${s.flow_prompt}`).join("\n\n")); msg("تم نسخ الكل."); setTimeout(() => msg(""), 1200); };
  $("#clips").onchange = e => { clips = [...e.target.files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); renderClips(); };
  $("#clipList").addEventListener("click", e => {
    const d = e.target.dataset, sw = (a, b) => { if (b >= 0 && b < clips.length) [clips[a], clips[b]] = [clips[b], clips[a]]; };
    if (d.up != null) sw(+d.up, +d.up - 1); if (d.dn != null) sw(+d.dn, +d.dn + 1); if (d.rm != null) clips.splice(+d.rm, 1);
    renderClips();
  });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { });
});
