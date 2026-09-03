let selectionMode = false;
let hoveredElement = null;
let selectionNotice = null;

const STYLE_ID = "screen-to-dispatch-styles";
const ROOT_ID = "screen-to-dispatch-root";

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_SELECTION") {
    startSelectionMode();
  }
});

function startSelectionMode() {
  if (selectionMode) {
    stopSelectionMode();
    return;
  }

  selectionMode = true;

  injectStyles();

  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("click", handleElementClick, true);
  document.addEventListener("keydown", handleKeyDown, true);

  showSelectionNotice();
}

function stopSelectionMode() {
  selectionMode = false;

  document.removeEventListener("mouseover", handleMouseOver, true);
  document.removeEventListener("mouseout", handleMouseOut, true);
  document.removeEventListener("click", handleElementClick, true);
  document.removeEventListener("keydown", handleKeyDown, true);

  clearHover();

  if (selectionNotice) {
    selectionNotice.remove();
    selectionNotice = null;
  }
}

function handleMouseOver(event) {
  if (!selectionMode) return;

  const element = getSelectableElement(event.target);

  if (!element || isExtensionElement(element)) return;

  clearHover();

  hoveredElement = element;
  hoveredElement.classList.add("std-hover-highlight");
}

function handleMouseOut(event) {
  if (!selectionMode || !hoveredElement) return;

  if (!hoveredElement.contains(event.relatedTarget)) {
    clearHover();
  }
}

function handleElementClick(event) {
  if (!selectionMode) return;

  const element = getSelectableElement(event.target);

  if (!element || isExtensionElement(element)) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  stopSelectionMode();

  showEditPopup(element);
}

function handleKeyDown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    stopSelectionMode();
  }
}

function getSelectableElement(target) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target;
}

function isExtensionElement(element) {
  return Boolean(element.closest(`#${ROOT_ID}`));
}

function clearHover() {
  if (hoveredElement) {
    hoveredElement.classList.remove("std-hover-highlight");
    hoveredElement = null;
  }

  document.querySelectorAll(".std-hover-highlight").forEach((element) => {
    element.classList.remove("std-hover-highlight");
  });
}

function showSelectionNotice() {
  if (selectionNotice) {
    selectionNotice.remove();
  }

  selectionNotice = document.createElement("div");
  selectionNotice.id = "screen-to-dispatch-selection-notice";

  selectionNotice.innerHTML = `
    <div class="std-notice">
      <strong>Screen-to-Dispatch</strong>
      <span>Click an element to select it · Press ESC to cancel</span>
    </div>
  `;

  document.body.appendChild(selectionNotice);
}

