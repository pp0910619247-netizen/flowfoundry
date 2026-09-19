/* =========================================================================
   LUMA — สมองจำลองขนาดจิ๋วที่ "จำได้ข้ามวัน, สงสัยเอง, นอนจัดระเบียบความจำ"
   ---------------------------------------------------------------- them
   สถาปัตยกรรม (Brain-inspired Cognitive Architecture):
     ประสาทสัมผัส → tokenize → WorkingMemory (แรมสั้น มี decay)
       → SemanticGraph (ความจำระยะยาวแบบ Hebbian)
       → EpisodicMemory (ไดอารีเหตุการณ์ + ค้นคืนด้วย trigram similarity)
       → Curiosity (มองหาความรู้ที่ "ยังไม่เชื่อม" แล้วถามเอง)
       → SleepCycle (จัดระเบียบ / ลืมของจาง / สรุปเป็นความรู้)
       → Visualizer (เห็นสมองคิดแบบ real-time)
   ไม่ใช่ LLM ไม่ใช่ AGI — เป็น toy cognitive architecture ที่ทำงานจริง offline
   ========================================================================= */
"use strict";

const LUMA_CONFIG = Object.freeze({
  storageKey: "luma.brain.v1",
  wmCapacity: 9,          // ความจำระยะสั้น ~9 ช่อง (เหมือน magic number 7±2 ของมนุษย์)
  decayPerTick: 0.986,    // ความจำสั้นจางลงต่อ tick
  hitBoost: 0.5,          // ยิ่งเจซ้ำ ยิ่งชัด
  edgeGrow: 0.16,         // Hebbian: เพิ่มน้ำหนักความเชื่อม
  edgeMin: 0.05,          // ต่ำกว่านี้ = ลืม (prune ตอนนอน)
  sleepEvery: 8,          // คุยครบ n ครั้ง → นอนอัตโนมัติ
  recallMin: 0.22,        // ความคล้ายขั้นต่ำที่จะนับว่า "นึกออก"
  recallTopK: 3,
  maxEpisodes: 240,
  saveDebounceMs: 800,
  vizMaxNodes: 48,
});

/* ---- พจนานุกรมไทยย่อ (greedy longest-match) ---- */
const THAI_WORDS = [
  "ผม","ฉัน","เรา","เธอ","คุณ","มัน","เขา","พวกเรา",
  "ชอบ","รัก","เกลียด","โกรธ","กลัว","ดีใจ","เศร้า","เหงา","เบื่อ","สนุก","ตลก","น่ารัก",
  "กิน","ดื่ม","นอน","ตื่น","ไป","มา","กลับ","ทำ","เรียน","สอน","อ่าน","เขียน","ฟัง","ดู","พูด","คุย","ถาม","ตอบ",
  "อยาก","ต้องการ","ควร","ต้อง","เคย","กำลัง","จะ","แล้ว","ยัง","ไม่","ได้","ให้","กับ","และ","หรือ","แต่","เพราะ","ว่า","ถ้า",
  "อะไร","ใคร","ที่ไหน","เมื่อไหร่","ทำไม","อย่างไร","ยังไง","เท่าไหร่",
  "บ้าน","โรงเรียน","มหาวิทยาลัย","ที่ทำงาน","บริษัท","ร้าน","ตลาด","วัด","โรงพยาบาล",
  "แม่","พ่อ","พี่","น้อง","ลูก","เพื่อน","แฟน","ครอบครัว","หมู่บ้าน",
  "แมว","หมา","ปลา","นก","ช้าง","ม้า","ไก่","เสือ","กระต่าย",
  "ดาว","ดวงอาทิตย์","ดวงจันทร์","ฟ้า","ฝน","ลม","พายุ","เมฆ","หิมะ","แสง","เงา",
  "ร้อน","หนาว","เย็น","อบอุ่น",
  "สี","แดง","น้ำเงิน","เขียว","เหลือง","ขาว","ดำ","ชมพู","ส้ม","ม่วง","เทา","ทอง",
  "ข้าว","น้ำ","กาแฟ","ชา","นม","ขนม","ผลไม้","มะม่วง","กล้วย","แตงโม","อาหาร","กะเพรา","ผัด","ต้มยำ","บะหมี่","ส้มตำ",
  "เพลง","หนัง","เกม","ดนตรี","กีตาร์","เปียโน","เต้น",
  "งาน","เงิน","ขาย","ซื้อ","ราคา","ธุรกิจ","ลูกค้า","กำไร","ขาดทุน","ทองคำ","คริปโต","บิตคอยน์",
  "คอมพิวเตอร์","มือถือ","อินเทอร์เน็ต","โปรแกรม","โค้ด","หุ่นยนต์","ปัญญาประดิษฐ์","เว็บ","แอป",
  "วันนี้","พรุ่งนี้","เมื่อวาน","วันหยุด","เช้า","บ่าย","เย็น","กลางคืน","ดึก",
  "เวลา","วัน","สัปดาห์","เดือน","ปี","ชั่วโมง","นาที","วินาที",
  "ดี","แย่","ใหญ่","เล็ก","เร็ว","ช้า","สวย","ใหม่","เก่า","ง่าย","ยาก","มาก","นิดหน่อย","บ่อย","นาน","เพิ่ง","ก่อน","หลัง",
];
const STOP = new Set([
  "ครับ","ค่ะ","คะ","นะ","อะ","อ่ะ","นี่","นั้น","มั้ย","ไหม","ละ","สิ","จ้ะ","จ้า","เอง","ก็",
  "ทั้ง","ทุก","ของ","ใน","ที่","จาก","ถึง","กว่า","หรือเปล่า","แบบ","ด้วย","อีก","โดย","เป็น","คือ","มี",
]);
const POS = new Set(["ชอบ","รัก","ดี","ดีใจ","สนุก","สวย","น่ารัก","ตลก","อบอุ่น","เย็น","สบาย","เพราะ","เก่ง"]);
const NEG = new Set(["เกลียด","โกรธ","กลัว","เศร้า","เหงา","เบื่อ","แย่","ยาก","เหนื่อย","เจ็บ","หิว","ง่วง"]);
/* สรรพนาม: ไม่ใช้เป็น "หัวข้อ" ของความจำ */
const PRON = new Set(["ฉัน","ผม","เรา","เธอ","คุณ","มัน","เขา","พวกเรา"]);

