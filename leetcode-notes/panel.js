const els = {
  problemName: document.getElementById("problemName"),
  difficultyBadge: document.getElementById("difficultyBadge"),
  tagRow: document.getElementById("tagRow"),
  problemUrl: document.getElementById("problemUrl"),
  manualBtn: document.getElementById("manualBtn"),
  noteForm: document.getElementById("noteForm"),
  saveStatus: document.getElementById("saveStatus"),
  saveAndWordBtn: document.getElementById("saveAndWordBtn"),
  codeToggle: document.getElementById("codeToggle"),
  codePreview: document.getElementById("codePreview"),
  exportAllBtn: document.getElementById("exportAllBtn"),
  viewAllBtn: document.getElementById("viewAllBtn"),
  backBtn: document.getElementById("backBtn"),
  formView: document.getElementById("formView"),
  listView: document.getElementById("listView"),
  notesList: document.getElementById("notesList"),
  searchInput: document.getElementById("searchInput"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  saveApiKeyBtn: document.getElementById("saveApiKeyBtn"),
  clearApiKeyBtn: document.getElementById("clearApiKeyBtn"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  apiKeyStatus: document.getElementById("apiKeyStatus"),
  fillAiBtn: document.getElementById("fillAiBtn"),
  aiStatus: document.getElementById("aiStatus"),
};

let currentProblem = null;

// ---- API key settings ----

function getStoredApiKey() {
  // config.js (loaded before this file) can define a permanent key. If it's
  // set to a real value, use it -- otherwise fall back to whatever's saved
  // via the settings panel, so the UI still works if config.js is left blank.
  if (typeof GEMINI_API_KEY !== "undefined" && GEMINI_API_KEY && GEMINI_API_KEY !== "PASTE_YOUR_KEY_HERE") {
    return Promise.resolve(GEMINI_API_KEY);
  }
  return new Promise((resolve) => {
    chrome.storage.local.get("geminiApiKey", (data) => resolve(data.geminiApiKey || ""));
  });
}

els.settingsBtn.addEventListener("click", async () => {
  const key = await getStoredApiKey();
  const fromConfig = typeof GEMINI_API_KEY !== "undefined" && GEMINI_API_KEY && GEMINI_API_KEY !== "PASTE_YOUR_KEY_HERE";
  els.apiKeyInput.value = key;
  if (fromConfig) {
    els.apiKeyInput.disabled = true;
    els.apiKeyStatus.textContent = "Using the permanent key set in config.js.";
  } else {
    els.apiKeyInput.disabled = false;
    els.apiKeyStatus.textContent = key ? "A key is currently saved." : "";
  }
  els.settingsPanel.classList.remove("hidden");
});

els.closeSettingsBtn.addEventListener("click", () => {
  els.settingsPanel.classList.add("hidden");
});

els.saveApiKeyBtn.addEventListener("click", () => {
  const key = els.apiKeyInput.value.trim();
  if (!key) {
    els.apiKeyStatus.textContent = "Enter a key first.";
    return;
  }
  chrome.storage.local.set({ geminiApiKey: key }, () => {
    els.apiKeyStatus.textContent = "Saved ✓";
  });
});

els.clearApiKeyBtn.addEventListener("click", () => {
  chrome.storage.local.remove("geminiApiKey", () => {
    els.apiKeyInput.value = "";
    els.apiKeyStatus.textContent = "Key cleared.";
  });
});

function renderProblemCard(problem) {
  els.problemName.textContent = problem?.name || "No problem loaded yet";
  els.difficultyBadge.textContent = problem?.difficulty || "—";
  els.difficultyBadge.dataset.level = problem?.difficulty || "";

  els.tagRow.innerHTML = "";
  (problem?.tags || []).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tag;
    els.tagRow.appendChild(span);
  });

  if (problem?.url) {
    els.problemUrl.href = problem.url;
    els.problemUrl.textContent = problem.url;
    els.problemUrl.classList.remove("hidden");
  } else {
    els.problemUrl.classList.add("hidden");
  }

  if (problem?.code) {
    els.codeToggle.classList.remove("hidden");
    els.codePreview.textContent = problem.code;
    els.codePreview.classList.add("hidden");
    els.codeToggle.textContent = "Show captured code";
  } else {
    els.codeToggle.classList.add("hidden");
    els.codePreview.classList.add("hidden");
  }
}

