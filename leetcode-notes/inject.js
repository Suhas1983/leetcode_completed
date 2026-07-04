// Runs in the page's MAIN world so it can see LeetCode's own fetch calls.
// LeetCode polls an endpoint like /submissions/detail/<id>/check/ after you
// hit "Submit". When that poll comes back with state "SUCCESS" and
// status_msg "Accepted", we tell the isolated content script about it.

(function () {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

      if (url.includes("/submissions/detail/") && url.includes("/check/")) {
        console.log("[LC Notes] saw a submission-check request:", url);
        const clone = response.clone();
        clone
          .json()
          .then((data) => {
            console.log("[LC Notes] submission-check response:", data);
            if (data && data.state === "SUCCESS" && data.status_msg === "Accepted") {
              console.log("[LC Notes] Accepted! posting message to content script");
              window.postMessage(
                { source: "leetcode-notes-ext", type: "ACCEPTED_SUBMISSION", payload: data },
                "*"
              );
            }
          })
          .catch((e) => console.log("[LC Notes] failed to parse check response as JSON:", e));
      }
    } catch (e) {
      // Never let our instrumentation break the page's own fetch.
    }

    return response;
  };
})();