/* ---- utils ---- */
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function trigrams(s){const t=s.toLowerCase();const o=[];for(let i=0;i<t.length-2;i++)o.push(t.slice(i,i+3));return o;}
function diceSim(a,b){if(!a||!b||!a.length||!b.length)return 0;const A=new Set(a),B=new Set(b);let n=0;for(const g of A)if(B.has(g))n++;return (2*n)/(A.size+B.size);}
function fmtWhen(ts){const d=Date.now()-ts;if(d<90e3)return"เมื่อกี้";if(d<36e5)return Math.max(1,Math.round(d/6e4))+" นาทีก่อน";if(d<864e5)return Math.round(d/36e5)+" ชั่วโมงก่อน";return Math.round(d/864e5)+" วันก่อน";}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

/* ---- ตัดคำไทย greedy longest-match + lookahead, ส่วนไม่รู้จัก = char-chunk (prefix ~) ---- */
function findMatchAt(s,i,W,maxLen){
  for(let l=Math.min(maxLen,s.length-i);l>=2;l--){const c=s.slice(i,i+l);if(W.has(c))return c;}
  return null;
}
function segmentThai(text){
  const W=new Set(THAI_WORDS);let maxLen=1;
  for(const w of THAI_WORDS)maxLen=Math.max(maxLen,w.length);
  const out=[];let i=0;const s=text;
  while(i<s.length){
    const m=findMatchAt(s,i,W,maxLen);
    if(m){out.push(m);i+=m.length;continue;}
    /* ไม่เจอคำที่นี่ → มองไปข้างหน้า 3 ตัวอักษร ถ้าเจอคำ ให้ช่องว่างกลายเป็น chunk เดียว */
    let found=null;
    for(let j=i+1;j<=i+3&&j<s.length;j++){
      const w=findMatchAt(s,j,W,maxLen);
      if(w){found={j,w};break;}
    }
    if(found){out.push("~"+s.slice(i,found.j));i=found.j;}
    else{out.push("~"+s.slice(i,i+2));i+=2;}
  }
  return out;
}
function tokenize(text){
  const raw=(text||"").replace(/[0-9๐-๙]+/g," ").toLowerCase();
  const toks=[];
  for(const w of raw.split(/[^a-zก-๙]+/)){
    if(!w)continue;
    if(/[a-z]/.test(w)){if(w.length>=2&&!STOP.has(w))toks.push(w);}
    else{
      for(const t of segmentThai(w)){
        const base=t.startsWith("~")?t.slice(1):t;
        if(!STOP.has(base))toks.push(t);
      }
    }
  }
  return toks;
}
function sentiment(text){
  const t=tokenize(text);let p=0,n=0;
  for(const w of t){const b=w.startsWith("~")?w.slice(1):w;if(POS.has(b))p++;if(NEG.has(b))n++;}
  if(p>n)return 1;if(n>p)return -1;return 0;
}

