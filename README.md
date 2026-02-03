<div align="center">

![FoxCLI Logo](./resources/icon-128.png)

# <span style="font-size: 72px; font-weight: 900;">FoxCLI</span>

### **Sync Your Anime to Discord 🦊**

[![Electron](https://img.shields.io/badge/Electron-31-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Discord](https://img.shields.io/badge/Discord%20RPC-Ready-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## ⚠️ Personal Project Notice

**This is a personal project that is highly customized for my specific use case.** It will **not** work out of the box for others without significant modifications.

### What You Need to Change:
- **Discord Client ID** - Hardcoded in the source (`DISCORD_CLIENT_ID` in main.ts)
- **MAL OAuth Credentials** - Requires your own MAL API application registration
- **Steam API Key** - Must use your own Steam Web API key
- **Website Data Paths** - File paths are specific to my local setup
- **Extension IDs** - Chrome extension IDs are registered to my browser
- **WebSocket Ports** - May conflict with your existing services

If you want to use this code, you'll need to:
1. Search for hardcoded values in the codebase and replace them with your own
2. Register your own applications with Discord, MAL, and Steam
3. Update file paths and configuration to match your system

> *This repository is primarily for my own reference and backup. Feel free to use it as inspiration, but expect to do significant customization work.*

---

## 🎬 What is FoxCLI?

**FoxCLI** is your personal anime companion that bridges the gap between your streaming experience and Discord. Watch anime on any site (Crunchyroll, Netflix, or any streaming platform) and your Discord status will automatically update with what you're watching — episode, title, and progress — all in real-time.

> *"Never manually update your Discord status again. FoxCLI does it automatically as you watch."*

---

## ✨ Features

### 🎥 Automatic Discord Rich Presence
- **Real-time Sync** — Your Discord status updates instantly as you watch
- **Episode Tracking** — Shows current episode, title, and watch progress
- **Pause Detection** — Automatically pauses the RPC when you pause the video
- **Multi-site Support** — Works with any anime streaming website via browser extension

### 🎮 Steam Game Integration
- **Auto-detect Games** — Knows when you're gaming and pauses anime RPC
- **Smart Switching** — Seamlessly transitions between anime and games
- **Game Stats** — Track your gaming library and playtime

### 🔐 Secure OAuth Authentication
- **MyAnimeList Integration** — Connect your MAL account securely
- **PKCE Flow** — Industry-standard OAuth2 with PKCE for maximum security
- **Encrypted Storage** — All credentials stored with OS-level encryption
- **No Data Leaks** — Your tokens never leave your local machine

### 🎨 Beautiful Desktop App
- **Modern UI** — Sleek dark theme with glassmorphism effects
- **System Tray** — Minimize to tray and keep running in background
- **Responsive Design** — Native feel with smooth 60fps animations
- **Settings Dashboard** — Easy configuration for all integrations

### 🛡️ Security First
- **Local Only** — WebSocket server binds to localhost only
- **Token Authentication** — Secure WebSocket connections with auto-generated tokens
- **Rate Limiting** — Built-in protection against abuse
- **Input Validation** — All user inputs sanitized and validated
- **Safe Storage** — API keys encrypted using Electron's safeStorage

---

## 🏗️ Architecture

```
foxcli/
├── app/                          # Electron Application
│   ├── src/
│   │   ├── main/                 # Main Process (Node.js)
│   │   │   ├── main.ts           # App entry point, Discord RPC, WebSocket
│   │   │   ├── store.ts          # Encrypted settings storage
│   │   │   ├── apiServer.ts      # REST API for website integration
│   │   │   ├── dataExporter.ts   # MAL/Steam data aggregation
│   │   │   └── preload.ts        # Secure IPC bridge
│   │   └── renderer/             # Renderer Process (React)
│   │       ├── components/       # UI Components
│   │       │   ├── SettingsModal.tsx
│   │       │   ├── SteamLibrary.tsx
│   │       │   ├── MALConnect.tsx
│   │       │   └── Sidebar.tsx
│   │       └── services/         # API & State Management
│   │           ├── malApi.ts
│   │           └── tierListStore.ts
│   └── dist/                     # Compiled output
├── extension/                    # Browser Extension (Chrome/Edge)
│   ├── manifest.json             # Manifest V3
│   ├── background.js             # WebSocket client
│   ├── content.js                # Video detection
│   └── providers/                # Site-specific scrapers
└── website/                      # Personal Stats Website
    └── public/
        └── data.json             # Exported stats
```

---

## 🛠️ Development

### Scripts

```bash
# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Build only renderer
npm run build:renderer

# Build only main process
npm run build:electron

# Preview production build
npm run preview

# Generate app icons
npm run generate-icons

# Build Windows installer
npm run build:win
```

### Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Electron 31 + React 18 |
| **Language** | TypeScript 5.0 |
| **Build Tool** | Vite 5 |
| **UI** | React + Tailwind CSS |
| **State** | Local React State |
| **IPC** | Electron Context Bridge |
| **Storage** | Electron safeStorage |
| **Discord** | discord-rpc |
| **WebSocket** | ws |

---

## 🔌 Integrations

### MyAnimeList (MAL)
- OAuth2 authentication with PKCE
- User profile and statistics
- Anime list and ratings
- Currently watching status

### Discord
- Rich Presence updates
- Real-time status sync
- Button links to streaming sites
- Custom idle status

### Steam
- Library statistics via Steam Web API
- Game detection via PowerShell
- Playtime tracking
- Owned games count

### Browser Extension
- Manifest V3 compliant
- WebSocket communication
- Video state detection
- Metadata extraction
- Multi-site support

---

## 🎨 Design Philosophy

### Security
- All sensitive data encrypted at rest
- No secrets hardcoded in source
- Local-only server bindings
- Comprehensive input validation
- CSRF and XSS protection

### Performance
- Debounced Discord updates (150ms)
- Rate-limited API calls
- Bounded memory caches
- Lazy loading of components
- Efficient IPC communication

### UX
- System tray integration
- Auto-launch on startup
- Notification support
- Minimize to tray behavior
- Clear visual feedback

---

## 📊 Project Stats

| Metric | Count |
|--------|-------|
| **Lines of Code** | 15,000+ |
| **Components** | 30+ |
| **IPC Handlers** | 40+ |
| **API Endpoints** | 10+ |
| **Security Layers** | 12+ |

---

## 🔐 Security Features

### Implemented
- ✅ OAuth2 State Validation (CSRF Protection)
- ✅ PKCE Code Challenge (S256)
- ✅ Encrypted Credential Storage
- ✅ Command Injection Prevention
- ✅ SSRF Protection with DNS validation
- ✅ Rate Limiting on API endpoints
- ✅ WebSocket Token Authentication
- ✅ Input Sanitization
- ✅ CORS Origin Validation
- ✅ Security Headers (CSP, X-Frame-Options)

### Best Practices
- No secrets in source code
- All tokens generated or user-provided
- OS-level encryption for storage
- Principle of least privilege
- Defense in depth architecture

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What MIT License Means:
- ✅ You can use this code for free, forever
- ✅ You can modify it
- ✅ You can distribute it
- ✅ You can use it in commercial projects
- ✅ Private use is allowed
- ✅ You must include the license and copyright notice
- ⚠️ You can't hold the author liable
- ⚠️ There's no warranty

**Note**: While the license allows reuse, this codebase contains personal configurations and hardcoded values that require significant customization to work for others.

---

## 🙏 Acknowledgments

- [Discord RPC](https://github.com/discordjs/RPC) - Discord Rich Presence library
- [Electron](https://electronjs.org) - Cross-platform desktop apps
- [Jikan API](https://jikan.moe) - Unofficial MyAnimeList API
- [Framer Motion](https://framer.com/motion) - React animations
- [Lucide Icons](https://lucide.dev) - Beautiful icons

---

## 🌐 Connect

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-@Foxemsx-181717?style=flat-square&logo=github)](https://github.com/Foxemsx)
[![Discord](https://img.shields.io/badge/Discord-767347091873595433-5865F2?style=flat-square&logo=discord)](https://discord.com/users/767347091873595433)

</div>

---

<div align="center">

**Made with 🦊 and ☕**

*Powered by FoxCLI*

</div>
