const DEFAULT_EMAIL = "sara@prospectrdigital.com";

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await chrome.storage.local.get([
    "userEmail",
    "dispatchEndpoint"
  ]);

  document.getElementById("userEmail").value =
    settings.userEmail || DEFAULT_EMAIL;

  document.getElementById("dispatchEndpoint").value =
    settings.dispatchEndpoint || "";
});

document.getElementById("save").addEventListener("click", async () => {
  const userEmail = document
    .getElementById("userEmail")
    .value
    .trim();

  const dispatchEndpoint = document
    .getElementById("dispatchEndpoint")
    .value
    .trim();

  await chrome.storage.local.set({
    userEmail,
    dispatchEndpoint
  });

  const status = document.getElementById("status");

  status.textContent = "Settings saved.";

  setTimeout(() => {
    status.textContent = "";
  }, 2000);
});