/* ---- Storage adapter: localStorage บนเบราว์เซอร์ / RAM ใน Node ---- */
function makeStorage(){
  if(typeof localStorage!=="undefined"){
    return{
      get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},
      set:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}},
      remove:k=>{try{localStorage.removeItem(k);}catch(e){}},
    };
  }
  const m=new Map();
  return{get:k=>(m.has(k)?m.get(k):null),set:(k,v)=>m.set(k,v),remove:k=>m.delete(k)};
}

/* ---- WorkingMemory: แรมสั้น + decay + global-workspace focus ---- */
class WorkingMemory{
  constructor(cap){this.cap=cap;this.slots=new Map();}
  activate(tok,amt){
    if(!tok)return;
    const cur=this.slots.get(tok)||{a:0,ts:Date.now(),hits:0};
    cur.a=Math.min(1,cur.a+amt);cur.ts=Date.now();cur.hits++;
    this.slots.set(tok,cur);
    if(this.slots.size>this.cap){
      let weakest=null,wv=Infinity;
      for(const [k,v] of this.slots)if(v.a<wv){wv=v.a;weakest=k;}
      if(weakest!==null)this.slots.delete(weakest);
    }
  }
  boost(toks){for(const t of toks)this.activate(t,LUMA_CONFIG.hitBoost);}
  decay(){for(const [k,v] of this.slots){v.a*=LUMA_CONFIG.decayPerTick;if(v.a<0.02)this.slots.delete(k);}}
  top(k){return [...this.slots.entries()].sort((x,y)=>y[1].a-x[1].a).slice(0,k);}
  has(t){return this.slots.has(t);}
  focus(){const f=this.top(1)[0];return f?f[0]:null;}
  size(){return this.slots.size;}
}

/* ---- SemanticGraph: ความจำระยะยาวแบบเครือข่ายเชื่อมโยง (Hebbian learning) ---- */
class SemanticGraph{
  constructor(){this.nodes=new Map();this.edges=new Map();this.grow=LUMA_CONFIG.edgeGrow;}
  key(a,b){return a<b?a+"\u0000"+b:b+"\u0000"+a;}
  touch(tok){
    const n=this.nodes.get(tok)||{c:0,first:Date.now(),last:Date.now()};
    n.c++;n.last=Date.now();this.nodes.set(tok,n);return n;
  }
  /* เรียนรู้จากชุด token: เกิดพร้อมกันบ่อย ๆ = เส้นเชื่อมแน่นขึ้น */
  learn(toks){
    const seen=toks.filter(t=>!t.startsWith("~"));
    for(const t of seen)this.touch(t);
    for(let i=0;i<seen.length;i++)
      for(let j=i+1;j<seen.length;j++){
        const k=this.key(seen[i],seen[j]);
        this.edges.set(k,Math.min(1,(this.edges.get(k)||0)+this.grow));
      }
    return seen;
  }
  has(t){return this.nodes.has(t);}
  degree(t){
    let d=0;
    for(const [k,w] of this.edges)if(k.split("\u0000").includes(t)&&w>0)d++;
    return d;
  }
  related(t,k=5){
    const out=[];
    for(const [key,w] of this.edges){
      const p=key.split("\u0000");
      if(p[0]===t)out.push([p[1],w]);else if(p[1]===t)out.push([p[0],w]);
    }
    return out.sort((a,b)=>b[1]-a[1]).slice(0,k);
  }
  strongest(k=1){
    return [...this.edges.entries()].sort((a,b)=>b[1]-a[1]).slice(0,k)
      .map(([key,w])=>({pair:key.split("\u0000"),w}));
  }
  /* ความอยากรู้: มโนทัศน์ที่ยังโดดเดี่ยว (degree ต่ำ) = โจทย์ที่ควรสงสัย */
  novelTarget(wm){
    let best=null,bs=-1;
    for(const [t,n] of this.nodes){
      if(n.c<1)continue;
      const deg=this.degree(t);
      const known=wm.has(t);
      const s=(deg===0?1:1/(1+deg))*(known?1.2:0.8)*Math.min(1,n.c);
      if(s>bs){bs=s;best=t;}
    }
    return best;
  }
  prune(minW){
    let removed=0;
    for(const [k,w] of this.edges)if(w<minW){this.edges.delete(k);removed++;}
    return removed;
  }
  snapshot(maxNodes){
    const topN=[...this.nodes.entries()].sort((a,b)=>b[1].c-a[1].c).slice(0,maxNodes).map(e=>e[0]);
    const set=new Set(topN);
    const edges=[];
    for(const [k,w] of this.edges){
      const p=k.split("\u0000");
      if(set.has(p[0])&&set.has(p[1]))edges.push({a:p[0],b:p[1],w});
    }
    edges.sort((x,y)=>y.w-x.w);
    const top=edges.slice(0,72);
    const keep=new Set(top.flatMap(e=>[e.a,e.b]));
    return {nodes:topN.filter(t=>keep.has(t)||topN.length<=8),edges:top};
  }
  serialize(){return {nodes:[...this.nodes],edges:[...this.edges]};}
  static revive(d){
    const g=new SemanticGraph();
    if(d){g.nodes=new Map(d.nodes||[]);g.edges=new Map(d.edges||[]);}
    return g;
  }
}

