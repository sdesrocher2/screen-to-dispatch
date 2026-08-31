const DEFAULT_EMAIL = "sara@prospectrdigital.com";
const DEFAULT_ENDPOINT = "";

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get([
    "userEmail",
    "dispatchEndpoint"
  ]);

  const updates = {};

  if (!settings.userEmail) {
    updates.userEmail = DEFAULT_EMAIL;
  }

  if (!settings.dispatchEndpoint) {
    updates.dispatchEndpoint = DEFAULT_ENDPOINT;
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
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

  const endpoint = settings.dispatchEndpoint;

  if (!endpoint) {
    throw new Error(
      "No Dispatch email endpoint has been configured. Open extension settings and add the endpoint."
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...payload,
      submitted_by: settings.userEmail || DEFAULT_EMAIL,
      timestamp: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Email service returned ${response.status}: ${responseText}`
    );
  }

  return {
    success: true
  };
}
