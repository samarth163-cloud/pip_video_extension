// Content Script (ISOLATED world) for PiP Auto-Play Companion
// This script handles Chrome Extension APIs (storage, messaging)
// and forwards settings to main_world.js via window.postMessage.

(function () {
  'use strict';

  const MSG_ID = '__pip_auto_play_companion__';

  // Send settings to main_world.js
  function sendSettings(isEnabled) {
    window.postMessage({ type: MSG_ID, enabled: isEnabled }, '*');
  }

  // Load settings from Chrome storage and forward them
  function loadSettings() {
    try {
      if (!chrome.runtime || !chrome.runtime.id) return;
      chrome.storage.local.get({ globalEnabled: true }, (result) => {
        try {
          if (chrome.runtime && chrome.runtime.id) {
            sendSettings(result.globalEnabled);
          }
        } catch (e) {
          // Extension context invalidated
        }
      });
    } catch (e) {
      // Extension context invalidated
    }
  }

  // Initial load
  loadSettings();

  // Listen for storage changes and forward them
  try {
    if (chrome.runtime && chrome.runtime.id) {
      chrome.storage.onChanged.addListener((changes) => {
        try {
          if (!chrome.runtime || !chrome.runtime.id) return;
          if (changes.globalEnabled) {
            sendSettings(changes.globalEnabled.newValue);
          }
        } catch (e) {
          // Extension context invalidated
        }
      });
    }
  } catch (e) {
    // Extension context invalidated
  }
})();
