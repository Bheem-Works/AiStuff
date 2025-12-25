# MisoHighlighter

Small Chrome extension to highlight text on web pages with hover and right-click tools.

## Files

- `manifest.json` - Chrome manifest v3
- `content/content.js` - Main content script (selection detection, popup UI, highlight logic)
- `content/content.css` - Styles for popups and highlight spans
- `icons/` - placeholder icons

## Features

- Hover over a selection to see a small popup with one action: **Highlight**
- Right-click selection to see a full tools popup: **Highlight, Save, Change Color, Remove**
- Hover or right-click a highlighted span to change color or remove
- Highlights stored in `chrome.storage.local` with metadata (text, occurrence index, color, url)
- History is kept internally; the popup UI uses a simplified toolset (Save replaces undo/redo buttons)
- Popups hide on outside click, scroll, or ESC
- On page reload, if highlights exist, the user is asked whether to remove them before reloading

## Installation (developer mode)

1. Visit `chrome://extensions`
2. Toggle _Developer mode_ on
3. Click _Load unpacked_ and select this repository folder

## Notes & Limitations

- Highlights are re-applied by finding the Nth occurrence of the highlighted text. This works reasonably well but can mismatch if page changes significantly.
- The script handles many edge cases but may need further tuning for complex DOMs.
