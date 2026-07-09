// Background Service Worker for PiP Auto-Play Companion Chrome Extension

// =====================================================================
// 1. OPEN VIDEO PLAYER PAGE (from popup)
// =====================================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_video_player") {
    chrome.tabs.create({ url: chrome.runtime.getURL("video_player.html") });
    sendResponse({ success: true });
  }
});

// =====================================================================
// 2. PiP ON WINDOW MINIMIZE / FOCUS LOST
//
//    STRATEGY:
//    Chrome only triggers auto-PiP on TAB SWITCH in a VISIBLE window.
//    To minimize flashing and make it extremely fast and smooth:
//      1. Restore the window state to 'normal' but KEEP IT UNFOCUSED (no flash/popup).
//      2. Instantly switch to another tab (triggers Chrome's auto-PiP handler).
//      3. Instantly minimize the window back.
//    By optimizing the delays to 50ms and 200ms, the transition is smooth.
// =====================================================================
let lastFocusedWindowId = null;
let pipSourceTabId = null;
let tempTabId = null;
let isProcessing = false;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Track last focused window to know which window to restore/minimize
chrome.windows.getLastFocused().then(win => {
  if (win) lastFocusedWindowId = win.id;
}).catch(() => {});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (isProcessing) return;

  try {
    const { globalEnabled } = await chrome.storage.local.get({ globalEnabled: true });
    if (!globalEnabled) return;
  } catch (e) { return; }

  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus/minimized
    await handleWindowLostFocus();
  } else {
    // Window gained focus
    lastFocusedWindowId = windowId;
    await handleWindowRegainedFocus();
  }
});

// ---------- MINIMIZE: Fast & Smooth Tab Switch ----------
async function handleWindowLostFocus() {
  if (pipSourceTabId || !lastFocusedWindowId) return;

  isProcessing = true;
  const windowId = lastFocusedWindowId;

  try {
    // Check if the window is actually minimized
    const win = await chrome.windows.get(windowId);
    if (win.state !== 'minimized') {
      isProcessing = false;
      return;
    }

    // Find the active tab in the minimized window
    const [activeTab] = await chrome.tabs.query({
      active: true,
      windowId: windowId
    });

    if (!activeTab || !activeTab.url) {
      isProcessing = false;
      return;
    }

    if (activeTab.url.startsWith('chrome://') ||
        activeTab.url.startsWith('chrome-extension://') ||
        activeTab.url.startsWith('about:')) {
      isProcessing = false;
      return;
    }

    // Check if there is a playing video on this tab
    let hasVideo = false;
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        world: "MAIN",
        func: () => {
          const vids = document.querySelectorAll('video');
          for (const v of vids) {
            if (!v.paused && !v.ended && v.readyState > 2) return true;
          }
          return false;
        }
      });
      hasVideo = result && result.result;
    } catch (e) {
      isProcessing = false;
      return;
    }

    if (!hasVideo) {
      isProcessing = false;
      return;
    }

    // Save the source tab ID
    pipSourceTabId = activeTab.id;

    // ── Step 1: Restore window to 'normal' but KEEP it unfocused ──
    await chrome.windows.update(windowId, { state: 'normal', focused: false });
    await delay(80); // Tiny delay to allow window state update

    // ── Step 2: Find another tab or create a temp one, then switch ──
    const allTabs = await chrome.tabs.query({ windowId: windowId });
    const otherTab = allTabs.find(t =>
      t.id !== activeTab.id &&
      !t.url?.startsWith('chrome://') &&
      !t.url?.startsWith('chrome-extension://')
    );

    if (otherTab) {
      await chrome.tabs.update(otherTab.id, { active: true });
    } else {
      // Create a temporary blank tab
      const newTab = await chrome.tabs.create({
        windowId: windowId,
        url: 'about:blank',
        active: true
      });
      tempTabId = newTab.id;
    }

    // ── Step 3: Wait briefly for PiP to detach, then minimize ──
    await delay(300); // Reduced from 600ms to 300ms for speed
    await chrome.windows.update(windowId, { state: 'minimized' });

  } catch (e) {
    pipSourceTabId = null;
    tempTabId = null;
  } finally {
    isProcessing = false;
  }
}

// ---------- RESTORE: Switch back instantly ----------
async function handleWindowRegainedFocus() {
  if (!pipSourceTabId) return;

  isProcessing = true;
  try {
    // Switch back to original video tab
    await chrome.tabs.update(pipSourceTabId, { active: true });
    await delay(50);
  } catch (e) {}

  pipSourceTabId = null;

  if (tempTabId) {
    try {
      await chrome.tabs.remove(tempTabId);
    } catch (e) {}
    tempTabId = null;
  }
  isProcessing = false;
}
