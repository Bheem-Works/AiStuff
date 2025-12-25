/**
 * MisoHighlighter - Content Script
 * Handles text selection, highlighting, and popup interactions
 * FIXED: Menu stays open, clickable, and supports 'M' key shortcut
 */

(function () {
  "use strict";

  // State management
  const state = {
    highlights: [],
    history: [],
    historyIndex: -1,
    currentPopup: null,
    currentSelection: null,
    isPopupHovered: false,
    defaultColor: "#e91e63",
    colors: [
      "#ffeb3b", // Yellow
      "#ff9800", // Orange
      "#f44336", // Red
      "#e91e63", // Pink
      "#9c27b0", // Purple
      "#3f51b5", // Blue
      "#00bcd4", // Cyan
      "#4caf50", // Green
    ],
  };

  // Initialize extension
  function init() {
    loadHighlights();
    setupEventListeners();
    applyHighlights();

    // Warn before page unload if there are highlights
    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  // Event listeners setup
  function setupEventListeners() {
    // LEFT-CLICK text selection - show hover popup
    document.addEventListener("mouseup", handleMouseUp);

    // Keyboard shortcut - 'M' key for highlight
    document.addEventListener("keydown", handleKeyDown);

    // Hover over highlighted text
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    // Right-click menu
    document.addEventListener("contextmenu", handleContextMenu);

    // Close popup on click outside (but not on popup itself)
    document.addEventListener("mousedown", handleClickOutside);

    // Close popup on scroll
    document.addEventListener("scroll", handleScroll, true);
  }

  // Handle LEFT-CLICK text selection (mouseup)
  function handleMouseUp(e) {
    // Don't close popup if clicking inside it
    if (e.target.closest(".miso-popup")) {
      return;
    }

    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText && selectedText.length > 0) {
        // Save the selection
        state.currentSelection = {
          text: selectedText,
          range: selection.getRangeAt(0).cloneRange(),
          selection: selection,
        };

        // Show popup positioned above the selection
        showHoverPopup(selection);
      } else if (!e.target.closest(".miso-popup")) {
        // Only close if not clicking popup
        closePopup();
      }
    }, 10);
  }

  // Handle 'M' key press to highlight selected text
  function handleKeyDown(e) {
    // Check if 'M' or 'm' key is pressed
    if (e.key === "m" || e.key === "M") {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText && selectedText.length > 0) {
        e.preventDefault(); // Prevent default 'm' behavior

        // Save the selection if not already saved
        if (
          !state.currentSelection ||
          state.currentSelection.text !== selectedText
        ) {
          state.currentSelection = {
            text: selectedText,
            range: selection.getRangeAt(0).cloneRange(),
            selection: selection,
          };
        }

        // Trigger highlight action
        highlightSelection(state.defaultColor);
        closePopup();

        // Clear the selection visually
        selection.removeAllRanges();
      }
    }

    // ESC key to close popup
    if (e.key === "Escape") {
      closePopup();
    }

    // 'C' key to copy selection/highlight text
    if (e.key === "c" || e.key === "C") {
      if (
        state.currentSelection &&
        (state.currentSelection.range ||
          state.currentSelection.highlightedElement)
      ) {
        e.preventDefault();
        copySelectionToClipboard();
        closePopup();
      }
    }
  }

  // Show hover popup positioned ABOVE the selected text
  function showHoverPopup(selection) {
    closePopup();

    const popup = createPopup("hover-popup");

    const highlightBtn = createButton("Highlight", () => {
      highlightSelection(state.defaultColor);
      closePopup();
      selection.removeAllRanges();
    });

    popup.appendChild(highlightBtn);

    // Position popup above the selection
    positionPopupAboveSelection(popup, selection);

    document.body.appendChild(popup);
    state.currentPopup = popup;

    // Track popup hover state
    popup.addEventListener("mouseenter", () => {
      state.isPopupHovered = true;
    });

    popup.addEventListener("mouseleave", () => {
      state.isPopupHovered = false;
    });
  }

  // Handle right-click
  function handleContextMenu(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    // Check if right-clicking on highlighted text
    const highlightedSpan = e.target.closest(".miso-highlight");

    if (selectedText || highlightedSpan) {
      e.preventDefault();

      if (selectedText) {
        state.currentSelection = {
          text: selectedText,
          range: selection.getRangeAt(0).cloneRange(),
          selection: selection,
        };
      } else {
        state.currentSelection = {
          highlightedElement: highlightedSpan,
        };
      }

      showToolsPopup(e, selection);
    }
  }

  // Show full tools popup
  function showToolsPopup(e, selection) {
    closePopup();

    const popup = createPopup("tools-popup");

    // Highlight button
    const highlightBtn = createButton("Highlight", () => {
      if (state.currentSelection.range) {
        highlightSelection(state.defaultColor);
        closePopup();
        if (selection) selection.removeAllRanges();
      }
    });

    // Change Color button
    const changeColorBtn = createButton("Change Color", () => {
      showColorPalette(popup);
    });

    // Save / Copy button - copies current selection or highlighted text to clipboard
    const saveBtn = createButton("Save", () => {
      copySelectionToClipboard();
      closePopup();
    });

    // Remove button
    const removeBtn = createButton("Remove", () => {
      if (state.currentSelection.highlightedElement) {
        showConfirmModal(
          "Are you sure you want to remove this highlight?",
          () => {
            removeHighlight(state.currentSelection.highlightedElement);
            closePopup();
          }
        );
      } else if (state.currentSelection.range) {
        const spans = getHighlightSpansInRange(state.currentSelection.range);
        if (spans.length > 0) {
          showConfirmModal(
            "Are you sure you want to remove this highlight?",
            () => {
              spans.forEach((span) => removeHighlight(span));
              closePopup();
            }
          );
        }
      }
    });

    popup.appendChild(highlightBtn);
    popup.appendChild(changeColorBtn);
    popup.appendChild(saveBtn);
    popup.appendChild(removeBtn);

    // Position popup near cursor
    positionPopup(popup, e);

    document.body.appendChild(popup);
    state.currentPopup = popup;

    // Track popup hover state
    popup.addEventListener("mouseenter", () => {
      state.isPopupHovered = true;
    });

    popup.addEventListener("mouseleave", () => {
      state.isPopupHovered = false;
    });
  }

  // Show color palette
  function showColorPalette(popup) {
    // Clear existing content
    popup.innerHTML = "";

    const palette = document.createElement("div");
    palette.className = "miso-color-palette active";

    state.colors.forEach((color) => {
      const colorOption = document.createElement("div");
      colorOption.className = "miso-color-option";
      colorOption.style.backgroundColor = color;
      colorOption.onclick = (e) => {
        e.stopPropagation();
        changeHighlightColor(color);
        closePopup();
      };
      palette.appendChild(colorOption);
    });

    popup.appendChild(palette);
  }

  // Highlight selection
  function highlightSelection(color) {
    if (!state.currentSelection || !state.currentSelection.range) return;

    const range = state.currentSelection.range;
    const span = document.createElement("span");
    span.className = "miso-highlight";
    span.style.backgroundColor = color;
    span.dataset.misoId = generateId();

    try {
      range.surroundContents(span);

      const highlight = {
        id: span.dataset.misoId,
        text: span.textContent,
        color: color,
        url: window.location.href,
        timestamp: Date.now(),
      };

      state.highlights.push(highlight);
      addToHistory("add", highlight);
      saveHighlights();
    } catch (e) {
      console.error("Error highlighting text:", e);
    }
  }

  // Change highlight color
  function changeHighlightColor(color) {
    if (state.currentSelection && state.currentSelection.highlightedElement) {
      const span = state.currentSelection.highlightedElement;
      const oldColor = span.style.backgroundColor;
      span.style.backgroundColor = color;

      const highlight = state.highlights.find(
        (h) => h.id === span.dataset.misoId
      );
      if (highlight) {
        highlight.color = color;
        addToHistory("change", { id: highlight.id, oldColor, newColor: color });
        saveHighlights();
      }
    } else if (state.currentSelection && state.currentSelection.range) {
      const spans = getHighlightSpansInRange(state.currentSelection.range);
      spans.forEach((span) => {
        const oldColor = span.style.backgroundColor;
        span.style.backgroundColor = color;

        const highlight = state.highlights.find(
          (h) => h.id === span.dataset.misoId
        );
        if (highlight) {
          highlight.color = color;
          addToHistory("change", {
            id: highlight.id,
            oldColor,
            newColor: color,
          });
        }
      });
      saveHighlights();
    }
  }

  // Remove highlight
  function removeHighlight(span) {
    const highlight = state.highlights.find(
      (h) => h.id === span.dataset.misoId
    );

    if (highlight) {
      state.highlights = state.highlights.filter((h) => h.id !== highlight.id);
      addToHistory("remove", highlight);
      saveHighlights();
    }

    const parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
    parent.normalize();
  }

  // Undo functionality
  function undo() {
    if (state.historyIndex < 0) return;

    const action = state.history[state.historyIndex];

    if (action.type === "add") {
      const span = document.querySelector(`[data-miso-id="${action.data.id}"]`);
      if (span) {
        const parent = span.parentNode;
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        parent.normalize();
      }
      state.highlights = state.highlights.filter(
        (h) => h.id !== action.data.id
      );
    } else if (action.type === "remove") {
      state.highlights.push(action.data);
    } else if (action.type === "change") {
      const span = document.querySelector(`[data-miso-id="${action.data.id}"]`);
      if (span) {
        span.style.backgroundColor = action.data.oldColor;
      }
      const highlight = state.highlights.find((h) => h.id === action.data.id);
      if (highlight) {
        highlight.color = action.data.oldColor;
      }
    }

    state.historyIndex--;
    saveHighlights();
  }

  // Redo functionality
  function redo() {
    if (state.historyIndex >= state.history.length - 1) return;

    state.historyIndex++;
    const action = state.history[state.historyIndex];

    if (action.type === "add") {
      state.highlights.push(action.data);
    } else if (action.type === "remove") {
      state.highlights = state.highlights.filter(
        (h) => h.id !== action.data.id
      );
    } else if (action.type === "change") {
      const span = document.querySelector(`[data-miso-id="${action.data.id}"]`);
      if (span) {
        span.style.backgroundColor = action.data.newColor;
      }
      const highlight = state.highlights.find((h) => h.id === action.data.id);
      if (highlight) {
        highlight.color = action.data.newColor;
      }
    }

    saveHighlights();
  }

  // History management
  function addToHistory(type, data) {
    if (state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }

    state.history.push({ type, data });
    state.historyIndex++;

    if (state.history.length > 50) {
      state.history.shift();
      state.historyIndex--;
    }
  }

  // Hover over highlighted text
  function handleMouseOver(e) {
    if (e.target.classList.contains("miso-highlight")) {
      if (!state.currentPopup) {
        showMinimalPopup(e);
      }
    }
  }

  function handleMouseOut(e) {
    if (e.target.classList.contains("miso-highlight")) {
      if (
        state.currentPopup &&
        state.currentPopup.classList.contains("minimal-popup") &&
        !state.isPopupHovered
      ) {
        closePopup();
      }
    }
  }

  // Show minimal popup for highlighted text
  function showMinimalPopup(e) {
    const span = e.target;
    state.currentSelection = { highlightedElement: span };

    const popup = createPopup("hover-popup minimal-popup");

    const changeColorBtn = createButton("Change Color", () => {
      showColorPalette(popup);
    });

    const saveBtn = createButton("Save", () => {
      copySelectionToClipboard();
      closePopup();
    });

    popup.appendChild(changeColorBtn);
    popup.appendChild(saveBtn);

    positionPopup(popup, e);
    document.body.appendChild(popup);
    state.currentPopup = popup;

    popup.addEventListener("mouseenter", () => {
      state.isPopupHovered = true;
    });

    popup.addEventListener("mouseleave", () => {
      state.isPopupHovered = false;
    });
  }

  // Utility: Create popup element
  function createPopup(className) {
    const popup = document.createElement("div");
    popup.className = `miso-popup ${className}`;
    return popup;
  }

  // Utility: Create button element
  function createButton(text, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = (e) => {
      e.stopPropagation();
      onClick();
    };
    return button;
  }

  // Position popup ABOVE the selected text
  function positionPopupAboveSelection(popup, selection) {
    document.body.appendChild(popup);

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    // Position above the selection
    let top = rect.top + window.scrollY - popupRect.height - 10;
    let left =
      rect.left + window.scrollX + rect.width / 2 - popupRect.width / 2;

    // Ensure popup stays within viewport
    if (top < window.scrollY) {
      top = rect.bottom + window.scrollY + 10;
    }

    if (left < window.scrollX) {
      left = window.scrollX + 10;
    }

    if (left + popupRect.width > window.scrollX + window.innerWidth) {
      left = window.scrollX + window.innerWidth - popupRect.width - 10;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  // Position popup near cursor
  function positionPopup(popup, e) {
    document.body.appendChild(popup);
    const popupRect = popup.getBoundingClientRect();

    let left = e.pageX + 10;
    let top = e.pageY + 10;

    if (left + popupRect.width > window.scrollX + window.innerWidth) {
      left = e.pageX - popupRect.width - 10;
    }

    if (top + popupRect.height > window.scrollY + window.innerHeight) {
      top = e.pageY - popupRect.height - 10;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  // Close popup
  function closePopup() {
    if (state.currentPopup) {
      state.currentPopup.remove();
      state.currentPopup = null;
    }
    state.isPopupHovered = false;
  }

  // Handle click outside popup
  function handleClickOutside(e) {
    if (state.currentPopup && !e.target.closest(".miso-popup")) {
      closePopup();
    }
  }

  // Handle scroll
  function handleScroll(e) {
    if (state.currentPopup) {
      closePopup();
    }
  }

  // Show confirmation modal
  function showConfirmModal(message, onConfirm) {
    const modal = document.createElement("div");
    modal.className = "miso-modal";

    const content = document.createElement("div");
    content.className = "miso-modal-content";

    const title = document.createElement("h3");
    title.textContent = "Confirm Action";

    const text = document.createElement("p");
    text.textContent = message;

    const buttons = document.createElement("div");
    buttons.className = "miso-modal-buttons";

    const cancelBtn = createButton("Cancel", () => {
      modal.remove();
    });

    const confirmBtn = createButton("Confirm", () => {
      onConfirm();
      modal.remove();
    });
    confirmBtn.className = "primary";

    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);

    content.appendChild(title);
    content.appendChild(text);
    content.appendChild(buttons);
    modal.appendChild(content);

    document.body.appendChild(modal);
  }

  // Get highlight spans in range
  function getHighlightSpansInRange(range) {
    const spans = [];
    const container = range.commonAncestorContainer;

    if (container.nodeType === Node.ELEMENT_NODE) {
      const highlights = container.querySelectorAll(".miso-highlight");
      highlights.forEach((span) => {
        if (range.intersectsNode(span)) {
          spans.push(span);
        }
      });
    } else if (container.parentElement) {
      const highlight = container.parentElement.closest(".miso-highlight");
      if (highlight) {
        spans.push(highlight);
      }
    }

    return spans;
  }

  // Generate unique ID
  function generateId() {
    return `miso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Copy utilities
  function copySelectionToClipboard() {
    let text = "";
    if (state.currentSelection) {
      if (state.currentSelection.highlightedElement) {
        text = state.currentSelection.highlightedElement.textContent.trim();
      } else if (state.currentSelection.range) {
        text = state.currentSelection.range.toString().trim();
      }
    }
    if (text) {
      copyTextToClipboard(text);
    } else {
      console.warn("Nothing selected to copy");
    }
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showTemporaryNotification("Copied to clipboard");
        })
        .catch((err) => {
          fallbackCopyText(text);
        });
    } else {
      fallbackCopyText(text);
    }
  }

  function fallbackCopyText(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showTemporaryNotification("Copied to clipboard");
    } catch (e) {
      console.error("Copy failed", e);
    }
    document.body.removeChild(ta);
  }

  function showTemporaryNotification(msg) {
    const n = document.createElement("div");
    n.className = "miso-notification";
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 1800);
  }

  // Load highlights from storage
  function loadHighlights() {
    chrome.storage.local.get(["highlights"], (result) => {
      if (result.highlights) {
        const pageHighlights = result.highlights[window.location.href];
        if (pageHighlights) {
          state.highlights = pageHighlights;
        }
      }
    });
  }

  // Save highlights to storage
  function saveHighlights() {
    chrome.storage.local.get(["highlights"], (result) => {
      const allHighlights = result.highlights || {};
      allHighlights[window.location.href] = state.highlights;
      chrome.storage.local.set({ highlights: allHighlights });
    });
  }

  // Apply saved highlights to page
  function applyHighlights() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(applyHighlightsToPage, 100);
      });
    } else {
      setTimeout(applyHighlightsToPage, 100);
    }
  }

  function applyHighlightsToPage() {
    state.highlights.forEach((highlight) => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent;
        if (text.includes(highlight.text)) {
          const parent = node.parentNode;
          if (parent && !parent.classList.contains("miso-highlight")) {
            const index = text.indexOf(highlight.text);
            if (index !== -1) {
              const range = document.createRange();
              range.setStart(node, index);
              range.setEnd(node, index + highlight.text.length);

              const span = document.createElement("span");
              span.className = "miso-highlight";
              span.style.backgroundColor = highlight.color;
              span.dataset.misoId = highlight.id;

              try {
                range.surroundContents(span);
                break;
              } catch (e) {
                // Skip if can't highlight
              }
            }
          }
        }
      }
    });
  }

  // Handle page unload
  function handleBeforeUnload(e) {
    if (state.highlights.length > 0) {
      e.preventDefault();
      e.returnValue =
        "You have highlights on this page. Are you sure you want to leave?";
      return e.returnValue;
    }
  }

  // Initialize when script loads
  init();
})();