function showEditPopup(element) {
  const existing = document.getElementById(ROOT_ID);

  if (existing) {
    existing.remove();
  }

  injectStyles();

  const root = document.createElement("div");
  root.id = ROOT_ID;

  const tag = element.tagName.toUpperCase();
  const currentContent = getCurrentContent(element);

  root.innerHTML = `
    <div class="std-modal-backdrop">
      <div class="std-modal" role="dialog" aria-modal="true">

        <div class="std-header">
          <div>
            <div class="std-title">Screen-to-Dispatch</div>
            <div class="std-subtitle">Site edit request</div>
          </div>

          <button type="button" class="std-close" id="std-close">×</button>
        </div>

        <div class="std-field">
          <label>Element</label>
          <div class="std-element-type">${escapeHtml(tag)}</div>
        </div>

        <div class="std-field">
          <label>Current content</label>
          <div class="std-current-content">
            ${escapeHtml(truncate(currentContent, 300))}
          </div>
        </div>

        <div class="std-field">
          <label for="std-edit-request">
            What should say / what should change?
          </label>

          <textarea
            id="std-edit-request"
            rows="4"
            placeholder="Change this to..."
          ></textarea>
        </div>

        <div class="std-field">
          <label for="std-context">
            Context / reason <span>(optional)</span>
          </label>

          <textarea
            id="std-context"
            rows="3"
            placeholder="Why is this change needed?"
          ></textarea>
        </div>

        <div class="std-error" id="std-error"></div>

        <div class="std-actions">
          <button type="button" class="std-copy" id="std-copy">
            Copy JSON
          </button>

          <button type="button" class="std-send" id="std-send">
            Prepare Request
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(root);

  document
    .getElementById("std-close")
    .addEventListener("click", () => {
      root.remove();
    });

  document
    .getElementById("std-copy")
    .addEventListener("click", () => {
      copyPayload(element);
    });

  document
    .getElementById("std-send")
    .addEventListener("click", () => {
      prepareRequest(element, root);
    });

  document.getElementById("std-edit-request").focus();
}

async function getPayload(element) {
  const editRequest = document
    .getElementById("std-edit-request")
    ?.value
    .trim() || "";

  const context = document
    .getElementById("std-context")
    ?.value
    .trim() || "";

  const settings = await chrome.runtime.sendMessage({
    type: "GET_SUBMITTER"
  });

  return {
    type: "site_edit_request",

    url: window.location.href,

    element: {
      tag: element.tagName.toUpperCase(),
      text_current: getCurrentContent(element),
      xpath: getXPath(element),
      css_selector: getCssSelector(element)
    },

    edit_request: editRequest,

    context: context,

    submitted_by:
      settings?.userEmail || "sara@prospectrdigital.com",

    timestamp: new Date().toISOString()
  };
}

async function copyPayload(element) {
  const errorElement = document.getElementById("std-error");

  const editRequest = document
    .getElementById("std-edit-request")
    ?.value
    .trim();

  if (!editRequest) {
    errorElement.textContent = "Please describe the requested change.";
    return;
  }

  try {
    const payload = await getPayload(element);

    await navigator.clipboard.writeText(
      JSON.stringify(payload, null, 2)
    );

    errorElement.style.color = "#16a34a";
    errorElement.textContent = "JSON copied to clipboard.";

    setTimeout(() => {
      errorElement.textContent = "";
      errorElement.style.color = "";
    }, 2000);

  } catch (error) {
    errorElement.style.color = "#dc2626";
    errorElement.textContent =
      "Could not copy the request.";
  }
}

async function prepareRequest(element, root) {
  const errorElement = document.getElementById("std-error");
  const sendButton = document.getElementById("std-send");

  const editRequest = document
    .getElementById("std-edit-request")
    .value
    .trim();

  if (!editRequest) {
    errorElement.textContent = "Please describe the requested change.";
    return;
  }

  sendButton.disabled = true;
  sendButton.textContent = "Preparing...";

  try {
    const payload = await getPayload(element);

    console.log(
      "Screen-to-Dispatch payload:",
      payload
    );

    root.innerHTML = `
      <div class="std-modal-backdrop">
        <div class="std-modal std-success-modal">

          <div class="std-success-icon">✓</div>

          <div class="std-title">Request Ready</div>

          <div class="std-success-message">
            The structured request has been prepared for Dispatch.
          </div>

          <button type="button" class="std-send" id="std-copy-final">
            Copy JSON
          </button>

          <button type="button" class="std-secondary" id="std-done">
            Done
          </button>

        </div>
      </div>
    `;

    document
      .getElementById("std-copy-final")
      .addEventListener("click", async () => {
        await navigator.clipboard.writeText(
          JSON.stringify(payload, null, 2)
        );

        document.getElementById("std-copy-final").textContent =
          "Copied ✓";
      });

    document
      .getElementById("std-done")
      .addEventListener("click", () => {
        root.remove();
      });

  } catch (error) {
    sendButton.disabled = false;
    sendButton.textContent = "Prepare Request";

    errorElement.textContent =
      error.message || "Could not prepare request.";
  }
}

function getCurrentContent(element) {
  if (element.tagName === "IMG") {
    return element.getAttribute("alt") || "";
  }

  return (element.innerText || element.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + "…";
}

function getXPath(element) {
  if (element.id) {
    return `//*[@id="${escapeXPathValue(element.id)}"]`;
  }

  const parts = [];
  let current = element;

  while (
    current &&
    current.nodeType === Node.ELEMENT_NODE
  ) {
    let index = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }

      sibling = sibling.previousElementSibling;
    }

    parts.unshift(
      `${current.tagName.toLowerCase()}[${index}]`
    );

    current = current.parentElement;
  }

  return "/" + parts.join("/");
}

