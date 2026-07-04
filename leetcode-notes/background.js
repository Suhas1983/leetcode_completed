chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[LC Notes] background received message:", message.type, "from tab", sender.tab?.id);
  if (message.type === "PROBLEM_ACCEPTED" && sender.tab?.id) {
    const tabId = sender.tab.id;
    chrome.storage.local.set({ pendingProblem: message.problemData }, () => {
      console.log("[LC Notes] pendingProblem stored, attempting sidePanel.open()");
      // sidePanel.open() only works when called synchronously inside a real
      // user gesture (e.g. a click). We get here from a network-response
      // listener, not a click, so Chrome will usually refuse to open it —
      // that refusal throws, and left unhandled it looks like a mysterious
      // "background.js:0" error in the extension's error log.
      //
      // We still try (it occasionally succeeds, e.g. right after the user's
      // own "Submit" click hasn't fully expired), but if it fails we fall
      // back to a badge so the user can open it with one click of their own —
      // which *is* a valid gesture — and the panel will already be pre-filled
      // from pendingProblem.
      chrome.sidePanel.open({ tabId })
        .then(() => {
          console.log("[LC Notes] sidePanel.open() succeeded");
          sendResponse({ ok: true, opened: true });
        })
        .catch((err) => {
          console.log("[LC Notes] sidePanel.open() failed, falling back to badge:", err.message);
          chrome.action.setBadgeText({ tabId, text: "1" });
          chrome.action.setBadgeBackgroundColor({ tabId, color: "#5eead4" });
          sendResponse({ ok: true, opened: false });
        });
    });
    // Keep the message channel open until the async storage/sidePanel work
    // above calls sendResponse — without this, Chrome closes the port
    // immediately and the sender sees "message port closed before a
    // response was received."
    return true;
  }
});

// Clicking the toolbar icon opens the side panel too, without a pending problem.
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.action.setBadgeText({ tabId: tab.id, text: "" });
  chrome.sidePanel.open({ tabId: tab.id }).catch((err) => {
    console.error("LeetCode Notes: failed to open side panel", err);
  });
});