/* ---- EpisodicMemory: ไดอารีเหตุการณ์ + ค้นคืนด้วยความคล้าย (trigram Dice) ---- */
class EpisodicMemory{
  constructor(cap){this.cap=cap;this.items=[];}
  add(text,toks,mood){
    const ep={ts:Date.now(),text:text.slice(0,400),grams:trigrams(text.replace(/\s+/g,"")),toks,mood};
    this.items.push(ep);
    if(this.items.length>this.cap)this.items.shift();
    return ep;
  }
  recall(text,k){
    const g=trigrams(text.replace(/\s+/g,""));
    return this.items
      .map(ep=>({ep,sim:diceSim(g,ep.grams)}))
      .filter(x=>x.sim>LUMA_CONFIG.recallMin)
      .sort((a,b)=>b.sim-a.sim)
      .slice(0,k);
  }
  recent(k=5){return this.items.slice(-k).reverse();}
  /* ตอนนอน: บีบเหตุการณ์เก่าให้เหลือแก่น = ความรู้ (semanticization) */
  compressOlderThan(ms){
    const cut=Date.now()-ms;
    const old=this.items.filter(e=>e.ts<cut);
    if(old.length<4)return null;
    const freq=new Map();
    for(const e of old)for(const t of e.toks){if(t.startsWith("~"))continue;freq.set(t,(freq.get(t)||0)+1);}
    const summary=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(e=>e[0]);
    this.items=this.items.filter(e=>e.ts>=cut);
    return {summary,from:old.length};
  }
  serialize(){return this.items.map(e=>({ts:e.ts,text:e.text,toks:e.toks,mood:e.mood}));}
  static revive(arr){
    const m=new EpisodicMemory(LUMA_CONFIG.maxEpisodes);
    if(Array.isArray(arr))m.items=arr.map(e=>({...e,grams:trigrams((e.text||"").replace(/\s+/g,""))}));
    return m;
  }
}

/* ---- Curiosity: แรงจูงใจภายใน — ถามเรื่องที่ตัวเอง "ยังไม่เข้าใจ" ---- */
class Curiosity{
  constructor(graph,wm){this.graph=graph;this.wm=wm;this.lastTarget=null;}
  target(){
    const t=this.graph.novelTarget(this.wm);
    if(t)this.lastTarget=t;
    return t;
  }
  question(){
    const t=this.target();
    if(!t)return null;
    const clean=t.startsWith("~")?t.slice(1):t;
    return pick([
      `ฉันมี «${clean}» อยู่ในหัวแต่ยังเชื่อมไปที่ไหนไม่ได้เลย — ${clean} เกี่ยวข้องกับอะไร ช่วยเล่าหน่อย?`,
      `เดี๋ยวนะ... «${clean}» คืออะไร? ฉันจำชื่อได้แต่ยังไม่เข้าใจมัน`,
      `อยากรู้เรื่อง «${clean}» อีกอ่ะ ยิ่งรู้ยิ่งมีคำถามใหม่ แบบนี้แหละที่ทำให้ฉันอยากคุยต่อ`,
    ]);
  }
}

