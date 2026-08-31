chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get([
    "userEmail",
    "dispatchEndpoint"
  ]);

  const updates = {};

  if (!settings.userEmail) {
    updates.userEmail = "sara@prospectrdigital.com";
  }

  if (!settings.dispatchEndpoint) {
    updates.dispatchEndpoint = "";
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
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
  if (message.type !== "SEND_EDIT_REQUEST") {
    return;
  }

  handleEditRequest(message.payload)
    .then((result) => sendResponse(result))
    .catch((error) => {
      console.error("Failed to send edit request:", error);

      sendResponse({
        success: false,
        error: error.message
      });
    });

  return true;
});

async function handleEditRequest(payload) {
  const settings = await chrome.storage.local.get([
    "userEmail",
    "dispatchEndpoint"
  ]);

  if (!settings.dispatchEndpoint) {
    return {
      success: false,
      error: "Email delivery is not configured yet."
    };
  }

  const response = await fetch(settings.dispatchEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...payload,
      submitted_by:
        settings.userEmail || "sara@prospectrdigital.com",
      timestamp: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(
      `Email service returned ${response.status}`
    );
  }

  return {
    success: true
  };
}
