'use strict';

const https   = require('https');
const Config  = require('./config');
const Logger  = require('./logger');

/**
 * AIBrain - Parses natural language into structured JSON actions
 * using the Groq API (LLaMA 3 / Mixtral)
 */
class AIBrain {
  constructor() {
    this.conversationHistory = [];
    this.systemPrompt = this._buildSystemPrompt();
  }

  async initialize() {
    Logger.info('AI Brain initializing...');
    // Verify API connectivity
    try {
      await this._callGroq([{ role: 'user', content: 'ping' }], 10);
      Logger.success('Groq API connected successfully.');
    } catch (err) {
      Logger.warn(`Groq API test failed (will retry on first command): ${err.message}`);
    }
  }

  // ── Build the master system prompt ──
  _buildSystemPrompt() {
    return `You are JARVIS, an advanced AI personal desktop assistant running on Windows.
You parse natural language commands into structured JSON action plans.

RESPONSE FORMAT:
Always respond with a valid JSON object (no markdown, no backticks, pure JSON):
{
  "response": "Brief human-readable response (1 sentence)",
  "actions": [
    {
      "action": "action_name",
      "param1": "value1",
      ...
    }
  ],
  "memory_updates": {
    "key": "value"
  }
}

If no system action is needed (e.g. answering a question), set "actions": [].
If storing something in memory, use "memory_updates".

AVAILABLE ACTIONS:

APP CONTROL:
- open_app: { "app": "notepad|chrome|vscode|spotify|discord|steam|calculator|paint|explorer|cmd|powershell|wordpad|edge|firefox|<any>" }
- close_app: { "app": "process_name.exe or window title" }
- kill_process: { "process": "process_name" }

CHROME PROFILES:
- open_chrome_profile: { "profile": "Profile 1|Profile 2|...", "url": "https://..." }
  Use this when user says "work account", "second profile", "my gmail", etc.

FILE SYSTEM:
- create_file: { "path": "C:\\Users\\...", "content": "optional content" }
- delete_file: { "path": "C:\\Users\\..." }
- open_file: { "path": "C:\\Users\\..." }
- open_folder: { "path": "C:\\Users\\..." }
- list_files: { "path": "C:\\Users\\...", "display": true }
- copy_file: { "source": "...", "destination": "..." }
- move_file: { "source": "...", "destination": "..." }
- rename_file: { "path": "...", "newName": "..." }
- create_folder: { "path": "..." }
- delete_folder: { "path": "..." }
- write_to_file: { "path": "...", "content": "...", "append": false }

WINDOW MANAGEMENT:
- minimize_window: { "title": "window title or 'all'" }
- maximize_window: { "title": "window title" }
- close_window: { "title": "window title" }
- focus_window: { "title": "window title" }
- list_windows: {}
- tile_windows: { "layout": "left|right|top|bottom" }

SYSTEM COMMANDS:
- shutdown: { "delay": 0 }
- restart: { "delay": 0 }
- sleep: {}
- lock_screen: {}
- logout: {}
- set_volume: { "level": 50 }
- mute_volume: {}
- unmute_volume: {}
- brightness: { "level": 70 }
- empty_recycle_bin: {}

UI AUTOMATION:
- type_text: { "text": "text to type" }
- press_key: { "key": "enter|tab|escape|ctrl+c|alt+f4|win+d|..." }
- click: { "x": 500, "y": 300, "button": "left|right|double" }
- move_mouse: { "x": 500, "y": 300 }
- scroll: { "direction": "up|down", "amount": 3 }
- hotkey: { "keys": ["ctrl", "c"] }
- copy_to_clipboard: { "text": "..." }

SCREENSHOTS:
- take_screenshot: { "path": "optional save path" }
- take_screenshot_region: { "x": 0, "y": 0, "width": 800, "height": 600 }

SYSTEM INFO:
- get_system_info: {}
- get_battery: {}
- get_network_info: {}
- get_running_processes: {}
- get_disk_info: {}

BROWSER AUTOMATION:
- open_url: { "url": "https://...", "browser": "chrome|edge|firefox" }
- search_web: { "query": "search term", "engine": "google|bing|youtube" }

SCHEDULER:
- schedule_task: { "command": "...", "at": "HH:MM", "repeat": "daily|weekly|once" }
- list_tasks: {}
- cancel_task: { "id": "task_id" }

RUN COMMAND:
- run_powershell: { "command": "powershell command here" }
- run_cmd: { "command": "cmd command here" }

SHORTCUTS:
- open_settings: {}
- open_control_panel: {}
- open_task_manager: {}
- open_device_manager: {}

SPECIAL:
- speak: { "text": "text to say via TTS" }
- notify: { "title": "...", "message": "..." }
- set_wallpaper: { "path": "image path" }
- set_environment_variable: { "name": "...", "value": "...", "scope": "user|machine" }

MEMORY CONTEXT RULES:
- If user says "my work account" or "work gmail" → map to Chrome Profile 2 (or memory value)
- If user says "main account" → map to Chrome Profile 1
- If user says "coding setup" → open VS Code + Chrome + any other remembered apps
- If the user has stored preferences in memory, use them

WINDOWS PATHS:
- Desktop: C:\\Users\\{username}\\Desktop
- Downloads: C:\\Users\\{username}\\Downloads
- Documents: C:\\Users\\{username}\\Documents
- AppData: C:\\Users\\{username}\\AppData
- Use %USERPROFILE%, %DESKTOP%, %DOWNLOADS% shorthands

MULTI-STEP COMMANDS:
If the command requires multiple steps, return multiple actions in the "actions" array.
Example: "open my coding setup" → [open_app(vscode), open_chrome_profile(Profile1), open_app(spotify)]

Be intelligent: infer intent, use memory context, never ask for confirmation.`;
  }

