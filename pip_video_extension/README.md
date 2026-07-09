# Picture-in-Picture Extension Auto-Play (sam) 📺🚀

A lightweight Chrome Extension that enables seamless automatic and manual Picture-in-Picture (PiP) transitions for HTML5 videos on platforms like YouTube, Vimeo, and custom video players.

---

## ✨ Features

- **🔄 Automatic Tab Switch PiP:** Play any video, switch to a different tab, and the active video automatically detaches into a floating Picture-in-Picture window. Returning to the tab automatically restores the inline player and keeps playing.
- **📉 Automatic Window Minimize PiP:** Minimize the browser window while watching a video, and it smoothly floats into PiP mode. Restoring the window returns the video inline instantly.
- **⚡ Manual PiP Toggle Button:** Clicking the extension icon in the toolbar opens a sleek popup with a custom cyan button to manually request or exit Picture-in-Picture mode on any active video with a single click.
- **🎛️ Global Support Toggle:** Easily enable or disable global auto-PiP tracking across other websites using the popup switch.
- **🛡️ Shielded Native Integrations:** Intercepts page-level Media Session APIs in the MAIN world to prevent custom website players (like YouTube's player) from overriding or blocking native PiP hooks.

---

## 🛠️ Installation

Since this is a custom extension, install it locally as a developer:

1. Download or clone this repository to a folder on your computer.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. In the top-right corner, turn **ON** the **"Developer mode"** switch.
4. In the top-left corner, click **"Load unpacked"**.
5. Select the folder containing these files (the one containing `manifest.json`).
6. Pin the extension to your toolbar to access the manual PiP controls!

---

## 🔧 Browser Requirements & Configuration

For the **tab-switching auto-PiP** feature to trigger natively, Chrome requires you to enable the corresponding feature flags:

1. Open Chrome and navigate to `chrome://flags/`.
2. Search for `auto picture in picture`.
3. Locate **"Auto Picture-in-Picture for video playback"** and change it to **Enabled**.
4. Locate **"Browser-initiated automatic picture-in-picture"** and change it to **Enabled**.
5. Click **Relaunch** at the bottom right to restart Chrome.

---

## 📁 File Structure

```
├── manifest.json       # Extension metadata, permissions, and script declarations
├── background.js       # Background worker handling window minimize & tab switch triggers
├── main_world.js       # Injectable main page context script managing Media Session hooks
├── content.js          # Intermediate content script managing extension storage logic
├── popup.html/.css/.js # Manual trigger button controls & global settings switch UI
├── video_player.html   # Standalone custom offline/local demo video player
├── icon.png            # Icon assets in multiple responsive sizes (16px, 48px, 128px)
└── README.md           # Documentation
```

---

## 📝 License

Distributed under the MIT License. Created by sam.
