// Tiny CSV helpers (quoted fields supported). Lines starting with # are comments.
function parseLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
function parse(text) {
  const lines = text.split(/\r?\n/);
  const comments = lines.filter((l) => l.startsWith("#"));
  const body = lines.filter((l) => l.trim() && !l.startsWith("#"));
  const header = parseLine(body[0] || "");
  const rows = body.slice(1).map((l) => { const v = parseLine(l); const o = {}; header.forEach((h, i) => { o[h] = v[i]; }); return o; });
  return { header, rows, comments };
}
const esc = (v) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function stringify(header, rows, comments = []) {
  return comments.map((c) => "# " + c).concat([header.join(",")], rows.map((r) => header.map((h) => esc(r[h])).join(","))).join("\n") + "\n";
}
module.exports = { parse, stringify };
