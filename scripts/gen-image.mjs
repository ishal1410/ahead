// Generate one image with Gemini (free-tier key). Prompt is logged to assets/PROVENANCE.md by the caller.
// Run: node scripts/gen-image.mjs <out.png> "<prompt>" [model]
import "./env.mjs";
import { writeFileSync } from "node:fs";
const [out, prompt, model = "gemini-3.1-flash-image"] = process.argv.slice(2);
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: "POST",
  headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
});
const j = await r.json();
const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
if (!part) { console.log(r.status, JSON.stringify(j).slice(0, 500)); process.exit(1); }
writeFileSync(out, Buffer.from(part.inlineData.data, "base64"));
console.log(r.status, model, "->", out);
