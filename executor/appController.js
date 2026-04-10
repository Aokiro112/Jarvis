'use strict';

const PowerShellController = require('./powerShellController');
const Logger = require('../core/logger');
const Config = require('../core/config');

class AppController {
  constructor() {
    this.ps = new PowerShellController();
  }

  // ── Open an application ──
  async openApp({ app }) {
    const target = (app || '').toLowerCase().trim();
    Logger.info(`Opening app: ${target}`);

    // Check known aliases first
    const knownPath = this._resolveAppPath(target);

    if (knownPath) {
      await this.ps.startProcess(knownPath);
    } else {
      // Try Start-Process with the raw name
      const result = await this.ps.runPowerShell({
        command: `Start-Process "${app}"`
      });

      if (!result.success) {
        // Final fallback: try via explorer / Shell
        await this.ps.runPowerShell({
          command: `[System.Diagnostics.Process]::Start("${app}")`
        });
      }
    }

    return { success: true };
  }

  // ── Close an app by window title or process name ──
  async closeApp({ app }) {
    Logger.info(`Closing app: ${app}`);

    // Try by process name first
    const processName = app.replace('.exe', '');
    const result = await this.ps.runPowerShell({
      command: `Stop-Process -Name "${processName}" -Force -ErrorAction SilentlyContinue`
    });

    if (!result.success) {
      // Try by window title
      await this.ps.runPowerShell({
        command: `Get-Process | Where-Object { $_.MainWindowTitle -like "*${app}*" } | Stop-Process -Force -ErrorAction SilentlyContinue`
      });
    }

    return { success: true };
  }

  // ── Kill process by name ──
  async killProcess({ process: procName }) {
    Logger.info(`Killing process: ${procName}`);
    await this.ps.runPowerShell({
      command: `Stop-Process -Name "${procName.replace('.exe', '')}" -Force -ErrorAction SilentlyContinue; taskkill /F /IM "${procName}" /T 2>$null`
    });
    return { success: true };
  }

  // ── Resolve friendly names to executable paths ──
  _resolveAppPath(name) {
    const aliases = {
      notepad:        'notepad.exe',
      paint:          'mspaint.exe',
      calculator:     'calc.exe',
      calc:           'calc.exe',
      explorer:       'explorer.exe',
      'file explorer':'explorer.exe',
      'task manager': 'taskmgr.exe',
      taskmgr:        'taskmgr.exe',
      cmd:            'cmd.exe',
      'command prompt':'cmd.exe',
      powershell:     'powershell.exe',
      wordpad:        'wordpad.exe',
      'vs code':      'code',
      vscode:         'code',
      'visual studio code': 'code',
      chrome:         Config.CHROME_PATH,
      'google chrome': Config.CHROME_PATH,
      edge:           'msedge.exe',
      'microsoft edge': 'msedge.exe',
      firefox:        Config.APP_PATHS.firefox,
      spotify:        Config.APP_PATHS.spotify,
      discord:        Config.APP_PATHS.discord,
      steam:          Config.APP_PATHS.steam,
      vlc:            Config.APP_PATHS.vlc,
      snipping:       'SnippingTool.exe',
      'snipping tool':'SnippingTool.exe',
      magnifier:      'magnify.exe',
      'on-screen keyboard': 'osk.exe',
      osk:            'osk.exe',
      regedit:        'regedit.exe',
      mspaint:        'mspaint.exe',
      winrar:         'C:\\Program Files\\WinRAR\\WinRAR.exe',
      '7zip':         'C:\\Program Files\\7-Zip\\7z.exe',
      obs:            'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
      zoom:           `${process.env.APPDATA}\\Zoom\\bin\\Zoom.exe`,
      teams:          `${process.env.LOCALAPPDATA}\\Microsoft\\Teams\\current\\Teams.exe`,
      slack:          `${process.env.LOCALAPPDATA}\\slack\\slack.exe`,
      telegram:       `${process.env.APPDATA}\\Telegram Desktop\\Telegram.exe`,
      whatsapp:       `${process.env.LOCALAPPDATA}\\WhatsApp\\WhatsApp.exe`,
      excel:          'EXCEL.EXE',
      word:           'WINWORD.EXE',
      powerpoint:     'POWERPNT.EXE',
      outlook:        'OUTLOOK.EXE',
      'ms word':      'WINWORD.EXE',
      'ms excel':     'EXCEL.EXE',
    };

    return aliases[name] || null;
  }
}

module.exports = AppController;
