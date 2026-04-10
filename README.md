# 🤖 JARVIS AI - Advanced Personal Desktop Assistant

> **Just A Rather Very Intelligent System**
> Powered by Groq API | Built with Node.js only | Windows Exclusive

---

## 🚀 Features

| Category | Capabilities |
|----------|-------------|
| **AI Brain** | Groq LLaMA 3 / Mixtral powered NLP → JSON action conversion |
| **App Control** | Open/close/kill any app, Chrome multi-profile support |
| **File System** | Create, delete, move, copy, list files and folders |
| **Window Management** | Minimize, maximize, focus, tile, close windows |
| **System Control** | Shutdown, restart, sleep, lock, volume, brightness |
| **UI Automation** | Mouse clicks, keyboard typing, hotkeys, scrolling |
| **Browser Control** | Open URLs, web search in any browser/engine |
| **Screenshots** | Full screen & region capture via PowerShell .NET |
| **Voice Input** | Windows SAPI dictation with wake word detection |
| **Memory System** | Persistent JSON store for preferences & aliases |
| **Scheduler** | Schedule tasks at specific times (daily/weekly/once) |
| **Plugin System** | Extensible via /plugins directory |
| **Auto-Start** | Registry integration for Windows boot |

---

## 📦 Prerequisites

- **Windows 10/11** (64-bit)
- **Node.js 18+** → https://nodejs.org
- **Groq API Key** (free) → https://console.groq.com
- **Google Chrome** (for profile features)

---

## ⚡ Quick Start

### 1. Install & Setup

```bash
# Clone / extract the project
cd jarvis

# Run the interactive setup wizard
node scripts/setup.js

# OR manually copy .env.example to .env and fill in your key
copy .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 2. Install Dependencies

```bash
npm install
```

> **Note on robotjs**: If `robotjs` fails to build (requires Python/VS Build Tools),
> Jarvis automatically falls back to PowerShell UI automation — no manual fix needed.

### 3. Launch Jarvis

```bash
node index.js
```

### 4. Optional: Auto-start on Windows Boot

```bash
node scripts/install-startup.js

# To uninstall:
node scripts/install-startup.js --uninstall
```

---

## 🗣️ Command Examples

### App Control
```
open chrome
open vs code
open spotify
close notepad
kill chrome
open calculator
open file explorer
```

### Chrome Profiles
```
open my work gmail
open second account and go to youtube
open chrome profile 2
open personal chrome
open work account and go to https://jira.company.com
```

### File System
```
create file test.txt on desktop
delete file C:\Users\Me\test.txt
open downloads folder
list files in documents
copy file from downloads to desktop
create folder projects on desktop
```

### Window Management
```
minimize all windows
maximize chrome
focus notepad
close calculator window
list open windows
```

### System Commands
```
shutdown the pc
restart in 30 seconds
put the computer to sleep
lock my screen
set volume to 50
mute the sound
empty recycle bin
```

### UI Automation
```
type hello world
press ctrl+c
press alt+f4
click at 500 300
scroll down 5
take a screenshot
copy "important text" to clipboard
```

### Web & Browser
```
search youtube for lofi music
open google.com in edge
search github for nodejs projects
go to gmail.com
```

### System Info
```
what is my cpu usage
how much ram is free
show disk info
list running processes
show network info
what time is it
```

### Memory & Preferences
```
remember my work = Profile 2
remember coding setup = vscode chrome spotify
memory
history
```

### Scheduling
```
schedule "take screenshot" at 09:00 daily
schedule "shutdown" at 22:00 once
list scheduled tasks
cancel task task_1234567890
```

### Natural Language (AI interprets)
```
open my second chrome account and go to gmail
set up my coding environment
turn off the lights   → (asks for clarification)
play music on spotify
make the screen brighter
open the project folder I was working on
```

---

## 📁 Project Structure

```
jarvis/
├── index.js                    ← Main entry point
├── package.json
├── .env                        ← Your configuration (create from .env.example)
├── .env.example                ← Configuration template
│
├── core/
│   ├── brain.js                ← Groq AI: NLP → JSON action parser
│   ├── config.js               ← Centralized configuration
│   ├── logger.js               ← Colored terminal + file logging
│   └── commandHistory.js       ← Persistent command history
│
├── executor/
│   ├── engine.js               ← Main action router / dispatcher
│   ├── appController.js        ← Open/close applications
│   ├── chromeController.js     ← Chrome multi-profile launcher
│   ├── fileController.js       ← File system operations
│   ├── windowController.js     ← Window management (P/Invoke)
│   ├── systemController.js     ← System commands (shutdown, volume, etc.)
│   ├── uiAutomation.js         ← Mouse & keyboard automation
│   ├── browserController.js    ← URL opening & web search
│   ├── screenshotController.js ← Screen capture
│   └── powerShellController.js ← Core PS/CMD execution engine
│
├── windows/
│   └── windowsManager.js       ← Windows OS integration layer
│
├── voice/
│   └── voiceManager.js         ← Windows SAPI voice recognition
│
├── memory/
│   ├── memory.js               ← Persistent JSON key-value store
│   ├── jarvis_memory.json      ← (auto-created) stored preferences
│   ├── command_history.json    ← (auto-created) command log
│   └── scheduled_tasks.json   ← (auto-created) scheduled tasks
│
├── automation/
│   ├── scheduler.js            ← Background task scheduler
│   └── automationEngine.js     ← Multi-step automation sequences
│
├── plugins/
│   ├── pluginManager.js        ← Plugin loader
│   └── _example_plugin.js     ← (auto-created) example plugin
│
├── scripts/
│   ├── setup.js                ← Interactive setup wizard
│   └── install-startup.js     ← Windows startup registration
│
└── logs/
    └── jarvis_YYYY-MM-DD.log  ← (auto-created) daily logs
