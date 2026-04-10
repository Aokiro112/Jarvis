/**
 * ╔═══════════════════════════════════════════════════════╗
 * ║          JARVIS AI - PERSONAL DESKTOP ASSISTANT       ║
 * ║          Powered by Groq API | Node.js Only           ║
 * ╚═══════════════════════════════════════════════════════╝
 */

'use strict';

require('dotenv').config();

const readline = require('readline');
const chalk    = require('chalk');
const figlet   = require('figlet');
const boxen    = require('boxen');
const path     = require('path');
const fs       = require('fs');

const AIBrain        = require('./core/brain');
const ExecutionEngine = require('./executor/engine');
const MemorySystem   = require('./memory/memory');
const WindowsManager = require('./windows/windowsManager');
const Scheduler      = require('./automation/scheduler');
const CommandHistory = require('./core/commandHistory');
const Logger         = require('./core/logger');
const Config         = require('./core/config');
const VoiceManager   = require('./voice/voiceManager');

// ──────────────────────────────────────────────
// Boot Banner
// ──────────────────────────────────────────────
function printBanner() {
  if (Config.SILENT_MODE) return;

  try {
    const title = figlet.textSync('J.A.R.V.I.S', {
      font: 'Big',
      horizontalLayout: 'default'
    });

    const banner = boxen(
      chalk.cyan(title) + '\n\n' +
      chalk.gray('  Just A Rather Very Intelligent System\n') +
      chalk.green('  ● ') + chalk.white('Powered by Groq AI + Node.js\n') +
      chalk.green('  ● ') + chalk.white('Windows Deep Integration Active\n') +
      chalk.green('  ● ') + chalk.white(`Model: ${Config.GROQ_MODEL}\n`) +
      chalk.yellow('\n  Type your command or say "' + Config.WAKE_WORD + '" to activate voice\n') +
      chalk.gray('  Type "help" for commands | "exit" to quit'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        title: ' JARVIS v2.0 ',
        titleAlignment: 'center'
      }
    );

    console.log(banner);
  } catch (e) {
    console.log(chalk.cyan('\n=== JARVIS AI ASSISTANT v2.0 ==='));
    console.log(chalk.gray('Powered by Groq API | Windows Edition\n'));
  }
}

// ──────────────────────────────────────────────
// Core Jarvis Class
// ──────────────────────────────────────────────
class Jarvis {
  constructor() {
    this.brain        = new AIBrain();
    this.executor     = new ExecutionEngine();
    this.memory       = new MemorySystem();
    this.windowsMgr   = new WindowsManager();
    this.scheduler    = new Scheduler();
    this.history      = new CommandHistory();
    this.voice        = new VoiceManager();
    this.logger       = Logger;
    this.isListening  = false;
    this.isProcessing = false;
    this.retryCount   = 0;
    this.rl           = null;
  }

  // ── Initialize all subsystems ──
  async initialize() {
    Logger.info('Initializing Jarvis subsystems...');

    await this.memory.initialize();
    await this.brain.initialize();
    await this.executor.initialize();
    await this.windowsMgr.initialize();
    await this.scheduler.initialize();

    if (Config.VOICE_MODE) {
      await this.voice.initialize();
    }

    printBanner();
    Logger.success('All systems operational. Ready for commands.');
    this.isListening = true;
  }

  // ── Start the main loop ──
  async start() {
    await this.initialize();
    this._startCLI();

    if (Config.VOICE_MODE) {
      this._startVoiceListener();
    }
  }

