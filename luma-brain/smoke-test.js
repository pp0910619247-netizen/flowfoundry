/* Smoke test: รันสมอง LUMA ใน Node (โหมด RAM) — ตรวจว่าเรียนรู้/จำ/นอนได้จริง */
"use strict";
const { LUMACore, tokenize, diceSim } = require("./brain.js");

function check(name, ok, extra) {
  console.log((ok ? "PASS" : "FAIL") + " — " + name + (extra ? " (" + extra + ")" : ""));
  if (!ok) process.exitCode = 1;
}

const core = new LUMACore(); // ไม่มี localStorage ใน Node → ใช้ RAM

// 1) tokenizer ตัดคำไทยได้
const toks = tokenize("ฉันชอบกาแฟดริปที่บ้าน");
check("tokenize ไทย", toks.includes("ฉัน") && toks.includes("กาแฟ") && toks.includes("บ้าน"), toks.join(" | "));

// 2) เรียนรู้สองเหตุการณ์
const r1 = core.handle("ฉันชอบ กาแฟ ดริป ที่บ้าน ทุกเช้า");
console.log("[ตอบ 1] " + r1.messages[0]);
const r2 = core.handle("ฉันหิว ข้าว ผัดกะเพรา มาก เดี๋ยวต้องไปซื้อ");
console.log("[ตอบ 2] " + r2.messages[0]);
check("เรียนรู้มโนทัศน์", core.graph.has("กาแฟ") && core.graph.has("ข้าว"), core.graph.nodes.size + " nodes");

// 3) ความเชื่อม Hebbian เกิดขึ้นจริง
check("เส้นเชื่อมเกิดขึ้น", core.graph.edges.size > 0, core.graph.edges.size + " edges");

// 4) ค้นคืนความจำเชิงเหตุการณ์
const rec = core.epi.recall("ตื่นเช้ามา อยาก กาแฟ ดริป เลย", 3);
check("ค้นคืนความจำได้", rec.length > 0 && rec[0].sim > 0.2, rec.length ? "sim=" + rec[0].sim.toFixed(2) : "ไม่พบ");

// 5) ถามกลับว่าจำอะไรได้บ้าง
const r3 = core.handle("เธอจำอะไรได้บ้าง");
console.log("[ตอบ 3] " + r3.messages[0].split("\n")[0] + " ...");

// 6) นอนจัดระเบียบ (มีเหตุการณ์เก่าพอจะสรุปหรือไม่ก็ต้องไม่ crash)
const rep = core.sleepCycle.run();
console.log("[นอน] " + rep);
check("sleep cycle ทำงาน", typeof rep === "string" && rep.length > 0);

// 6.5) ความจำต้องรอดข้ามการ "ปิดเครื่อง" (บันทึก → สร้างสมองใหม่จาก storage เดิม)
core.stats.exchanges = 99;
core.save(true);
const core2 = new LUMACore(core.storage);
check(
  "ความจำรอดข้ามการปิดเครื่อง",
  core2.graph.has("กาแฟ") && core2.stats.exchanges === 99,
  "exchanges=" + core2.stats.exchanges + ", nodes=" + core2.graph.nodes.size
);

// 7) ลบความจำ
core.wipe(true);
check("ลบความจำ", core.graph.nodes.size === 0 && core.epi.items.length === 0);

console.log(process.exitCode ? "\n*** มีข้อผิดพลาด ***" : "\nสมอง LUMA ทำงานครบทุกส่วน ✔");