```

---

## 🔌 Creating Plugins

Create a `.js` file in the `/plugins` folder:

```javascript
module.exports = {
  name: 'my_plugin',
  description: 'My custom Jarvis plugin',

  actions: {
    my_custom_action: async (action) => {
      console.log('Custom action executed!', action);
      return { success: true };
    }
  }
};
```

Then tell the AI about it naturally:
```
perform my_custom_action
```

---

## ⚙️ Configuration (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | *(required)* | Your Groq API key |
| `GROQ_MODEL` | `llama3-70b-8192` | AI model to use |
| `VOICE_MODE` | `false` | Enable voice input |
| `SILENT_MODE` | `false` | Minimal terminal output |
| `DEBUG_MODE` | `false` | Verbose debug logging |
| `AUTO_START` | `false` | Register Windows startup |
| `WAKE_WORD` | `jarvis` | Voice activation trigger |
| `HISTORY_LIMIT` | `100` | Max command history entries |
| `MAX_RETRIES` | `3` | AI retry attempts on failure |
| `CHROME_PATH` | *(auto)* | Path to chrome.exe |

---

## 🎙️ Voice Mode

Enable voice in `.env`:
```
VOICE_MODE=true
WAKE_WORD=jarvis
```

Speak commands after the wake word:
```
"Jarvis, open chrome"
"Jarvis, what is my CPU usage"
"Jarvis, shut down the computer"
```

---

## 🧠 How the AI Works

```
User Input → AIBrain (Groq LLaMA 3)
                ↓
         Parses to JSON:
         {
           "response": "Opening Chrome with Profile 2...",
           "actions": [
             { "action": "open_chrome_profile",
               "profile": "Profile 2",
               "url": "https://mail.google.com" }
           ],
           "memory_updates": {
             "chrome_profile_work": "Profile 2"
           }
         }
                ↓
         ExecutionEngine
                ↓
         ChromeController.openProfile()
                ↓
         PowerShell: Start-Process chrome.exe --profile-directory="Profile 2"
```

---

## 🛡️ Security Notes

- All execution is **local only** — no remote access
- Destructive commands (shutdown, delete) require **clear explicit intent**
- API key is stored only in your local `.env` file
- Command history and memory are stored locally in `/memory`

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| `GROQ_API_KEY not set` | Copy `.env.example` to `.env`, add your key |
| `robotjs build failed` | Safe to ignore — PS automation is used automatically |
| `Chrome profiles not found` | Check `CHROME_PROFILES_DIR` in `.env` |
| `Voice not working` | Check microphone permissions in Windows Settings |
| `Permission denied on startup` | Run `install-startup.js` as Administrator |
| Commands not executing | Enable `DEBUG_MODE=true` in `.env` for verbose logs |

---

## 📜 License

MIT — Free to use, modify, and extend.

---

*Built with Node.js | Powered by Groq API | Windows Only*
#   J a r v i s  
 