  // ── CLI Input Loop ──
  _startCLI() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('\nJARVIS ') + chalk.gray('▶ ')
    });

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      const command = input.trim();
      if (!command) {
        this.rl.prompt();
        return;
      }
      await this._handleInput(command);
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this._shutdown();
    });
  }

  // ── Voice Listener ──
  _startVoiceListener() {
    this.voice.startListening(async (transcription) => {
      if (!transcription) return;
      const lowerText = transcription.toLowerCase();

      // Wake word detection
      if (lowerText.includes(Config.WAKE_WORD.toLowerCase())) {
        const command = lowerText.replace(Config.WAKE_WORD.toLowerCase(), '').trim();
        if (command) {
          Logger.jarvis(`Voice command detected: "${command}"`);
          await this._handleInput(command);
        }
      }
    });
  }

  // ── Process a command ──
  async _handleInput(rawInput) {
    if (this.isProcessing) {
      Logger.warn('Already processing a command. Please wait...');
      return;
    }

    // Built-in meta commands
    const meta = this._handleMetaCommands(rawInput);
    if (meta) return;

    this.isProcessing = true;
    this.retryCount   = 0;

    try {
      await this._processCommand(rawInput);
    } catch (err) {
      Logger.error(`Fatal error: ${err.message}`);
      if (Config.DEBUG_MODE) console.error(err);
    } finally {
      this.isProcessing = false;
    }
  }

  // ── Meta / built-in commands ──
  _handleMetaCommands(input) {
    const cmd = input.toLowerCase();

    if (cmd === 'exit' || cmd === 'quit' || cmd === 'bye') {
      this._shutdown(); return true;
    }
    if (cmd === 'help') {
      this._showHelp(); return true;
    }
    if (cmd === 'history') {
      this._showHistory(); return true;
    }
    if (cmd === 'memory') {
      this._showMemory(); return true;
    }
    if (cmd === 'clear' || cmd === 'cls') {
      console.clear(); printBanner(); return true;
    }
    if (cmd === 'status') {
      this._showStatus(); return true;
    }
    if (cmd.startsWith('remember ')) {
      this._rememberAlias(input.substring(9)); return true;
    }
    if (cmd === 'debug on') {
      process.env.DEBUG_MODE = 'true'; Config.DEBUG_MODE = true;
      Logger.success('Debug mode ON'); return true;
    }
    if (cmd === 'debug off') {
      process.env.DEBUG_MODE = 'false'; Config.DEBUG_MODE = false;
      Logger.success('Debug mode OFF'); return true;
    }
    return false;
  }

  // ── Main AI Processing Pipeline ──
  async _processCommand(rawInput, isRetry = false) {
    // Load context
    const context = await this._buildContext();

    // Show thinking indicator
    if (!Config.SILENT_MODE) {
      process.stdout.write(chalk.gray('\n  ⚙ Processing') + chalk.yellow(' ') + chalk.gray('...\n'));
    }

    // AI parse the command
    let parsed;
    try {
      parsed = await this.brain.parseCommand(rawInput, context);
    } catch (aiErr) {
      Logger.error(`AI parsing failed: ${aiErr.message}`);
      if (this.retryCount < Config.MAX_RETRIES) {
        this.retryCount++;
        Logger.warn(`Retrying... (${this.retryCount}/${Config.MAX_RETRIES})`);
        return await this._processCommand(rawInput, true);
      }
      return;
    }

    if (Config.DEBUG_MODE) {
      console.log(chalk.gray('\n  [DEBUG] Parsed Action:'));
      console.log(chalk.gray(JSON.stringify(parsed, null, 2)));
    }

    // Log AI response
    if (!Config.SILENT_MODE && parsed.response) {
      console.log('\n' + chalk.cyan('  JARVIS: ') + chalk.white(parsed.response));
    }

    // Execute if actions present
    if (parsed.actions && parsed.actions.length > 0) {
      for (const action of parsed.actions) {
        const result = await this._executeAction(action, rawInput);
        if (!result.success && this.retryCount < Config.MAX_RETRIES) {
          this.retryCount++;
          Logger.warn(`Action failed, asking AI to retry... (${this.retryCount}/${Config.MAX_RETRIES})`);
          const retryParsed = await this.brain.reinterpretFailure(rawInput, action, result.error, context);
          if (retryParsed && retryParsed.actions) {
            for (const retryAction of retryParsed.actions) {
              await this._executeAction(retryAction, rawInput);
            }
          }
        }
      }
    }

    // Save to history & memory
    this.history.add(rawInput, parsed);
    if (parsed.memory_updates) {
      for (const [key, val] of Object.entries(parsed.memory_updates)) {
        await this.memory.set(key, val);
      }
    }
  }

  // ── Execute a single action ──
  async _executeAction(action, originalInput) {
    try {
      Logger.action(action.action, action);
      const result = await this.executor.execute(action);
      if (result.success && !Config.SILENT_MODE) {
        Logger.success(`✓ ${action.action} completed`);
      }
      return result;
    } catch (err) {
      Logger.error(`Execution error [${action.action}]: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ── Build context for AI ──
  async _buildContext() {
    const memories    = await this.memory.getAll();
    const recentHist  = this.history.getRecent(5);
    const activeWindow = await this.windowsMgr.getActiveWindow().catch(() => null);

    return {
      memories,
      recent_commands: recentHist,
      active_window:   activeWindow,
      timestamp:       new Date().toISOString(),
      system_info:     await this.windowsMgr.getSystemInfo().catch(() => ({}))
    };
  }

  // ── Show help ──
  _showHelp() {
    const helpText = `
${chalk.cyan('╔══════════════════════════════════════════╗')}
${chalk.cyan('║')}          ${chalk.white('JARVIS COMMAND GUIDE')}            ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════╝')}

${chalk.yellow('SYSTEM COMMANDS:')}
  ${chalk.green('shutdown')}        - Shutdown the PC
  ${chalk.green('restart')}         - Restart the PC
  ${chalk.green('sleep')}           - Put PC to sleep
  ${chalk.green('lock')}            - Lock the screen

${chalk.yellow('APP CONTROL:')}
  ${chalk.green('open notepad')}            - Open Notepad
  ${chalk.green('open chrome')}             - Open Chrome
  ${chalk.green('open vs code')}            - Open VS Code
  ${chalk.green('close notepad')}           - Close Notepad
  ${chalk.green('kill <process>')}          - Kill a process

${chalk.yellow('CHROME PROFILES:')}
  ${chalk.green('open my work gmail')}      - Open Gmail in work profile
  ${chalk.green('open second account')}     - Open second Chrome profile
  ${chalk.green('open chrome profile 2')}   - Open specific Chrome profile

${chalk.yellow('FILE SYSTEM:')}
  ${chalk.green('create file test.txt')}    - Create a file
  ${chalk.green('delete file test.txt')}    - Delete a file
  ${chalk.green('open downloads folder')}   - Open Downloads
  ${chalk.green('list files in desktop')}   - List desktop files

${chalk.yellow('WINDOW MANAGEMENT:')}
  ${chalk.green('minimize all windows')}    - Minimize all windows
  ${chalk.green('maximize chrome')}         - Maximize Chrome window
  ${chalk.green('switch to notepad')}       - Focus Notepad

${chalk.yellow('SYSTEM INFO:')}
  ${chalk.green('what is my cpu usage')}    - Get CPU usage
  ${chalk.green('how much ram is free')}    - Get RAM info
  ${chalk.green('disk space')}              - Get disk info
  ${chalk.green('what time is it')}         - Current time

${chalk.yellow('AUTOMATION:')}
  ${chalk.green('type hello world')}        - Type text
  ${chalk.green('take screenshot')}         - Capture screen
  ${chalk.green('scroll down')}             - Scroll down
  ${chalk.green('click at 500 300')}        - Click at coordinates

${chalk.yellow('MEMORY:')}
  ${chalk.green('remember my work = Profile 2')} - Save alias
  ${chalk.green('memory')}                  - View stored memory
  ${chalk.green('history')}                 - View command history

${chalk.yellow('META:')}
  ${chalk.green('help')}            - Show this help
  ${chalk.green('clear/cls')}       - Clear terminal
  ${chalk.green('status')}          - System status
  ${chalk.green('debug on/off')}    - Toggle debug mode
  ${chalk.green('exit')}            - Exit Jarvis
`;
    console.log(helpText);
  }

  // ── Show command history ──
  _showHistory() {
    const hist = this.history.getRecent(20);
    console.log(chalk.cyan('\n  Command History:'));
    if (!hist.length) {
      console.log(chalk.gray('  No commands yet.'));
      return;
    }
    hist.forEach((h, i) => {
      console.log(chalk.gray(`  ${i + 1}. `) + chalk.white(h.command) + chalk.gray(` (${h.timestamp})`));
    });
  }

  // ── Show memory ──
  async _showMemory() {
    const data = await this.memory.getAll();
    console.log(chalk.cyan('\n  Stored Memory:'));
    if (!Object.keys(data).length) {
      console.log(chalk.gray('  No memory stored yet.'));
      return;
    }
    for (const [k, v] of Object.entries(data)) {
      console.log(chalk.gray('  ') + chalk.green(k) + chalk.gray(' → ') + chalk.white(JSON.stringify(v)));
    }
  }

  // ── Remember alias ──
  async _rememberAlias(input) {
    const parts = input.split('=').map(s => s.trim());
    if (parts.length === 2) {
      await this.memory.set(parts[0], parts[1]);
      Logger.success(`Remembered: "${parts[0]}" = "${parts[1]}"`);
    } else {
      Logger.warn('Usage: remember <key> = <value>');
    }
  }

  // ── Show status ──
  async _showStatus() {
    const info = await this.windowsMgr.getSystemInfo().catch(() => ({}));
    const activeWin = await this.windowsMgr.getActiveWindow().catch(() => 'Unknown');

    console.log(chalk.cyan('\n  System Status:'));
    console.log(chalk.gray('  ─────────────────────────────'));
    console.log(chalk.green('  ● ') + chalk.gray('Status: ') + chalk.white('Online'));
    console.log(chalk.green('  ● ') + chalk.gray('Active Window: ') + chalk.white(activeWin || 'Unknown'));
    console.log(chalk.green('  ● ') + chalk.gray('AI Model: ') + chalk.white(Config.GROQ_MODEL));
    console.log(chalk.green('  ● ') + chalk.gray('Voice Mode: ') + chalk.white(Config.VOICE_MODE ? 'ON' : 'OFF'));
    console.log(chalk.green('  ● ') + chalk.gray('Debug Mode: ') + chalk.white(Config.DEBUG_MODE ? 'ON' : 'OFF'));
    console.log(chalk.green('  ● ') + chalk.gray('CPU Usage: ') + chalk.white((info.cpu || '?') + '%'));
    console.log(chalk.green('  ● ') + chalk.gray('RAM Free: ') + chalk.white((info.ramFree || '?') + ' GB'));
    console.log(chalk.green('  ● ') + chalk.gray('Memory Entries: ') + chalk.white(Object.keys(await this.memory.getAll()).length));
    console.log(chalk.green('  ● ') + chalk.gray('Commands Run: ') + chalk.white(this.history.count()));
  }

  // ── Graceful shutdown ──
  _shutdown() {
    console.log(chalk.cyan('\n  Goodbye! JARVIS shutting down...'));
    Logger.info('Jarvis terminated by user.');
    if (this.rl) this.rl.close();
    process.exit(0);
  }
}

// ──────────────────────────────────────────────
// Entry Point
// ──────────────────────────────────────────────
(async () => {
  // Validate API key
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
    console.log(chalk.red('\n  ✗ ERROR: GROQ_API_KEY not set!'));
    console.log(chalk.yellow('  1. Copy .env.example to .env'));
    console.log(chalk.yellow('  2. Add your Groq API key from https://console.groq.com'));
    console.log(chalk.yellow('  3. Run again with: node index.js\n'));
    process.exit(1);
  }

  const jarvis = new Jarvis();

  // Graceful error handling
  process.on('uncaughtException', (err) => {
    Logger.error(`Uncaught exception: ${err.message}`);
    if (Config.DEBUG_MODE) console.error(err);
  });

  process.on('unhandledRejection', (reason) => {
    Logger.error(`Unhandled rejection: ${reason}`);
  });

  process.on('SIGINT', () => {
    jarvis._shutdown();
  });

  await jarvis.start();
})();