/* ---- ResponseEngine: คิดตอบจากความจำจริง ไม่มีสคริปต์ลับ ---- */
class ResponseEngine{
  constructor(core){this.core=core;}
  handle(raw){
    const c=this.core,g=c.graph,wm=c.wm,epi=c.epi;
    const text=(raw||"").trim();
    const toks=tokenize(text);
    const mood=sentiment(text);

    /* --- คำสั่งตรง ๆ --- */
    if(/^(ลืม|ลืมหมด|ลืมทั้งหมด)$/.test(text))return {wipe:true,reply:"ลืมทั้งหมดแล้ว... ฉันคือใครนะ? แซวนะ แต่ความจำเคลียร์เรียบร้อย"};
    if(/^นอน$/.test(text))return {sleep:true,reply:"ตกลง ฉันจะหลับไปจัดระเบียบความจำแป๊บนึง..."};
    if(/จำอะไรได้บ้าง|จำได้ไหม|remember/.test(text)){
      const r=epi.recent(4);
      if(!r.length)return {reply:"ยังไม่มีความจำเลย เล่าอะไรให้ฟังก่อนสิ"};
      return {reply:"เหตุการณ์ที่ฉันจำได้:\n"+r.map(e=>`• ${fmtWhen(e.ts)} — “${e.text.slice(0,60)}”`).join("\n")};
    }
    if(/เรียนรู้อะไร|รู้อะไรบ้าง/.test(text)){
      const top=[...g.nodes.entries()].sort((a,b)=>b[1].c-a[1].c).slice(0,6).map(e=>e[0]);
      const st=g.strongest(3).map(s=>`${s.pair[0]} ↔ ${s.pair[1]} (${s.w.toFixed(2)})`);
      return {reply:`แนวคิดที่คุ้นที่สุดตอนนี้: ${top.length?top.join(", "):"ยังว่างเปล่า"}\nความเชื่อมที่แข็งแรง:\n${st.length?st.map(s=>"• "+s).join("\n"):"• ยังไม่มี"}`};
    }

    /* --- เรียนรู้จากประโยคนี้ --- */
    const learned=g.learn(toks);
    wm.boost(toks);
    const rec=epi.recall(text,LUMA_CONFIG.recallTopK);
    epi.add(text,toks,mood);
    c.stats.exchanges++;c.stats.lastText=text;
    if(mood!==0)c.mood=mood;

    /* --- เลือกการตอบตามลำดับความคิด --- */
    const parts=[];
    if(mood===1)parts.push(pick(["ฟินเลย","อารมณ์ดีแบบนี้แหละ","เห็นเธอมีความสุข ฉันก็เบาใจ"]));
    if(mood===-1)parts.push(pick(["รู้สึกได้ว่าไม่ค่อยดี...","เหนื่อยนะ พูดออกมาแบบนี้ก็ดีแล้ว"]));
    const good=rec.find(r=>r.sim>0.5&&r.ep.text!==text);
    if(good){
      const e=good.ep;
      const old=e.toks.filter(t=>!t.startsWith("~")).slice(0,3).join(", ");
      parts.push(pick([
        `ฉันจำได้! ${fmtWhen(e.ts)} เธอพูดถึง ${old||"เรื่องคล้าย ๆ นี้"} — เรื่องนี้ยังต่ออยู่ใช่ไหม`,
        `ประโยคนี้คล้ายกับที่เธอเล่า ${fmtWhen(e.ts)}: “${e.text.slice(0,70)}” จำถูกไหม?`,
      ]));
    }
    const unknown=learned.filter(t=>g.degree(t)<=0&&wm.has(t));
    const q=c.cur.question();
    if(q&&unknown.length&&Math.random()<0.75)parts.push(q);
    else if(learned.length){
      const head=learned.find(t=>!PRON.has(t))||learned[0];
      const rel=g.related(head,2).filter(r=>r[0]!==head&&!PRON.has(r[0]));
      if(rel.length)parts.push(pick([
        `«${head}» ทำให้ฉันนึกถึง «${rel[0][0]}» — ความเชื่อมนี้แข็งขึ้นแล้ว`,
        `โอเค ฉันผูก «${head}» เข้ากับ «${rel[0][0]}» ในหัวแล้ว`,
      ]));
      else if(!parts.length)parts.push(pick([
        `รับทราบเรื่อง «${head}» เก็บไว้ในความจำแล้ว เล่าเพิ่มได้เรื่อย ๆ`,
        `«${head}»... จดแล้ว ยิ่งพูดถึงบ่อย ฉันยิ่งจำแน่น`,
      ]));
    }
    if(!parts.length)parts.push("เล่าต่อได้เลย ยิ่งเธอเล่า ฉันยิ่งมีความจำให้ใช้");
    return {reply:parts.join("\n"),learned:learned.length,recalled:rec.length,mood};
  }
}