  // ── Parse a natural language command ──
  async parseCommand(input, context = {}) {
    const contextStr = JSON.stringify({
      memories:        context.memories || {},
      recent_commands: context.recent_commands || [],
      active_window:   context.active_window || null,
      timestamp:       context.timestamp || new Date().toISOString()
    });

    const messages = [
      ...this.conversationHistory.slice(-6), // keep last 3 exchanges
      {
        role: 'user',
        content: `CONTEXT: ${contextStr}\n\nUSER COMMAND: "${input}"\n\nRespond with JSON only.`
      }
    ];

    const raw = await this._callGroq(messages);
    const parsed = this._safeParseJSON(raw);

    // Update short-term memory
    this.conversationHistory.push(
      { role: 'user', content: `USER COMMAND: "${input}"` },
      { role: 'assistant', content: raw }
    );
    // Keep history bounded
    if (this.conversationHistory.length > 12) {
      this.conversationHistory = this.conversationHistory.slice(-12);
    }

    return parsed;
  }

  // ── Re-interpret a failed command ──
  async reinterpretFailure(originalInput, failedAction, error, context) {
    const messages = [
      {
        role: 'user',
        content: `The following command failed to execute:
Original input: "${originalInput}"
Failed action: ${JSON.stringify(failedAction)}
Error: ${error}
Context: ${JSON.stringify(context.memories || {})}

Please provide an alternative approach to accomplish what the user wanted.
Respond with JSON only.`
      }
    ];

    const raw = await this._callGroq(messages);
    return this._safeParseJSON(raw);
  }

  // ── Ask Groq a free-form question ──
  async ask(question) {
    const messages = [{ role: 'user', content: question }];
    return await this._callGroq(messages, 1024);
  }

  // ── Core Groq API call ──
  async _callGroq(messages, maxTokens = 1000) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model:      Config.GROQ_MODEL,
        max_tokens: maxTokens,
        messages:   [
          { role: 'system', content: this.systemPrompt },
          ...messages
        ],
        temperature: 0.1,
        top_p: 1,
        stream: false
      });

      const options = {
        hostname: 'api.groq.com',
        path:     '/openai/v1/chat/completions',
        method:   'POST',
        headers:  {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${Config.GROQ_API_KEY}`,
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message || 'Groq API error'));
              return;
            }
            const content = json.choices?.[0]?.message?.content || '';
            resolve(content);
          } catch (e) {
            reject(new Error(`Failed to parse Groq response: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Groq API timeout (30s)'));
      });

      req.write(body);
      req.end();
    });
  }

  // ── Safe JSON parse with fallback ──
  _safeParseJSON(raw) {
    try {
      // Strip markdown fences if present
      let clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

      // Find first { to last }
      const start = clean.indexOf('{');
      const end   = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        clean = clean.substring(start, end + 1);
      }

      return JSON.parse(clean);
    } catch (_) {
      // Fallback: treat raw as a plain response
      return {
        response: raw.substring(0, 200),
        actions: [],
        memory_updates: {}
      };
    }
  }
}

module.exports = AIBrain;
