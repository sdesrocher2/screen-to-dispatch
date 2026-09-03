const DEFAULT_EMAIL = "sara@prospectrdigital.com";

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get(["userEmail"]);

  if (!settings.userEmail) {
    await chrome.storage.local.set({
      userEmail: DEFAULT_EMAIL
    });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    await chrome.tabs.sendMessage(tab.id, {
      type: "START_SELECTION"
    });
  } catch (error) {
    console.error("Could not start selection mode:", error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SETTINGS") {
    chrome.storage.local.get(["userEmail"]).then((settings) => {
      sendResponse({
        userEmail: settings.userEmail || DEFAULT_EMAIL
      });
    });

    return true;
  }

  if (message.type === "GET_SUBMITTER") {
    chrome.storage.local.get(["userEmail"]).then((settings) => {
      sendResponse({
        userEmail: settings.userEmail || DEFAULT_EMAIL
      });
    });

    return true;
  }
});
