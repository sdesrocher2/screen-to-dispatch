chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      window.postMessage({
        source: "screen-to-dispatch",
        type: "START_SELECTION"
      }, "*");
    }
  });
});
