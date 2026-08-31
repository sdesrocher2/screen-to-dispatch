let selectionMode = false;

document.addEventListener("mouseover", handleMouseOver);
document.addEventListener("mouseout", handleMouseOut);

function handleMouseOver(event) {
  if (!selectionMode) return;

  event.target.style.outline = "2px solid blue";
}

function handleMouseOut(event) {
  if (!selectionMode) return;

  event.target.style.outline = "";
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (
    event.data?.source === "screen-to-dispatch" &&
    event.data?.type === "START_SELECTION"
  ) {
    selectionMode = true;
  }
});
