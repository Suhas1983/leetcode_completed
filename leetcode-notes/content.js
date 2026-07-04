// Isolated world. Receives the "Accepted" signal from inject.js (page world),
// scrapes what it can from the DOM, and asks the background worker to open
// the side panel pre-filled with this problem's info.

function slugFromUrl(url) {
  const match = url.match(/\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

function getDifficulty() {
  // LeetCode marks difficulty with one of these classes/text on the problem page.
  const candidates = Array.from(document.querySelectorAll("div, span"));
  for (const el of candidates) {
    const text = el.textContent?.trim();
    if (text === "Easy" || text === "Medium" || text === "Hard") {
      // Guard against matching huge containers by checking it's a small leaf-ish node.
      if (el.children.length <= 1) return text;
    }
  }
  return "Unknown";
}

function getTags() {
  // Tags usually live behind a "Topics" expandable section on the description tab.
  const tagEls = document.querySelectorAll("a[href^='/tag/']");
  const tags = new Set();
  tagEls.forEach((el) => {
    const t = el.textContent?.trim();
    if (t) tags.add(t);
  });
  return Array.from(tags);
}

function getProblemName() {
  const titleEl = document.querySelector("[data-cy='question-title'], .css-v3d350, a[href^='/problems/']");
  if (titleEl && titleEl.textContent) return titleEl.textContent.trim();
  return document.title.replace(" - LeetCode", "").trim();
}

function getAcceptedCode() {
  // LeetCode's editor is Monaco. Each visual row of code is a ".view-line" div.
  // This is a best-effort scrape of what's on screen, not the raw source, so
  // it can occasionally miss horizontal-scrolled characters on very long lines.
  const lines = Array.from(document.querySelectorAll(".view-line"));
  if (lines.length === 0) return "";
  return lines.map((line) => line.textContent).join("\n");
}

function getLanguage() {
  const langBtn = document.querySelector("[id^='headlessui-listbox-button'], button.rounded.items-center");
  const text = langBtn?.textContent?.trim();
  return text || "";
}

function collectProblemData() {
  const url = window.location.href.split("?")[0];
  return {
    slug: slugFromUrl(url),
    name: getProblemName(),
    difficulty: getDifficulty(),
    tags: getTags(),
    url,
    solvedAt: new Date().toISOString(),
    code: getAcceptedCode(),
    language: getLanguage(),
  };
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.source !== "leetcode-notes-ext" || msg.type !== "ACCEPTED_SUBMISSION") return;

  console.log("[LC Notes] content script received ACCEPTED_SUBMISSION, scraping DOM...");

  // Give the DOM a beat to settle (title/tags panel can lag the API response slightly).
  setTimeout(() => {
    const problemData = collectProblemData();
    console.log("[LC Notes] sending PROBLEM_ACCEPTED to background:", problemData);
    chrome.runtime.sendMessage({ type: "PROBLEM_ACCEPTED", problemData }, () => {
      if (chrome.runtime.lastError) {
        console.log("[LC Notes] sendMessage error:", chrome.runtime.lastError.message);
      } else {
        console.log("[LC Notes] background acknowledged");
      }
    });
  }, 400);
});
