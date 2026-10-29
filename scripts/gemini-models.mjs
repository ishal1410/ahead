import "./env.mjs";
const k = process.env.GEMINI_API_KEY;
if (!k) { console.log("no GEMINI_API_KEY"); process.exit(1); }
const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": k } });
const j = await r.json();
console.log(r.status, (j.models ?? []).map((m) => m.name).filter((n) => /image|imagen/i.test(n)).join("\n") || JSON.stringify(j).slice(0, 300));
