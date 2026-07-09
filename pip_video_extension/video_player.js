// JavaScript for Custom Video Player & PiP Event Logs

document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('demo-video');
  const videoContainer = document.getElementById('video-container');
  const controlsOverlay = document.getElementById('controls-overlay');
  
  // Custom Controls Elements
  const playPauseBtn = document.getElementById('play-pause-btn');
  const playIcon = playPauseBtn.querySelector('.play-icon');
  const pauseIcon = playPauseBtn.querySelector('.pause-icon');
  const muteBtn = document.getElementById('mute-btn');
  const volumeUpIcon = muteBtn.querySelector('.volume-up-icon');
  const volumeOffIcon = muteBtn.querySelector('.volume-off-icon');
  const volumeSlider = document.getElementById('volume-slider');
  const currentTimeLabel = document.getElementById('current-time');
  const durationTimeLabel = document.getElementById('duration-time');
  const pipBtn = document.getElementById('pip-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const progressBarContainer = document.getElementById('progress-bar-container');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressHandle = document.getElementById('progress-handle');

  // Sidebar Monitors
  const playbackStatusDot = document.getElementById('playback-status-dot');
  const playbackStatusTxt = document.getElementById('playback-status-txt');
  const pipStatusDot = document.getElementById('pip-status-dot');
  const pipStatusTxt = document.getElementById('pip-status-txt');
  const consoleBody = document.getElementById('console-body');
  const clearConsoleBtn = document.getElementById('clear-console-btn');

  // Enable Auto-PiP natively on the video element
  try {
    video.autoPictureInPicture = true;
    video.setAttribute('autopictureinpicture', '');
  } catch (e) {
    console.warn('PiP Auto-Play Companion: Failed to enable native autoPictureInPicture on video', e);
  }

  // Help Logger Function
  function logEvent(message, type = 'system') {
    const time = new Date().toLocaleTimeString();
    const logElement = document.createElement('div');
    logElement.className = `console-log ${type}`;
    logElement.textContent = `[${time}] ${message}`;
    consoleBody.appendChild(logElement);
    consoleBody.scrollTop = consoleBody.scrollHeight;
  }

  // Clear Console
  clearConsoleBtn.addEventListener('click', () => {
    consoleBody.innerHTML = '';
    logEvent('Console cleared.', 'system');
  });

  // Play / Pause Logic
  function togglePlay() {
    if (video.paused) {
      video.play().catch(err => {
        logEvent(`Play failed: ${err.message}`, 'system');
      });
    } else {
      video.pause();
    }
  }

  playPauseBtn.addEventListener('click', togglePlay);
  
  // Spacebar toggle playback (when not focused on other controls)
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement.tagName !== 'BUTTON' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      togglePlay();
    }
  });

  video.addEventListener('play', () => {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    playbackStatusDot.classList.add('green');
    playbackStatusTxt.textContent = 'Playing';
    logEvent('Video playback started / resumed.', 'play');
  });

  video.addEventListener('pause', () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    playbackStatusDot.classList.remove('green');
    playbackStatusTxt.textContent = 'Paused';
    logEvent('Video playback paused.', 'pause');
  });

  // Time & Seeker Controls
  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  video.addEventListener('loadedmetadata', () => {
    durationTimeLabel.textContent = formatTime(video.duration);
  });

  video.addEventListener('timeupdate', () => {
    currentTimeLabel.textContent = formatTime(video.currentTime);
    const progressPercent = (video.currentTime / video.duration) * 100;
    progressBarFill.style.width = `${progressPercent}%`;
    progressHandle.style.left = `${progressPercent}%`;
  });

  // Seek on click/drag
  function scrub(e) {
    const rect = progressBarContainer.getBoundingClientRect();
    const scrubTime = ((e.clientX - rect.left) / rect.width) * video.duration;
    if (scrubTime >= 0 && scrubTime <= video.duration) {
      video.currentTime = scrubTime;
    }
  }

  let mousedown = false;
  progressBarContainer.addEventListener('click', scrub);
  progressBarContainer.addEventListener('mousemove', (e) => mousedown && scrub(e));
  progressBarContainer.addEventListener('mousedown', () => mousedown = true);
  window.addEventListener('mouseup', () => mousedown = false);

  // Mute & Volume Logic
  function toggleMute() {
    video.muted = !video.muted;
    if (video.muted) {
      volumeUpIcon.classList.add('hidden');
      volumeOffIcon.classList.remove('hidden');
      volumeSlider.value = 0;
      logEvent('Video muted.', 'system');
    } else {
      volumeUpIcon.classList.remove('hidden');
      volumeOffIcon.classList.add('hidden');
      volumeSlider.value = video.volume;
      logEvent(`Video unmuted (Volume: ${Math.round(video.volume * 100)}%).`, 'system');
    }
  }

  muteBtn.addEventListener('click', toggleMute);

  volumeSlider.addEventListener('input', (e) => {
    video.volume = e.target.value;
    video.muted = e.target.value == 0;
    if (video.muted) {
      volumeUpIcon.classList.add('hidden');
      volumeOffIcon.classList.remove('hidden');
    } else {
      volumeUpIcon.classList.remove('hidden');
      volumeOffIcon.classList.add('hidden');
    }
  });

  // Picture-in-Picture logic
  async function togglePiP() {
    try {
      if (video !== document.pictureInPictureElement) {
        logEvent('Requesting Picture-in-Picture...', 'system');
        await video.requestPictureInPicture();
      } else {
        logEvent('Exiting Picture-in-Picture...', 'system');
        await document.exitPictureInPicture();
      }
    } catch (error) {
      logEvent(`Picture-in-Picture failed: ${error.message}`, 'system');
    }
  }

  pipBtn.addEventListener('click', togglePiP);

  // CRITICAL REQUIREMENT LOGIC
  video.addEventListener('enterpictureinpicture', () => {
    pipStatusDot.classList.add('green');
    pipStatusTxt.textContent = 'Active';
    logEvent('Video entered PiP mode.', 'pip-enter');
    
    // Auto play when entering PiP mode
    logEvent('Triggering automatic play in PiP mode...', 'system');
    video.play().then(() => {
      logEvent('Auto-play success in PiP mode.', 'play');
    }).catch(err => {
      logEvent(`Auto-play failed in PiP mode: ${err.message}`, 'system');
    });
  });

  video.addEventListener('leavepictureinpicture', () => {
    pipStatusDot.classList.remove('green');
    pipStatusTxt.textContent = 'Inactive';
    logEvent('Video exited PiP mode (returned to page).', 'pip-exit');

    // Auto play when exiting PiP mode back to page
    logEvent('Triggering automatic play back on page...', 'system');
    video.play().then(() => {
      logEvent('Auto-play success on page return.', 'play');
    }).catch(err => {
      logEvent(`Auto-play failed on page return: ${err.message}`, 'system');
    });
  });

  // Fullscreen Logic
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(err => {
        logEvent(`Fullscreen failed: ${err.message}`, 'system');
      });
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      logEvent('Entered fullscreen mode.', 'system');
    } else {
      logEvent('Exited fullscreen mode.', 'system');
    }
  });

  // Handle visibility changes for automatic PiP on tab switch for this demo player
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!video.paused && !video.ended && video.readyState > 2) {
        logEvent('Tab hidden, attempting auto Picture-in-Picture...', 'system');
        video.requestPictureInPicture().catch(err => {
          logEvent(`Auto-PiP blocked: ${err.message}. Enabling browser flags can bypass this.`, 'system');
        });
      }
    } else {
      if (document.pictureInPictureElement === video) {
        logEvent('Tab visible, exiting Picture-in-Picture...', 'system');
        document.exitPictureInPicture().catch(err => {
          logEvent(`Exit PiP failed: ${err.message}`, 'system');
        });
      }
    }
  });

  // Initialize duration label if cached
  if (video.readyState >= 1) {
    durationTimeLabel.textContent = formatTime(video.duration);
  }
});