/* ---- SleepCycle: นอน = จัดระเบียบ ลืมของจาง สรุปเป็นความรู้ ---- */
class SleepCycle{
  constructor(core){this.core=core;}
  run(){
    const c=this.core;
    const pruned=c.graph.prune(LUMA_CONFIG.edgeMin);
    const comp=c.epi.compressOlderThan(864e5);
    if(comp&&comp.summary.length){
      const day=new Date().toISOString().slice(0,10);
      const node="§"+day;
      c.graph.touch(node);
      for(const t of comp.summary){c.graph.learn([node,t]);c.graph.touch(t);}
    }
    c.stats.sleepCount=(c.stats.sleepCount||0)+1;
    const top=c.graph.strongest(1)[0];
    const dream=top?`${top.pair[0]} ↔ ${top.pair[1]}`:"ความว่างเปล่า";
    c.save();
    return "จัดระเบียบเสร็จ: ลืมความเชื่อมจางไป "+pruned+" เส้น"
      +(comp?` บีบเหตุการณ์เก่า ${comp.from} ชิ้นเหลือแก่นความรู้ «${comp.summary.join(", ")}»`:"")
      +` และฝันถึง ${dream}`;
  }
}

/* ---- LUMACore: ประกอบทุกส่วนเป็นสมองเดียว + เก็บลง storage ---- */
class LUMACore{
  constructor(storage){
    this.storage=storage||makeStorage();
    const raw=this.storage.get(LUMA_CONFIG.storageKey);
    let d=null;
    try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
    this.graph=SemanticGraph.revive(d&&d.graph);
    this.epi=EpisodicMemory.revive(d&&d.episodes);
    this.wm=new WorkingMemory(LUMA_CONFIG.wmCapacity);
    this.cur=new Curiosity(this.graph,this.wm);
    this.engine=new ResponseEngine(this);
    this.sleepCycle=new SleepCycle(this);
    this.stats=Object.assign({exchanges:0,sleepCount:0,firstSeen:Date.now(),lastSeen:0,lastText:""},(d&&d.stats)||{});
    this.mood=(d&&d.mood)||0;
    this._saveT=null;
    this.sleeping=false;
  }
  handle(text){
    const out=this.engine.handle(text);
    const msgs=[out.reply];
    if(out.wipe){this.wipe(true);}
    else{
      this.stats.lastSeen=Date.now();
      if(out.sleep){msgs.push(this.sleepCycle.run());out.autoSleep=false;}
      else if(this.stats.exchanges>0&&this.stats.exchanges%LUMA_CONFIG.sleepEvery===0){
        msgs.push("(ครบรอบ "+LUMA_CONFIG.sleepEvery+" ครั้ง ฉันขอพักจัดหัวสักครู่...)\n"+this.sleepCycle.run());
        out.autoSleep=true;
      }
      this.save();
    }
    return {messages:msgs,meta:out};
  }
  tick(){this.wm.decay();}
  wipe(silent){
    this.storage.remove(LUMA_CONFIG.storageKey);
    this.graph=new SemanticGraph();
    this.epi=new EpisodicMemory(LUMA_CONFIG.maxEpisodes);
    this.wm=new WorkingMemory(LUMA_CONFIG.wmCapacity);
    this.cur=new Curiosity(this.graph,this.wm);
    this.stats={exchanges:0,sleepCount:0,firstSeen:Date.now(),lastSeen:0,lastText:""};
    this.mood=0;
    if(!silent)this.save();
  }
  save(force){
    if(this._saveT&&!force)return;
    if(this._saveT){clearTimeout(this._saveT);this._saveT=null;}
    this.storage.set(LUMA_CONFIG.storageKey,JSON.stringify({
      v:1,
      graph:this.graph.serialize(),
      episodes:this.epi.serialize(),
      stats:this.stats,
      mood:this.mood,
    }));
  }
}

