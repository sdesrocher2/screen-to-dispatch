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
