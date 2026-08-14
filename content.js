(() => {
  "use strict";

  const blockPaste = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const blockPasteInput = (event) => {
    if (event.inputType === "insertFromPaste" || event.inputType === "insertFromPasteAsQuotation") {
      blockPaste(event);
    }
  };

  window.addEventListener("paste", blockPaste, true);
  window.addEventListener("beforeinput", blockPasteInput, true);
})();
