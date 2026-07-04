// Builds a Word-compatible document entirely client-side. There's no
// bundled docx library here on purpose — Manifest V3 extensions can't load
// remote code, so instead of shipping a large library we use the
// well-established "HTML wrapped in Word XML namespaces, saved with a
// .doc extension" technique. Word, Google Docs, and LibreOffice all open
// this correctly, with real headings, bold labels, tables, and monospace
// code blocks preserved.

function esc(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function noteToHtml(note) {
  const tags = (note.tags || []).join(", ");
  const companies = (note.companyTags || []).join(", ");
  const similar = (note.similarProblems || []).join(", ");
  const solvedDate = note.solvedAt ? new Date(note.solvedAt).toLocaleDateString() : "";

  const row = (label, value) =>
    value ? `<tr><td class="label">${esc(label)}</td><td>${esc(value).replace(/\n/g, "<br/>")}</td></tr>` : "";

  const codeBlock = note.code
    ? `<h3>Accepted solution${note.language ? ` &middot; ${esc(note.language)}` : ""}</h3>
       <pre class="code">${esc(note.code)}</pre>`
    : "";

  return `
    <h1>${esc(note.name || "Untitled problem")}</h1>
    <p class="meta">
      <b>Difficulty:</b> ${esc(note.difficulty || "Unknown")}
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <b>Solved:</b> ${esc(solvedDate)}
      ${note.url ? `&nbsp;&nbsp;|&nbsp;&nbsp;<b>URL:</b> ${esc(note.url)}` : ""}
    </p>
    ${tags ? `<p><b>Tags:</b> ${esc(tags)}</p>` : ""}

    <table class="fields">
      <colgroup><col style="width:30%"><col style="width:70%"></colgroup>
      ${row("1. Pattern", note.pattern)}
      ${row("2. Sub-pattern", note.subPattern)}
      ${row("3. Recognition clues", note.recognitionClues)}
      ${row("4. Core idea", note.coreIdea || note.intuition)}
      ${row("5. Invariant", note.invariant)}
      ${row("6. Real-life application", note.realWorld)}
      ${row("7. Edge cases", note.edgeCases)}
      ${row("8. Time complexity", note.timeComplexity)}
      ${row("Space complexity", note.spaceComplexity)}
      ${row("9. Mistakes I made", note.mistakes)}
      ${row("10. Similar problems", similar)}
      ${row("Data structure", note.dataStructure)}
      ${row("Algorithm", note.algorithm)}
      ${row("Company tags", companies)}
    </table>

    ${codeBlock}
    <div class="page-break"></div>
  `;
}

function wrapDocument(title, bodyHtml) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { size: 8.5in 11in; margin: 1in; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 18pt; color: #14181f; border-bottom: 2px solid #5eead4; padding-bottom: 6px; margin: 0 0 4px 0; text-align: left; }
  h3 { font-size: 12.5pt; color: #14181f; margin-top: 18px; margin-bottom: 6px; text-align: left; }
  p.meta { color: #444; font-size: 10pt; margin: 2px 0 10px 0; text-align: left; }
  table.fields { border-collapse: collapse; width: 100%; table-layout: fixed; margin-top: 12px; mso-table-layout-alt: fixed; }
  table.fields td { border: 1px solid #ccc; padding: 6px 10px; vertical-align: top; font-size: 10.5pt; text-align: left; word-wrap: break-word; }
  table.fields td.label { background: #eef7f5; font-weight: bold; width: 30%; }
  table.fields td:not(.label) { width: 70%; }
  pre.code { background: #14181f; color: #e6e9ef; padding: 12px; font-family: "Courier New", monospace; font-size: 9.5pt; white-space: pre-wrap; text-align: left; border-radius: 4px; line-height: 1.4; }
  .page-break { page-break-after: always; mso-special-character: line-break; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function triggerDownload(filename, htmlString) {
  const blob = new Blob(["\ufeff", htmlString], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportNoteToWord(note) {
  const html = wrapDocument(note.name, noteToHtml(note));
  const safeName = (note.slug || note.name || "leetcode-note").replace(/[^a-z0-9-]+/gi, "-");
  triggerDownload(`${safeName}.doc`, html);
}

function exportAllNotesToWord(notes) {
  const body = notes.map(noteToHtml).join("\n");
  const html = wrapDocument("LeetCode Pattern Notes", body);
  triggerDownload(`leetcode-pattern-notes-${Date.now()}.doc`, html);
}
