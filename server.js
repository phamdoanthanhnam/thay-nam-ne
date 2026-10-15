// Thầy Nam Nè – backend nhỏ, không phụ thuộc thư viện ngoài (Node 18+)
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 8787;
const GEMINI = process.env.GEMINI_API_KEY, OPENAI = process.env.OPENAI_API_KEY;
const GEMINI_MODELS = [...new Set([process.env.GEMINI_MODEL || 'gemini-flash-latest', ...(process.env.GEMINI_FALLBACK || 'gemini-2.5-flash,gemini-flash-lite-latest').split(',')].map(x=>x.trim()).filter(Boolean))];
const AI_TIMEOUT = +process.env.AI_TIMEOUT_MS || 25000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MODE = GEMINI ? 'gemini' : OPENAI ? 'openai' : 'demo';
const PUB = path.join(__dirname, 'public');
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.mp4':'video/mp4', '.json':'application/json', '.webmanifest':'application/manifest+json', '.vtt':'text/vtt' };

const GENRES = { ke:'Kể chuyện', ta:'Tả (đồ vật, con vật, cây cối, người)', camnghi:'Nêu cảm nghĩ / tình cảm', thu:'Viết thư / tin nhắn', tudo:'Câu văn tự do' };
function splitSentences(t){ return (t.trim().match(/[^.!?…]+[.!?…]*/g)||[]).map(s=>s.trim()).filter(s=>/[\p{L}\p{N}]/u.test(s)); }
function countWords(t){ return (t.trim().match(/[\p{L}\p{N}]+/gu)||[]).length; }
// Đếm câu "theo ý bé": nếu bé không dùng dấu chấm thì dùng số câu AI trả về có kiểm tra chữ
function check(orig, fixed, expectSentences){
  const s2 = splitSentences(fixed).length, w1 = countWords(orig), w2 = countWords(fixed);
  const okS = expectSentences ? s2 === expectSentences : true;
  const add = w2 - w1, maxAdd = Math.max(3, Math.ceil(w1 * 0.25));
  const okW = w1 === 0 ? true : (add >= -Math.ceil(w1 * 0.1) && add <= maxAdd);
  return { ok: okS && okW, okS, s2, w1, w2 };
}
function prompt(text, genre, grade, strictNote){
  return `Bạn là thầy giáo tiểu học Việt Nam đang giúp học sinh lớp ${grade} sửa bài viết. Thể loại: ${GENRES[genre]||GENRES.tudo}.
QUY TẮC BẮT BUỘC:
1. Giữ ĐÚNG số câu ý của bé (nếu bé viết liền không chấm câu thì tách theo từng ý bé viết, không gộp, không thêm câu mới).
2. DÙNG LẠI TỪ CỦA BÉ, giữ ý của bé. ĐƯỢC thêm vài chữ (khoảng 1–3 từ mỗi câu, TỔNG số chữ thêm không quá 20% số chữ của bé) để câu hay hơn, giàu hình ảnh hơn, phù hợp học sinh lớp 3: ví dụ thêm từ chỉ màu sắc, âm thanh, cảm xúc, từ so sánh, từ láy (lá xanh mướt, chim hót líu lo, ve kêu râm ran, vui ơi là vui, tròn như quả cam...). Chữ thêm phải tự nhiên, đúng nghĩa, đúng ngữ pháp tiếng Việt (không viết "thật rất", không ghép từ thừa). KHÔNG xóa hay đổi chữ đúng của bé (bé viết "rất" thì giữ "rất"). Không thay bằng từ hoa mỹ khó hiểu, không viết lại câu, KHÔNG thêm câu mới.
3. Giữ nguyên cách xưng hô trong bài của bé (bé viết "em" thì giữ "em", KHÔNG đổi thành "con").
4. Sửa chính tả, viết hoa đầu câu và tên riêng, dấu câu (chấm, phẩy, chấm than, chấm hỏi) cho đúng.
5. Câu đã đúng vẫn có thể thêm 1–2 từ cho hay hơn, nhưng giữ nguyên các chữ của bé.
${strictNote||''}
Trả về CHỈ JSON: {"sentenceCount": số câu, "fixed": "đoạn đã sửa", "weaknesses": [{"title":"tên lỗi ngắn","detail":"giải thích dễ hiểu cho bé, có ví dụ từ bài"}], "praise": "một lời khen cụ thể, ấm áp"}. Tối đa 4 điểm yếu. Riêng trong weaknesses và praise (không phải trong "fixed") thì thầy gọi bé là "con", giọng thầy hiền.
BÀI CỦA BÉ:
"""${text}"""`;
}
async function callAI(p, image){
  if (MODE === 'gemini'){
    const parts = [{ text: p }]; if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.data } });
    let lastErr;
    for (const model of GEMINI_MODELS){ // hết lượt miễn phí / quá tải thì thử model dự phòng
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI}`, { method:'POST', signal: AbortSignal.timeout(AI_TIMEOUT), headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contents:[{parts}], generationConfig:{ temperature:0.3, responseMimeType: image ? 'text/plain' : 'application/json' } }) });
      const j = await r.json();
      if (r.ok) return j.candidates?.[0]?.content?.parts?.map(x=>x.text).join('') || '';
      lastErr = new Error(r.status===429 ? 'Hôm nay thầy sửa nhiều bài quá rồi, con thử lại sau nhé.' : (j.error?.message || 'Gemini lỗi'));
      if (![429,500,503,404].includes(r.status)) break;
    }
    throw lastErr;
  }
  const content = image ? [{type:'text',text:p},{type:'image_url',image_url:{url:`data:${image.mime};base64,${image.data}`}}] : p;
  const r = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', signal: AbortSignal.timeout(AI_TIMEOUT), headers:{'Content-Type':'application/json', Authorization:`Bearer ${OPENAI}`}, body: JSON.stringify({ model: OPENAI_MODEL, temperature:0.2, messages:[{role:'user',content}], ...(image?{}:{response_format:{type:'json_object'}}) }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || 'OpenAI lỗi');
  return j.choices[0].message.content;
}
function parseJSON(s){ const m = s.match(/\{[\s\S]*\}/); return JSON.parse(m ? m[0] : s); }

// ---- Chế độ thử: sửa cơ bản bằng luật, KHÔNG phải AI ----
function demoFix(text){
  let t = text.replace(/\s+/g,' ').trim().replace(/\s+([,.!?;:…])/g,'$1').replace(/([,.!?;:])(?=[^\s\d.!?…])/g,'$1 ');
  const sents = splitSentences(t).map(s=>{ s = s.charAt(0).toLocaleUpperCase('vi') + s.slice(1); if(!/[.!?…]$/.test(s)) s += '.'; return s; });
  const fixed = sents.join(' '); const weak = [];
  if (splitSentences(text).some(s=>!/^[\p{Lu}\d"“]/u.test(s.trim()))) weak.push({title:'Viết hoa đầu câu', detail:'Chữ cái đầu mỗi câu con nhớ viết hoa nhé.'});
  if (!/[.!?…]\s*$/.test(text.trim())) weak.push({title:'Thiếu dấu kết câu', detail:'Cuối mỗi câu con cần có dấu chấm (.), chấm hỏi (?) hoặc chấm than (!).'});
  if (/\s[,.!?]/.test(text)) weak.push({title:'Khoảng trắng trước dấu câu', detail:'Dấu câu viết sát chữ phía trước, sau dấu câu mới cách một khoảng.'});
  sents.forEach(s=>{ if (countWords(s) > 25) weak.push({title:'Câu hơi dài', detail:`Câu “${s.slice(0,40)}…” khá dài, con thử tách thành hai câu.`}); });
  return { fixed, weaknesses: weak.slice(0,4), praise: 'Con đã tự viết được bài của mình, thầy khen con! (Chế độ thử chỉ sửa viết hoa, dấu câu, khoảng trắng – chưa có AI.)' };
}

async function fix(text, genre, grade){
  const origCount = splitSentences(text).length;
  if (MODE === 'demo'){ const d = demoFix(text); return { ...d, mode:'demo', ...stats(text, d.fixed), retried:false }; }
  let out = parseJSON(await callAI(prompt(text, genre, grade))); let retried = false;
  const exp = /[.!?…]/.test(text) ? origCount : (out.sentenceCount||null);
  let c = check(text, out.fixed||'', exp);
  if (!c.ok){ retried = true;
    const note = `LẦN TRƯỚC BẠN SAI: bài sửa có ${c.s2} câu và ${c.w2} chữ, trong khi bài gốc ${exp?`có ${exp} câu và `:''}${c.w1} chữ. Bắt buộc đúng số câu gốc; chỉ được thêm tối đa ${Math.max(3,Math.ceil(c.w1*0.2))} chữ so với bài gốc.`;
    try { const o2 = parseJSON(await callAI(prompt(text, genre, grade, note))); const c2 = check(text, o2.fixed||'', exp); if (c2.ok || (!c.okS && c2.okS) || (c2.okS === c.okS && Math.abs(c2.w2-c2.w1) < Math.abs(c.w2-c.w1))) out = o2; } catch(e){}
  }
  return { fixed: out.fixed, weaknesses: (out.weaknesses||[]).slice(0,4), praise: out.praise||'', mode: MODE, retried, ...stats(text, out.fixed, exp) };
}
function stats(a, b, exp){ return { sentencesIn: exp || splitSentences(a).length, sentencesOut: splitSentences(b).length, wordsIn: countWords(a), wordsOut: countWords(b) }; }

async function ocr(image){
  if (MODE === 'demo') return { mode:'demo', text:null };
  const t = await callAI('Đây là ảnh bài viết tay hoặc in của học sinh tiểu học Việt Nam. Hãy chép lại CHÍNH XÁC từng chữ bằng tiếng Việt có dấu, giữ nguyên lỗi chính tả và dấu câu của bé (không sửa). Chỉ trả về văn bản, không giải thích.', image);
  return { mode: MODE, text: t.trim() };
}

function body(req){ if (req.body !== undefined) return Promise.resolve(typeof req.body==='string' ? JSON.parse(req.body||'{}') : (req.body||{})); return new Promise((res,rej)=>{ let d=''; req.on('data',c=>{ d+=c; if(d.length>8e6){ req.destroy(); rej(new Error('quá lớn')); } }); req.on('end',()=>{ try{ res(JSON.parse(d||'{}')); }catch(e){ rej(e); } }); }); }
function send(res, code, obj){ res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(obj)); }

const HITS = new Map(); // giới hạn 10 lượt AI / phút / IP
function limited(req){ const ip=(req.headers['cf-connecting-ip']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim(); const now=Date.now();
  const a=(HITS.get(ip)||[]).filter(t=>now-t<60000); if(a.length>=10){ HITS.set(ip,a); return true; } a.push(now); HITS.set(ip,a); return false; }
async function handle(req,res){
  try {
    if (req.method==='POST' && req.url.startsWith('/api/') && limited(req)) return send(res,429,{error:'Con bấm nhanh quá! Nghỉ 1 phút rồi thử lại nhé.'});
    if (req.url === '/api/health') return send(res,200,{ok:true, mode:MODE});
    if (req.method==='POST' && req.url==='/api/fix'){ const b = await body(req); const text=(b.text||'');
      if (text.length>1500) return send(res,400,{error:'Bài dài quá (tối đa 1500 ký tự). Con gửi từng đoạn nhé.'});
      if (!countWords(text)) return send(res,400,{error:'Con chưa viết gì cả.'});
      return send(res,200, await fix(text, b.genre, b.grade||3)); }
    if (req.method==='POST' && req.url==='/api/ocr'){ const b = await body(req); return send(res,200, await ocr({mime:b.mime||'image/jpeg', data:b.data})); }
    let p = decodeURIComponent(req.url.split('?')[0]); if (p==='/') p='/index.html';
    const f = path.normalize(path.join(PUB, p)); if (!f.startsWith(PUB)) return send(res,403,{});
    fs.stat(f,(e,st)=>{ if(e||!st.isFile()) return send(res,404,{error:'không thấy'});
      const range = req.headers.range, type = TYPES[path.extname(f)]||'application/octet-stream';
      if (range){ const [s,e2]=range.replace('bytes=','').split('-'); const start=+s, end=e2?+e2:st.size-1;
        res.writeHead(206,{'Content-Type':type,'Content-Range':`bytes ${start}-${end}/${st.size}`,'Accept-Ranges':'bytes','Content-Length':end-start+1}); return fs.createReadStream(f,{start,end}).pipe(res); }
      res.writeHead(200,{'Content-Type':type,'Content-Length':st.size,'Accept-Ranges':'bytes'}); fs.createReadStream(f).pipe(res); });
  } catch(e){ const msg = (e.name==='TimeoutError'||e.name==='AbortError') ? 'Máy sửa bài đang chậm, con thử lại sau ít phút nhé.' : 'Có lỗi: '+e.message; send(res, e.name==='TimeoutError'?504:500, {error:msg}); }
}
module.exports = { handle };
if (require.main === module) http.createServer(handle).listen(PORT, ()=>console.log(`Thầy Nam Nè chạy tại http://localhost:${PORT} – chế độ: ${MODE}`));
