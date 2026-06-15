# FocusLog

FocusLog is a modern, comprehensive study timer and productivity analytics tool. Designed with clean, highly customizable aesthetics, FocusLog helps you stay deeply focused on your work while keeping detailed, actionable statistics about your habits, distractions, and concentration over time.

## Key Features

- **Customizable Timers**: Choose between an immersive circular ring timer or massive text depending on your visual preference. Set goals, tag your sessions, and start working.
- **Deep Analytics & Heatmaps**: Monitor your productivity via rich visual dashboards. See your consistency on a GitHub-style heatmap, view radar charts of your peak focus hours, and track advanced metrics like your "Time to First Distraction." Includes correlation tracking between your stress and energy levels, and a regression-based Focus Trend metric indicating whether your focus is improving or worsening over time.
- **Smart Distraction Tracking & Word Cloud**: The moment your mind wanders, tap to log a distraction. The Distraction Modal analyzes your history to generate a "Quick Select" word cloud, automatically remembering if your common triggers are internal or external.
- **Preemptive Cognitive Cliffs**: The built-in Analytics Engine evaluates your Focus Quality (SFI) to determine your personal "Focus Endurance" and proactively suggests a short break right *before* you typically lose focus.
- **Meditation Tracker**: Includes a dedicated Zen Mode for meditation. Track your streaks without tracking distractions. Enjoy built-in synthetic ambient soundscapes (Brown noise, Pink noise, Rain, etc.) or supply your own MP3 files, all paired with configurable interval gongs.
- **Multi-Device LAN Sync**: Hosted locally. Leave the server running on your PC, then open FocusLog on your tablet or smartphone browser. Control the timer from anywhere on your Wi-Fi network—changes reflect instantaneously across all devices.
- **Full Data Ownership**: Your data is stored locally in human-readable JSON files. You can export backups and import them across machines anytime.

## Quick Start Guide

### Prerequisites
Make sure you have Node.js and NPM installed on your machine.

### Running FocusLog
Simply execute the provided run script:
```bash
./run.sh
```

**What the script does:**
1. If it's your very first time running the script, it will automatically install all necessary backend and frontend dependencies using `npm install`.
2. It will build the frontend client.
3. It will boot up the background data server.
4. It will automatically launch FocusLog in your default web browser at `http://localhost:3001`.

*Note: You can safely terminate the server by pressing `Ctrl+C` in the terminal where you ran the script.*

## Customizing Your Experience
- Navigate to the **Settings** gear icon in the top right to switch between Dark/Light themes, or adjust the core UI Accent color dynamically.
- Setup custom time targets for your day, week, or specific tags (e.g. "Math", "Reading").
- Optionally configure a LAN password if you want to secure your local dashboard from other people on your Wi-Fi network.