els.codeToggle.addEventListener("click", () => {
  const isHidden = els.codePreview.classList.toggle("hidden");
  els.codeToggle.textContent = isHidden ? "Show captured code" : "Hide captured code";
});

function loadPendingProblem() {
  chrome.storage.local.get("pendingProblem", (data) => {
    if (data.pendingProblem) {
      currentProblem = data.pendingProblem;
      renderProblemCard(currentProblem);
      els.noteForm.classList.remove("hidden");
      els.manualBtn.classList.add("hidden");
    }
  });
}

// Listen for a fresh Accepted event while the panel is already open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pendingProblem) {
    currentProblem = changes.pendingProblem.newValue;
    if (currentProblem) {
      renderProblemCard(currentProblem);
      els.noteForm.reset();
      els.noteForm.classList.remove("hidden");
      els.manualBtn.classList.add("hidden");
      els.saveStatus.textContent = "";
      els.aiStatus.textContent = "";
    }
  }
});

els.manualBtn.addEventListener("click", () => {
  currentProblem = currentProblem || {
    slug: `manual-${Date.now()}`,
    name: "Untitled problem",
    difficulty: "Unknown",
    tags: [],
    url: "",
    solvedAt: new Date().toISOString(),
  };
  renderProblemCard(currentProblem);
  els.noteForm.classList.remove("hidden");
  els.manualBtn.classList.add("hidden");
});

function splitCommaList(value) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildNoteFromForm() {
  return {
    id: `${currentProblem.slug}-${Date.now()}`,
    slug: currentProblem.slug,
    name: currentProblem.name,
    difficulty: currentProblem.difficulty,
    tags: currentProblem.tags,
    url: currentProblem.url,
    solvedAt: currentProblem.solvedAt,
    code: currentProblem.code || "",
    language: currentProblem.language || "",
    pattern: document.getElementById("pattern").value.trim(),
    subPattern: document.getElementById("subPattern").value.trim(),
    recognitionClues: document.getElementById("recognitionClues").value.trim(),
    coreIdea: document.getElementById("coreIdea").value.trim(),
    invariant: document.getElementById("invariant").value.trim(),
    realWorld: document.getElementById("realWorld").value.trim(),
    edgeCases: document.getElementById("edgeCases").value.trim(),
    timeComplexity: document.getElementById("timeComplexity").value.trim(),
    spaceComplexity: document.getElementById("spaceComplexity").value.trim(),
    mistakes: document.getElementById("mistakes").value.trim(),
    similarProblems: splitCommaList(document.getElementById("similarProblems").value),
    dataStructure: document.getElementById("dataStructure").value.trim(),
    algorithm: document.getElementById("algorithm").value.trim(),
    companyTags: splitCommaList(document.getElementById("companyTags").value),
  };
}

function persistNoteAndReset(note, statusText) {
  chrome.storage.local.get({ notes: [] }, (data) => {
    const notes = data.notes;
    notes.unshift(note);
    chrome.storage.local.set({ notes, pendingProblem: null }, () => {
      els.saveStatus.textContent = statusText;
      setTimeout(() => {
        els.noteForm.reset();
        els.noteForm.classList.add("hidden");
        els.manualBtn.classList.remove("hidden");
        els.saveStatus.textContent = "";
        els.aiStatus.textContent = "";
        currentProblem = null;
        renderProblemCard(null);
      }, 900);
    });
  });
}

// ---- Fill with AI ----

const AI_FIELD_IDS = [
  "pattern",
  "subPattern",
  "recognitionClues",
  "coreIdea",
  "invariant",
  "realWorld",
  "edgeCases",
  "timeComplexity",
  "spaceComplexity",
  "mistakes",
  "similarProblems",
  "dataStructure",
  "algorithm",
];

function buildAiPrompt(problem) {
  const codeBlock = problem.code
    ? `Accepted solution (${problem.language || "unknown language"}):\n${problem.code}`
    : "No captured code is available.";

  return [
    `Problem: ${problem.name || "Unknown"}`,
    `Difficulty: ${problem.difficulty || "Unknown"}`,
    `LeetCode tags: ${(problem.tags || []).join(", ") || "none"}`,
    "",
    codeBlock,
    "",
    "Based on this, fill out a LeetCode pattern-recognition study note. Respond with ONLY a raw JSON object (no markdown fences, no commentary) with exactly these string keys: pattern, subPattern, recognitionClues, coreIdea, invariant, realWorld, edgeCases, timeComplexity, spaceComplexity, mistakes, dataStructure, algorithm. Also include \"similarProblems\" as a comma-separated string of 2-4 related LeetCode problem names or numbers. Keep each value concise (1-3 sentences, or a short phrase for pattern/subPattern/complexity/dataStructure/algorithm). If you're not confident about a field, make your best reasonable guess rather than leaving it empty.",
  ].join("\n");
}