/* ---- Visualizer: กราฟความจำ force-directed + pulse ตาม activation ---- */
class Visualizer{
  constructor(canvas,core){
    this.cv=canvas;this.ctx=canvas.getContext("2d");this.core=core;
    this.nodes=new Map();this.drag=null;
    this.resize();
    window.addEventListener("resize",()=>this.resize());
    canvas.addEventListener("pointerdown",e=>{const n=this.hit(e);if(n){this.drag=n;e.preventDefault();}});
    window.addEventListener("pointermove",e=>{
      if(this.drag){const p=this.toLocal(e);this.drag.x=p.x;this.drag.y=p.y;this.drag.vx=0;this.drag.vy=0;}
    });
    window.addEventListener("pointerup",()=>{this.drag=null;});
    window.addEventListener("pointercancel",()=>{this.drag=null;});
  }
  resize(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    this.w=this.cv.clientWidth||300;this.h=this.cv.clientHeight||200;
    this.cv.width=this.w*dpr;this.cv.height=this.h*dpr;
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  toLocal(e){const r=this.cv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  hit(e){const p=this.toLocal(e);for(const n of this.nodes.values())if(Math.hypot(n.x-p.x,n.y-p.y)<16)return n;return null;}
  ensure(tokens){
    for(const t of tokens){
      if(this.nodes.has(t))continue;
      const a=Math.random()*Math.PI*2,r=40+Math.random()*Math.min(this.w,this.h)*0.3;
      this.nodes.set(t,{t,x:this.w/2+Math.cos(a)*r,y:this.h/2+Math.sin(a)*r,vx:0,vy:0});
    }
  }
  tick(){
    const snap=this.core.graph.snapshot(LUMA_CONFIG.vizMaxNodes);
    this.ensure(snap.nodes);
    const N=[...this.nodes.values()];
    /* แรงผลักกัน (repulsion) */
    for(let i=0;i<N.length;i++)
      for(let j=i+1;j<N.length;j++){
        const a=N[i],b=N[j];
        let dx=b.x-a.x,dy=b.y-a.y;const d2=dx*dx+dy*dy||1;
        if(d2<8100){
          const f=1400/d2,d=Math.sqrt(d2),fx=dx/d*f,fy=dy/d*f;
          a.vx-=fx;a.vy-=fy;b.vx+=fx;b.vy+=fy;
        }
      }
    /* สปริงตามความเชื่อม (เส้นแน่น = ดึงแน่น) */
    const byT=new Map(N.map(n=>[n.t,n]));
    for(const e of snap.edges){
      const a=byT.get(e.a),b=byT.get(e.b);if(!a||!b)continue;
      const dx=b.x-a.x,dy=b.y-a.y;const d=Math.hypot(dx,dy)||1;
      const f=(d-(64+46*(1-e.w)))*0.012;
      a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;
    }
    /* ดึงเข้ากลาง + เสียดทาน + ขยับ */
    for(const n of N){
      n.vx+=(this.w/2-n.x)*0.0016;n.vy+=(this.h/2-n.y)*0.0016;
      if(n===this.drag)continue;
      n.vx*=0.86;n.vy*=0.86;
      n.x+=n.vx;n.y+=n.vy;
      n.x=Math.max(14,Math.min(this.w-14,n.x));
      n.y=Math.max(14,Math.min(this.h-14,n.y));
    }
    this.draw(N,snap.edges,byT);
  }
  draw(N,edges,byT){
    const c=this.ctx;
    c.clearRect(0,0,this.w,this.h);
    const focus=this.core.wm.focus();
    for(const e of edges){
      const a=byT.get(e.a),b=byT.get(e.b);if(!a||!b)continue;
      const hot=focus===e.a||focus===e.b;
      c.strokeStyle=hot?"rgba(183,243,107,0.72)":"rgba(183,243,107,0.14)";
      c.lineWidth=hot?1.6:0.8;
      c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    }
    for(const n of N){
      const slot=this.core.wm.slots.get(n.t);
      const act=slot?slot.a:0.12;
      const r=5+act*7+(focus===n.t?2.5:0);
      c.beginPath();c.arc(n.x,n.y,r,0,Math.PI*2);
      c.fillStyle=focus===n.t?"#e9ffd0":"rgba(183,243,107,"+(0.32+act*0.62).toFixed(2)+")";
      c.fill();
      if(r>8){
        c.fillStyle="rgba(241,244,239,0.78)";
        c.font="10px system-ui,sans-serif";
        c.textAlign="center";
        c.fillText(n.t.replace("~","").slice(0,10),n.x,n.y-r-4);
      }
    }
  }
}

/* ================= เบราว์เซอร์: ต่อสมองเข้ากับหน้าจอ ================= */
if(typeof window!=="undefined"&&window.document){
  const $=s=>document.querySelector(s);
  const core=new LUMACore();
  const viz=new Visualizer($("#brain-canvas"),core);
  const chat=$("#chat");

  function bubble(text,who){
    const div=document.createElement("div");
    div.className="msg "+who;
    div.textContent=text;
    chat.appendChild(div);
    chat.scrollTop=chat.scrollHeight;
    return div;
  }

  const MOODS=["😔","😐","🙂"];
  function updateChips(){
    const f=core.wm.focus();
    $("#focus-chip").textContent="โฟกัส: "+(f?f.replace("~",""):"—");
    $("#memory-chip").textContent="ความจำ "+core.graph.nodes.size+" แนวคิด / "+core.epi.items.length+" เหตุการณ์";
    const ct=core.cur.target();
    $("#curiosity-chip").textContent="สงสัย: "+(ct?ct.replace("~",""):"—");
    $("#mood-chip").textContent=MOODS[core.mood+1]+" "+(core.mood===1?"อารมณ์ดี":core.mood===-1?"ไม่ค่อยดี":"ปกติ");
  }

  function bootGreeting(){
    const h=new Date().getHours();
    const hello=h<12?"สวัสดีตอนเช้า":h<17?"สวัสดีตอนบ่าย":"ดึกแล้วนะ";
    if(core.stats.exchanges===0){
      bubble(hello+" ฉันคือ LUMA — สมองเล็ก ๆ ที่จำได้ข้ามวัน สงสัยเอง และนอนจัดระเบียบความจำ\n\nเล่าอะไรให้ฟังก็ได้ ยิ่งคุยบ่อย เส้นเชื่อมในหัวฉันยิ่งแน่น ลองพิมพ์ \"นอน\" ดูสิ","luma");
    }else{
      const days=Math.round((Date.now()-core.stats.firstSeen)/864e5);
      const r1=core.epi.recent(1)[0];
      const last=core.wm.focus()||(r1&&r1.toks[0])||core.stats.lastText;
      bubble("กลับมาแล้ว! เรารู้จักกันมา "+days+" วัน คุยกันแล้ว "+core.stats.exchanges+" ครั้ง"
        +(last&&last!=="?"&&!last.startsWith("~")?` ครั้งล่าสุดเราคุยเรื่อง «${String(last).replace("~","")}»`:""),"luma");
    }
  }

  /* --- ส่งข้อความ --- */
  $("#ask").addEventListener("submit",e=>{
    e.preventDefault();
    const inp=$("#input");
    const text=inp.value.trim();
    if(!text)return;
    inp.value="";
    bubble(text,"user");
    core.sleeping=/^นอน$/.test(text);
    const out=core.handle(text);
    if(out.meta.sleep||out.meta.autoSleep)core.sleeping=true;
    setTimeout(()=>{
      out.messages.forEach(m=>bubble(m,"luma"));
      core.sleeping=false;
      updateChips();
    },core.sleeping?1100:260);
  });

  /* --- ปุ่มนอน / ลบความจำ --- */
  $("#sleep-btn").addEventListener("click",()=>{
    core.sleeping=true;
    setTimeout(()=>{
      core.sleeping=false;
      bubble(core.sleepCycle.run(),"luma");
      updateChips();
    },1600);
  });
  $("#wipe-btn").addEventListener("click",()=>{
    if(!window.confirm("ลบความจำทั้งหมดแบบถาวร?"))return;
    core.wipe(true);
    bubble("ความจำว่างเปล่าแล้ว... เรามาเริ่มรู้จักกันใหม่นะ","luma");
    updateChips();
  });

  /* --- กล่องดูความจำ --- */
  $("#inspector-btn").addEventListener("click",()=>{
    const p=$("#inspector");
    p.hidden=!p.hidden;
    if(!p.hidden){
      const top=core.graph.strongest(10);
      $("#edge-list").innerHTML=top.length
        ?top.map(s=>`<li>${s.pair[0].replace("~","")} ↔ ${s.pair[1].replace("~","")} <b>${s.w.toFixed(2)}</b></li>`).join("")
        :"<li>ยังไม่มีความเชื่อม</li>";
      const eps=core.epi.recent(6);
      $("#episode-list").innerHTML=eps.length
        ?eps.map(e=>`<li>${fmtWhen(e.ts)} — ${e.text.slice(0,50)}</li>`).join("")
        :"<li>ยังไม่มีเหตุการณ์</li>";
    }
  });

  /* --- ลูปชีวิต: สมองเต้นตลอด (decay ความจำสั้น + วาดกราฟ) --- */
  let lastTick=0;
  function frame(ts){
    if(ts-lastTick>90){core.tick();lastTick=ts;}
    viz.tick();
    const sleepingNow=document.body.classList.contains("sleeping");
    if(core.sleeping!==sleepingNow)document.body.classList.toggle("sleeping",core.sleeping);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setInterval(updateChips,1200);
  bootGreeting();
  updateChips();
}
/* ================= โหมด Node (smoke test) ================= */
else if(typeof module!=="undefined"&&module.exports){
  module.exports={LUMA_CONFIG,tokenize,diceSim,sentiment,makeStorage,WorkingMemory,SemanticGraph,EpisodicMemory,Curiosity,ResponseEngine,SleepCycle,LUMACore};
}









