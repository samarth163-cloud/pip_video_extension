// Main World Script for PiP Auto-Play Companion
// This runs in the PAGE's JavaScript context (same as YouTube/Vimeo code)
// which allows us to intercept and patch the Media Session API.

(function () {
  'use strict';

  let enabled = true;
  const MSG_ID = '__pip_auto_play_companion__';

  // Listen for enable/disable settings from the isolated-world content.js
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === MSG_ID) {
      enabled = event.data.enabled;
    }
  });

  // =====================================================================
  // 1. MONKEY-PATCH Media Session API
  //    Prevent YouTube (or any site) from removing our enterpictureinpicture handler
  // =====================================================================
  let _originalSetActionHandler = null;
  let _pipHandlerActive = false;

  if ('mediaSession' in navigator && navigator.mediaSession.setActionHandler) {
    _originalSetActionHandler = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);

    navigator.mediaSession.setActionHandler = function (action, handler) {
      // If the site tries to REMOVE the enterpictureinpicture handler we registered, block it
      if (action === 'enterpictureinpicture' && handler === null && _pipHandlerActive) {
        return;
      }
      // If the site sets its OWN enterpictureinpicture handler, let it through
      // (it will still trigger PiP which is what we want)
      return _originalSetActionHandler(action, handler);
    };
  }

  // =====================================================================
  // 2. FIND THE PLAYING VIDEO
  // =====================================================================
  function getPlayingVideo() {
    const videos = document.querySelectorAll('video');
    for (const v of videos) {
      if (!v.paused && !v.ended && v.readyState > 2) return v;
    }
    return null;
  }

  // =====================================================================
  // 3. PREPARE A VIDEO ELEMENT FOR AUTO-PIP
  // =====================================================================
  function prepareVideo(video) {
    if (!video || video.tagName !== 'VIDEO') return;

    // Remove any PiP restrictions set by the site
    if (video.hasAttribute('disablepictureinpicture')) {
      video.removeAttribute('disablepictureinpicture');
    }
    video.disablePictureInPicture = false;

    // Set the autopictureinpicture attribute (tells Chrome this video wants auto-PiP)
    if (!video.autoPictureInPicture) {
      video.autoPictureInPicture = true;
    }
    if (!video.hasAttribute('autopictureinpicture')) {
      video.setAttribute('autopictureinpicture', '');
    }
  }

  // =====================================================================
  // 4. REGISTER OUR MEDIA SESSION PiP HANDLER
  //    Chrome calls this handler when it decides to auto-PiP (on tab switch)
  // =====================================================================
  function registerPiPHandler() {
    if (!_originalSetActionHandler) return;

    try {
      _originalSetActionHandler('enterpictureinpicture', async () => {
        if (!enabled) return;
        const video = getPlayingVideo();
        if (video) {
          try {
            await video.requestPictureInPicture();
          } catch (e) {
            // Will fail if browser doesn't grant auto-PiP — this is expected
          }
        }
      });
      _pipHandlerActive = true;
    } catch (e) {
      // enterpictureinpicture action not supported in this browser version
    }
  }

  // =====================================================================
  // 5. SCAN ALL VIDEOS IN THE PAGE
  // =====================================================================
  function processAllVideos() {
    document.querySelectorAll('video').forEach(prepareVideo);
  }

  // =====================================================================
  // 6. INITIALIZATION
  // =====================================================================
  function init() {
    processAllVideos();
    registerPiPHandler();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // =====================================================================
  // 7. WATCH FOR DYNAMICALLY ADDED VIDEOS (YouTube is a SPA)
  // =====================================================================
  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!enabled) return;
      let found = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.tagName === 'VIDEO') {
            prepareVideo(node);
            found = true;
          } else if (node.querySelector) {
            const vids = node.querySelectorAll('video');
            if (vids.length > 0) {
              vids.forEach(prepareVideo);
              found = true;
            }
          }
        }
      }
      if (found) registerPiPHandler();
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  // =====================================================================
  // 8. RE-REGISTER WHEN A VIDEO STARTS PLAYING
  // =====================================================================
  document.addEventListener('play', (event) => {
    if (!enabled) return;
    const path = event.composedPath();
    const video = path && path[0];
    if (video && video.tagName === 'VIDEO') {
      prepareVideo(video);
      registerPiPHandler();
    }
  }, true);

  // =====================================================================
  // 9. ENSURE PLAYBACK CONTINUES DURING PiP TRANSITIONS
  // =====================================================================
  document.addEventListener('enterpictureinpicture', (event) => {
    if (!enabled) return;
    const path = event.composedPath();
    const video = path && path[0];
    if (video && video.tagName === 'VIDEO') {
      setTimeout(() => video.play().catch(() => {}), 100);
    }
  }, true);

  document.addEventListener('leavepictureinpicture', (event) => {
    if (!enabled) return;
    const path = event.composedPath();
    const video = path && path[0];
    if (video && video.tagName === 'VIDEO') {
      setTimeout(() => video.play().catch(() => {}), 100);
    }
  }, true);

  // =====================================================================
  // 10. FALLBACK: TRY MANUAL PiP ON TAB SWITCH
  // =====================================================================
  document.addEventListener('visibilitychange', () => {
    if (!enabled) return;

    if (document.hidden) {
      const video = getPlayingVideo();
      if (video && document.pictureInPictureElement !== video) {
        video.requestPictureInPicture().catch(() => {
          // Expected to fail without user gesture — native auto-PiP handles it
        });
      }
    } else {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    }
  });

})();