function parseAiJson(text) {
  // Model may still wrap the JSON in a code fence despite instructions; strip it defensively.
  let cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  // Fallback: if there's still leading/trailing prose around the object
  // (e.g. "Here's the note: {...}"), pull out just the {...} span.
  if (!cleaned.startsWith("{")) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }
  return JSON.parse(cleaned);
}

// Passing this as responseSchema (with responseMimeType: "application/json")
// puts Gemini into strict JSON mode -- it can no longer wrap the answer in
// markdown, add commentary, or use its own key names. This is what actually
// fixes "is not valid JSON" errors; the prompt wording alone is only a hint,
// not a guarantee.
const AI_RESPONSE_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(AI_FIELD_IDS.map((id) => [id, { type: "string" }])),
  required: AI_FIELD_IDS,
};

// "gemini-flash-latest" is Google's own maintained alias -- it always points
// at their current-generation Flash model, so this doesn't need updating
// every time Google ships a new version (which is what broke gemini-1.5-pro).
const GEMINI_MODEL = "gemini-flash-latest";

async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        // Newer Gemini Flash models "think" by default, and those thinking
        // tokens are drawn from the SAME maxOutputTokens budget as the
        // actual answer -- with thinking left on, the model can burn the
        // whole budget reasoning and leave nothing for the real JSON,
        // which is what caused "Unexpected end of JSON input" (a
        // truncated response). This is a plain extraction task, so
        // thinking isn't needed; turn it off and give generous headroom.
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: AI_RESPONSE_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const message = errBody?.error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();

  // A response can come back with no candidates at all if the prompt was
  // blocked by safety filters -- surface that clearly instead of a generic
  // "cannot read properties of undefined" a few lines below.
  if (!data.candidates || data.candidates.length === 0) {
    const blockReason = data.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Blocked by Gemini (${blockReason})` : "No candidates in API response");
  }

  const text = data.candidates[0]?.content?.parts?.map((p) => p.text || "").join("");

  if (!text) {
    const finishReason = data.candidates[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      throw new Error("Response cut off (hit token limit) -- try again");
    }
    throw new Error("No text in API response");
  }
  return parseAiJson(text);
}

els.fillAiBtn.addEventListener("click", async () => {
  if (!currentProblem) return;

  const apiKey = await getStoredApiKey();
  if (!apiKey) {
    els.aiStatus.textContent = "Set your API key first (top right) →";
    els.settingsPanel.classList.remove("hidden");
    return;
  }

  els.fillAiBtn.disabled = true;
  els.fillAiBtn.textContent = "Thinking...";
  els.aiStatus.textContent = "";

  try {
    const prompt = buildAiPrompt(currentProblem);
    const result = await callGemini(apiKey, prompt);

    AI_FIELD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      // Only fill fields the user hasn't already typed into, so this never
      // clobbers notes you've already started writing.
      if (el && !el.value.trim() && result[id] !== undefined) {
        el.value = String(result[id]).trim();
      }
    });
    if (!document.getElementById("similarProblems").value.trim() && result.similarProblems) {
      document.getElementById("similarProblems").value = String(result.similarProblems).trim();
    }

    els.aiStatus.textContent = "Filled by AI ✓ — review before saving";
  } catch (err) {
    console.log("[LC Notes] AI fill failed:", err.message);
    els.aiStatus.textContent = `AI fill failed: ${err.message}`;
  } finally {
    els.fillAiBtn.disabled = false;
    els.fillAiBtn.textContent = "✨ Fill with AI";
  }
});

els.noteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentProblem) return;
  persistNoteAndReset(buildNoteFromForm(), "Saved ✓");
});

els.saveAndWordBtn.addEventListener("click", () => {
  if (!currentProblem) return;
  const note = buildNoteFromForm();
  exportNoteToWord(note);
  persistNoteAndReset(note, "Saved + Word doc downloaded ✓");
});

// ---- List / search view ----

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function noteMatches(note, query) {
  if (!query) return true;
  const haystack = [
    note.name,
    note.pattern,
    note.subPattern,
    note.dataStructure,
    note.algorithm,
    note.difficulty,
    ...(note.tags || []),
    ...(note.companyTags || []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function renderNotesList(notes, query) {
  const filtered = notes.filter((n) => noteMatches(n, query));
  els.notesList.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = notes.length === 0
      ? "No notes yet. Solve a problem on LeetCode to get started."
      : "No notes match your search.";
    els.notesList.appendChild(empty);
    return;
  }

  filtered.forEach((note) => {
    const item = document.createElement("div");
    item.className = "note-item";

    const row = document.createElement("div");
    row.className = "note-item__row";
    row.innerHTML = `<h3>${escapeHtml(note.name)}</h3><span class="badge" data-level="${note.difficulty}">${note.difficulty}</span>`;
    item.appendChild(row);

    const meta = document.createElement("div");
    meta.className = "note-item__meta";
    const metaBits = [[note.pattern, note.subPattern].filter(Boolean).join(" › "), formatDate(note.solvedAt)].filter(Boolean);
    meta.textContent = metaBits.join(" · ");
    item.appendChild(meta);

    const detail = document.createElement("div");
    detail.className = "note-item__detail hidden";
    const coreIdea = note.coreIdea || note.intuition; // fallback for notes saved before this field was renamed
    detail.innerHTML = `
      ${note.recognitionClues ? `<div><b>Recognition clues:</b> ${escapeHtml(note.recognitionClues)}</div>` : ""}
      ${coreIdea ? `<div><b>Core idea:</b> ${escapeHtml(coreIdea)}</div>` : ""}
      ${note.invariant ? `<div><b>Invariant:</b> ${escapeHtml(note.invariant)}</div>` : ""}
      ${note.realWorld ? `<div><b>Real-life application:</b> ${escapeHtml(note.realWorld)}</div>` : ""}
      ${note.edgeCases ? `<div><b>Edge cases:</b> ${escapeHtml(note.edgeCases)}</div>` : ""}
      ${(note.timeComplexity || note.spaceComplexity) ? `<div><b>Complexity:</b> ${escapeHtml(note.timeComplexity)} time / ${escapeHtml(note.spaceComplexity)} space</div>` : ""}
      ${note.mistakes ? `<div><b>Mistakes I made:</b> ${escapeHtml(note.mistakes)}</div>` : ""}
      ${note.similarProblems?.length ? `<div><b>Similar problems:</b> ${note.similarProblems.map(escapeHtml).join(", ")}</div>` : ""}
      ${note.dataStructure ? `<div><b>Data structure:</b> ${escapeHtml(note.dataStructure)}</div>` : ""}
      ${note.algorithm ? `<div><b>Algorithm:</b> ${escapeHtml(note.algorithm)}</div>` : ""}
      ${note.companyTags?.length ? `<div><b>Companies:</b> ${note.companyTags.map(escapeHtml).join(", ")}</div>` : ""}
      ${note.url ? `<div><a href="${note.url}" target="_blank" rel="noopener" style="color:var(--mint)">Open problem →</a></div>` : ""}
    `;

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "link-btn note-item__export";
    exportBtn.textContent = "Export to Word";
    exportBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      exportNoteToWord(note);
    });
    detail.appendChild(exportBtn);

    item.appendChild(detail);

    item.addEventListener("click", () => detail.classList.toggle("hidden"));
    els.notesList.appendChild(item);
  });
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showListView() {
  els.formView.classList.add("hidden");
  els.listView.classList.remove("hidden");
  chrome.storage.local.get({ notes: [] }, (data) => {
    renderNotesList(data.notes, els.searchInput.value);
  });
}

function showFormView() {
  els.listView.classList.add("hidden");
  els.formView.classList.remove("hidden");
}

els.exportAllBtn.addEventListener("click", () => {
  chrome.storage.local.get({ notes: [] }, (data) => {
    if (data.notes.length === 0) return;
    exportAllNotesToWord(data.notes);
  });
});

els.viewAllBtn.addEventListener("click", showListView);
els.backBtn.addEventListener("click", showFormView);
els.searchInput.addEventListener("input", () => {
  chrome.storage.local.get({ notes: [] }, (data) => {
    renderNotesList(data.notes, els.searchInput.value);
  });
});

loadPendingProblem();
renderProblemCard(null);