function escapeXPathValue(value) {
  return value.replace(/"/g, "");
}

function getCssSelector(element) {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const parts = [];
  let current = element;

  while (
    current &&
    current.nodeType === Node.ELEMENT_NODE &&
    current !== document.body
  ) {
    let selector = current.tagName.toLowerCase();

    const classes = Array.from(current.classList)
      .filter((className) => !className.startsWith("std-"))
      .slice(0, 2);

    if (classes.length > 0) {
      selector += classes
        .map((className) => `.${CSS.escape(className)}`)
        .join("");
    }

    const parent = current.parentElement;

    if (parent) {
      const sameTagSiblings = Array.from(parent.children)
        .filter(
          (child) => child.tagName === current.tagName
        );

      if (sameTagSiblings.length > 1) {
        const index =
          sameTagSiblings.indexOf(current) + 1;

        selector += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(selector);
    current = parent;
  }

  return parts.join(" > ");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;

  style.textContent = `
    .std-hover-highlight {
      outline: 3px solid #4f46e5 !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }

    #screen-to-dispatch-selection-notice {
      position: fixed !important;
      top: 16px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      z-index: 2147483647 !important;
      font-family: Arial, sans-serif !important;
    }

    .std-notice {
      display: flex !important;
      gap: 12px !important;
      align-items: center !important;
      padding: 10px 16px !important;
      background: #111827 !important;
      color: white !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,.2) !important;
      font-size: 13px !important;
    }

    .std-notice span {
      opacity: .8 !important;
    }

    #screen-to-dispatch-root {
      all: initial !important;
      font-family: Arial, sans-serif !important;
    }

    #screen-to-dispatch-root * {
      box-sizing: border-box !important;
    }

    .std-modal-backdrop {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483647 !important;
      background: rgba(0,0,0,.35) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .std-modal {
      width: 420px !important;
      max-width: calc(100vw - 32px) !important;
      padding: 22px !important;
      background: white !important;
      color: #111827 !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 60px rgba(0,0,0,.3) !important;
    }

    .std-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      margin-bottom: 20px !important;
    }

    .std-title {
      font-size: 18px !important;
      font-weight: 700 !important;
    }

    .std-subtitle {
      margin-top: 3px !important;
      font-size: 12px !important;
      color: #6b7280 !important;
    }

    .std-close {
      border: none !important;
      background: transparent !important;
      font-size: 24px !important;
      cursor: pointer !important;
      color: #6b7280 !important;
    }

    .std-field {
      margin-bottom: 16px !important;
    }

    .std-field label {
      display: block !important;
      margin-bottom: 6px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
    }

    .std-field label span {
      color: #9ca3af !important;
      font-weight: normal !important;
    }

    .std-element-type {
      display: inline-block !important;
      padding: 4px 8px !important;
      background: #f3f4f6 !important;
      border-radius: 5px !important;
      font-family: monospace !important;
      font-size: 12px !important;
    }

    .std-current-content {
      padding: 9px 10px !important;
      background: #f9fafb !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 6px !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
      max-height: 80px !important;
      overflow: auto !important;
    }

    .std-field textarea {
      width: 100% !important;
      resize: vertical !important;
      padding: 9px 10px !important;
      border: 1px solid #d1d5db !important;
      border-radius: 6px !important;
      font-family: Arial, sans-serif !important;
      font-size: 13px !important;
      color: #111827 !important;
    }

    .std-field textarea:focus {
      outline: 2px solid #6366f1 !important;
      outline-offset: 1px !important;
    }

    .std-actions {
      display: flex !important;
      gap: 8px !important;
    }

    .std-send,
    .std-copy,
    .std-secondary {
      border-radius: 7px !important;
      padding: 11px 16px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
    }

    .std-send {
      flex: 1 !important;
      border: none !important;
      background: #111827 !important;
      color: white !important;
    }

    .std-copy {
      border: 1px solid #d1d5db !important;
      background: white !important;
      color: #111827 !important;
    }

    .std-secondary {
      width: 100% !important;
      margin-top: 8px !important;
      border: 1px solid #d1d5db !important;
      background: white !important;
      color: #111827 !important;
    }

    .std-send:disabled {
      opacity: .5 !important;
      cursor: wait !important;
    }

    .std-error {
      min-height: 18px !important;
      margin-bottom: 8px !important;
      color: #dc2626 !important;
      font-size: 12px !important;
    }

    .std-success-modal {
      text-align: center !important;
      padding: 30px !important;
    }

    .std-success-icon {
      width: 48px !important;
      height: 48px !important;
      margin: 0 auto 14px !important;
      border-radius: 50% !important;
      background: #dcfce7 !important;
      color: #16a34a !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 24px !important;
    }

    .std-success-message {
      margin: 8px 0 22px !important;
      color: #6b7280 !important;
      font-size: 13px !important;
    }

    .std-success-modal .std-send {
      width: 100% !important;
    }
  `;

  document.head.appendChild(style);
}
