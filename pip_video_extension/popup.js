// Popup script for PiP Auto-Play Companion Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
  const openPlayerBtn = document.getElementById('open-player-btn');
  const togglePipBtn = document.getElementById('toggle-pip-btn');
  const globalToggle = document.getElementById('global-toggle');

  // Load initial settings
  chrome.storage.local.get({ globalEnabled: true }, (result) => {
    globalToggle.checked = result.globalEnabled;
  });

  // Save settings on toggle
  globalToggle.addEventListener('change', () => {
    chrome.storage.local.set({ globalEnabled: globalToggle.checked }, () => {
      console.log('PiP Auto-Play Companion: Setting saved. Global support is', globalToggle.checked);
    });
  });

  // Manual Trigger PiP button logic
  togglePipBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      // Skip chrome:// pages
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:'))) {
        alert("Cannot trigger PiP on system pages.");
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: () => {
          const activePipElement = document.pictureInPictureElement;
          if (activePipElement) {
            document.exitPictureInPicture().catch(() => {});
          } else {
            const vids = document.querySelectorAll('video');
            if (vids.length === 0) {
              alert("No video found on this page!");
              return;
            }
            // Find the video currently playing, or fallback to the first one found
            const targetVideo = Array.from(vids).find(v => !v.paused && !v.ended && v.readyState > 2) || vids[0];
            if (targetVideo) {
              targetVideo.removeAttribute('disablepictureinpicture');
              targetVideo.disablePictureInPicture = false;
              targetVideo.requestPictureInPicture().catch((err) => {
                console.error("PiP trigger failed: ", err);
              });
            }
          }
        }
      });
      window.close(); // Close popup after action
    } catch (e) {
      console.error("Failed to execute PiP script:", e);
    }
  });

  // Send message to background script to open the player tab
  openPlayerBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'open_video_player' }, (response) => {
      if (response && response.success) {
        window.close(); // Close the popup
      }
    });
  });
});
