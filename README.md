<div align="center">

![FoxCLI Logo](https://i.imgur.com/jvG5XB6.png)

# **FoxCLI**

### **Sync Your Anime Watching Activity to Discord Rich Presence 🦊**

[![Electron](https://img.shields.io/badge/Electron-31-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Discord](https://img.shields.io/badge/Discord%20RPC-Ready-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> *Never manually update your Discord status again. FoxCLI does it automatically as you watch.*

</div>



## ⚠️ | Personal Project Notice

| ⚡ Quick Info |
|:---|
| **This is a personal project** — highly customized for my specific use case. It will **NOT** work out of the box without significant modifications. |

### 🔧 What You Need to Change:

| Item | Description | Location |
|:---|:---|:---|
| 🔑 **Discord Client ID** | Hardcoded in source | `main.ts` - `DISCORD_CLIENT_ID` |
| 🔐 **MAL OAuth Credentials** | Requires your own MAL API app | [MyAnimeList API](https://myanimelist.net/apiconfig) |
| 🎮 **Steam API Key** | Must use your own Steam Web API | [Steam Web API](https://steamcommunity.com/dev/apikey) |
| 📁 **Website Data Paths** | File paths specific to my setup | `dataExporter.ts` |
| 🆔 **Extension IDs** | Registered to my browser | `manifest.json` |
| 🔌 **WebSocket Ports** | May conflict with existing services | `config.js`, `main.ts` |

> [!TIP]
> This repository is primarily for **my own reference and backup**. Feel free to use it as inspiration, but expect to do significant customization work.

---

## 🎬 | What is FoxCLI?

**FoxCLI** is your personal anime companion that bridges the gap between your streaming experience and Discord. 

| Feature | Description |
|:---|:---|
| 🎥 **Automatic Sync** | Discord status updates in real-time as you watch |
| 🌐 **Multi-site Support** | Works with any anime streaming website |
| 🎬 **Episode Tracking** | Shows current episode, title, and progress |
| ⏸️ **Pause Detection** | Automatically pauses RPC when you pause video |
| 🎮 **Steam Integration** | Knows when you're gaming and pauses anime RPC |

---

## 📸 | Screenshots

<div align="center">
  
| Home Dashboard | Discord RPC |
|:---:|:---:|
| ![Home](https://i.imgur.com/hfaf6Ih.png) | ![Discord RPC](https://i.imgur.com/NIOwfhr.png) |
| **Anime Statistics** | **Seasonal Breakdown** |
| ![Stats](https://i.imgur.com/BUOFDY8.png) | ![Seasonal](https://i.imgur.com/OLrt3oF.png) |

</div>

---

## ✨ | Features

### 🎥 Automatic Discord Rich Presence

| Status | Feature | Description |
|:---:|:---|:---|
| ✅ | Real-time Sync | Your Discord status updates instantly as you watch |
| ✅ | Episode Tracking | Shows current episode, title, and watch progress |
| ✅ | Pause Detection | Automatically pauses the RPC when you pause the video |
| ✅ | Multi-site Support | Works with any anime streaming website via browser extension |

### 🎮 Steam Game Integration

| Status | Feature | Description |
|:---:|:---|:---|
| ✅ | Auto-detect Games | Knows when you're gaming and pauses anime RPC |
| ✅ | Smart Switching | Seamlessly transitions between anime and games |
| ✅ | Game Stats | Track your gaming library and playtime |

### 🔐 Secure OAuth Authentication

| Status | Feature | Description |
|:---:|:---|:---|
| ✅ | MyAnimeList Integration | Connect your MAL account securely |
| ✅ | PKCE Flow | Industry-standard OAuth2 with PKCE for maximum security |
| ✅ | Encrypted Storage | All credentials stored with OS-level encryption |
| ✅ | No Data Leaks | Your tokens never leave your local machine |

### 🎨 Beautiful Desktop App

| Status | Feature | Description |
|:---:|:---|:---|
| ✅ | Modern UI | Sleek dark theme with glassmorphism effects |
| ✅ | System Tray | Minimize to tray and keep running in background |
| ✅ | Responsive Design | Native feel with smooth 60fps animations |
| ✅ | Settings Dashboard | Easy configuration for all integrations |

### 🛡️ Security First

| Status | Feature | Description |
|:---:|:---|:---|
| ✅ | Local Only | WebSocket server binds to localhost only |
| ✅ | Token Authentication | Secure WebSocket connections with auto-generated tokens |
| ✅ | Rate Limiting | Built-in protection against abuse |
| ✅ | Input Validation | All user inputs sanitized and validated |
| ✅ | Safe Storage | API keys encrypted using Electron's safeStorage |

---

## 🏗️ | Architecture

```
foxcli/
├── 📦 app/                          # Electron Application
│   ├── 🖥️ src/
│   │   ├── ⚙️ main/                 # Main Process (Node.js)
│   │   │   ├── main.ts             # App entry point, Discord RPC, WebSocket
│   │   │   ├── store.ts            # Encrypted settings storage
│   │   │   ├── apiServer.ts        # REST API for website integration
│   │   │   ├── dataExporter.ts     # MAL/Steam data aggregation
│   │   │   └── preload.ts          # Secure IPC bridge
│   │   └── 🌐 renderer/            # Renderer Process (React)
│   │       ├── components/         # UI Components
│   │       │   ├── SettingsModal.tsx
│   │       │   ├── SteamLibrary.tsx
│   │       │   ├── MALConnect.tsx
│   │       │   └── Sidebar.tsx
│   │       └── services/           # API & State Management
│   │           ├── malApi.ts
│   │           └── tierListStore.ts
│   └── 📁 dist/                    # Compiled output
├── 🌐 extension/                   # Browser Extension (Chrome/Edge)
│   ├── manifest.json              # Manifest V3
│   ├── background.js              # WebSocket client
│   ├── content.js                 # Video detection
│   └── providers/                 # Site-specific scrapers
└── 🌍 website/                     # Personal Stats Website
    └── public/
        └── data.json              # Exported stats
```

---

## 🚀 | Quick Start

```bash
# 📥 Clone the repository
git clone https://github.com/Foxemsx/foxcli.git
cd foxcli

# 📦 Install dependencies
npm install

# 🏃 Run in development mode
npm run dev
```

---

## 🛠️ | Development

### 📜 Available Scripts

| Command | Description |
|:---|:---|
| `npm run dev` | 🎯 Development mode (hot reload) |
| `npm run build` | 🏗️ Build for production |
| `npm run build:renderer` | 🎨 Build only renderer |
| `npm run build:electron` | ⚙️ Build only main process |
| `npm run preview` | 👀 Preview production build |
| `npm run generate-icons` | 🖼️ Generate app icons |
| `npm run build:win` | 🪟 Build Windows installer |

### 🧰 Tech Stack

| Category | Technology | Version |
|:---|:---|:---|
| 🔲 **Framework** | Electron | 31 |
| ⚛️ **Frontend** | React | 18 |
| 🔷 **Language** | TypeScript | 5.0 |
| ⚡ **Build Tool** | Vite | 5 |
| 🎨 **Styling** | Tailwind CSS | - |
| 💾 **State** | Local React State | - |
| 🔌 **IPC** | Electron Context Bridge | - |
| 🔐 **Storage** | Electron safeStorage | - |
| 💬 **Discord** | discord-rpc | - |
| 🌐 **WebSocket** | ws | - |

---

## 🔌 | Integrations

### 📚 MyAnimeList (MAL)

```
┌─────────────────────────────────────────────────────────┐
│  ✓ OAuth2 authentication with PKCE                    │
│  ✓ User profile and statistics                         │
│  ✓ Anime list and ratings                              │
│  ✓ Currently watching status                           │
└─────────────────────────────────────────────────────────┘
```

### 💬 Discord

```
┌─────────────────────────────────────────────────────────┐
│  ✓ Rich Presence updates                               │
│  ✓ Real-time status sync                               │
│  ✓ Button links to streaming sites                    │
│  ✓ Custom idle status                                   │
└─────────────────────────────────────────────────────────┘
```

### 🎮 Steam

```
┌─────────────────────────────────────────────────────────┐
│  ✓ Library statistics via Steam Web API                │
│  ✓ Game detection via PowerShell                       │
│  ✓ Playtime tracking                                   │
│  ✓ Owned games count                                   │
└─────────────────────────────────────────────────────────┘
```

### 🌐 Browser Extension

```
┌─────────────────────────────────────────────────────────┐
│  ✓ Manifest V3 compliant                                │
│  ✓ WebSocket communication                             │
│  ✓ Video state detection                               │
│  ✓ Metadata extraction                                 │
│  ✓ Multi-site support                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 | Design Philosophy

### 🔒 Security
```
 ┌────────────────────────────────────────────────────┐
 │  🛡️ All sensitive data encrypted at rest          │
 │  🔑 No secrets hardcoded in source                │
 │  🏠 Local-only server bindings                   │
 │  ✅ Comprehensive input validation               │
 │  🚫 CSRF and XSS protection                       │
 └────────────────────────────────────────────────────┘
```

### ⚡ Performance
```
 ┌────────────────────────────────────────────────────┐
 │  ⏱️  Debounced Discord updates (150ms)            │
 │  📊 Rate-limited API calls                         │
 │  💾 Bounded memory caches                         │
 │  📦 Lazy loading of components                     │
 │  🔄 Efficient IPC communication                   │
 └────────────────────────────────────────────────────┘
```

### 🎯 UX
```
 ┌────────────────────────────────────────────────────┐
 │  📥 System tray integration                       │
 │  🚀 Auto-launch on startup                        │
 │  🔔 Notification support                           │
 │  ↙️  Minimize to tray behavior                    │
 │  👁️  Clear visual feedback                         │
 └────────────────────────────────────────────────────┘
```

---

## 📊 | Project Stats

<div align="center">

```
     ╔═══════════════════════════════════════════════════╗
     ║     📈 Project Statistics                         ║
     ╠═══════════════════════════════════════════════════╣
     ║  📝  Lines of Code    ➜    15,000+               ║
     ║  🧩  Components        ➜    30+                   ║
     ║  🔌  IPC Handlers     ➜    40+                  ║
     ║  🌐  API Endpoints    ➜    10+                  ║
     ║  🛡️  Security Layers  ➜    12+                  ║
     ╚═══════════════════════════════════════════════════╝
```

</div>

---

## 🔐 | Security Features

### ✅ Implemented

| # | Feature | Protection |
|:---:|:---|:---|
| 1 | OAuth2 State Validation | CSRF Protection |
| 2 | PKCE Code Challenge | S256 |
| 3 | Encrypted Credential Storage | OS-level encryption |
| 4 | Command Injection Prevention | Input sanitization |
| 5 | SSRF Protection | DNS validation |
| 6 | Rate Limiting | API endpoint protection |
| 7 | WebSocket Token Authentication | Secure connections |
| 8 | Input Sanitization | XSS prevention |
| 9 | CORS Origin Validation | Cross-origin protection |
| 10 | Security Headers | CSP, X-Frame-Options |

### 🏆 Best Practices

- 🔒 No secrets in source code
- 🔑 All tokens generated or user-provided
- 💾 OS-level encryption for storage
- ⚡ Principle of least privilege
- 🛡️ Defense in depth architecture

---

## 📝 | License

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**MIT License** — See the [LICENSE](LICENSE) file for details

```
┌─────────────────────────────────────────────────────────┐
│  ✅ Use this code for free, forever                    │
│  ✅ Modify it                                           │
│  ✅ Distribute it                                       │
│  ✅ Use in commercial projects                          │
│  ✅ Private use is allowed                              │
│  ⚠️  Include license and copyright notice              │
│  ⚠️  Can't hold the author liable                      │
│  ⚠️  No warranty                                        │
└─────────────────────────────────────────────────────────┘
```

> [!NOTE]
> While the license allows reuse, this codebase contains personal configurations and hardcoded values that require significant customization to work for others.

</div>

---

## 🙏 | Acknowledgments

<div align="center">

| Library | Description | Link |
|:---|:---|:---|
| 💬 Discord RPC | Discord Rich Presence | [GitHub](https://github.com/discordjs/RPC) |
| ⚡ Electron | Cross-platform desktop apps | [Website](https://electronjs.org) |
| 📚 Jikan API | Unofficial MyAnimeList API | [Website](https://jikan.moe) |
| 🎬 Framer Motion | React animations | [Website](https://framer.com/motion) |
| ✨ Lucide Icons | Beautiful icons | [Website](https://lucide.dev) |

</div>

---

## 🌐 | Connect

<div align="center">

|  |  |
|:---:|:---:|
| 🐙 **GitHub** | [![][GitHub badge]](https://github.com/Foxemsx) |
| 💬 **Discord** | [![][Discord badge]](https://discord.com/users/767347091873595433) |

[GitHub badge]: https://img.shields.io/badge/GitHub-@Foxemsx-181717?style=for-the-badge&logo=github
[Discord badge]: https://img.shields.io/badge/Discord-767347091873595433-5865F2?style=for-the-badge&logo=discord

</div>

---

<div align="center">

**Made with** 🦊 **and** ☕

*Powered by FoxCLI*

---

⭐ Star this repo if you found it useful!

</div>
