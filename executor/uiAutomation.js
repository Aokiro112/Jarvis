'use strict';

const PowerShellController = require('./powerShellController');
const Logger = require('../core/logger');

/**
 * UIAutomation
 * Mouse + keyboard automation using PowerShell SendKeys / robotjs (if installed)
 */
class UIAutomation {
  constructor() {
    this.ps = new PowerShellController();
    this.robot = null;

    // Try to load robotjs (optional)
    try {
      this.robot = require('robotjs');
      Logger.info('robotjs loaded for UI automation.');
    } catch (_) {
      Logger.info('robotjs not available. Using PowerShell automation.');
    }
  }

  // ── Type text ──
  async typeText({ text }) {
    if (this.robot) {
      this.robot.typeString(text);
    } else {
      // Escape special chars for PS SendKeys
      const escaped = text
        .replace(/\+/g, '{+}')
        .replace(/\^/g, '{^}')
        .replace(/~/g, '{~}')
        .replace(/\{/g, '{{}')
        .replace(/\}/g, '{}}');

      await this.ps.runPowerShell({
        command: `(New-Object -ComObject WScript.Shell).SendKeys("${escaped}")`
      });
    }
    return { success: true };
  }

  // ── Press a key or combo ──
  async pressKey({ key }) {
    if (this.robot) {
      const mapped = this._mapKeyForRobot(key);
      if (mapped.includes('+')) {
        const parts = mapped.split('+');
        this.robot.keyTap(parts[parts.length - 1], parts.slice(0, -1));
      } else {
        this.robot.keyTap(mapped);
      }
    } else {
      const mapped = this._mapKeyForSendKeys(key);
      await this.ps.runPowerShell({
        command: `(New-Object -ComObject WScript.Shell).SendKeys("${mapped}")`
      });
    }
    return { success: true };
  }

  // ── Hotkey (e.g. ctrl+c) ──
  async hotkey({ keys }) {
    const keyArr = Array.isArray(keys) ? keys : [keys];

    if (this.robot) {
      const main = keyArr[keyArr.length - 1];
      const mods = keyArr.slice(0, -1);
      this.robot.keyTap(main, mods);
    } else {
      const mapped = keyArr.map(k => this._mapKeyForSendKeys(k)).join('');
      await this.ps.runPowerShell({
        command: `(New-Object -ComObject WScript.Shell).SendKeys("${mapped}")`
      });
    }
    return { success: true };
  }

  // ── Mouse click ──
  async click({ x, y, button = 'left' }) {
    if (this.robot) {
      this.robot.moveMouse(x, y);
      await this._sleep(50);
      if (button === 'double') {
        this.robot.mouseClick('left', true);
      } else {
        this.robot.mouseClick(button === 'right' ? 'right' : 'left');
      }
    } else {
      const btn = button === 'right' ? 2 : 1;
      const clicks = button === 'double' ? 2 : 1;
      const script = `
Add-Type @"
using System.Runtime.InteropServices;
public class Mouse {
  [DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int e);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
}
"@
[Mouse]::SetCursorPos(${x}, ${y})
Start-Sleep -Milliseconds 50
for ($i = 0; $i -lt ${clicks}; $i++) {
  [Mouse]::mouse_event(${btn === 2 ? '8' : '2'}, 0, 0, 0, 0)
  [Mouse]::mouse_event(${btn === 2 ? '16' : '4'}, 0, 0, 0, 0)
  Start-Sleep -Milliseconds 50
}`;
      await this.ps.runPowerShell({ command: script });
    }
    return { success: true };
  }

  // ── Move mouse ──
  async moveMouse({ x, y }) {
    if (this.robot) {
      this.robot.moveMouse(x, y);
    } else {
      const script = `
Add-Type @"
using System.Runtime.InteropServices;
public class MouseMover {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
}
"@
[MouseMover]::SetCursorPos(${x}, ${y})`;
      await this.ps.runPowerShell({ command: script });
    }
    return { success: true };
  }

  // ── Scroll ──
  async scroll({ direction = 'down', amount = 3 }) {
    if (this.robot) {
      this.robot.scrollMouse(0, direction === 'down' ? -amount : amount);
    } else {
      const delta = direction === 'down' ? -120 * amount : 120 * amount;
      const script = `
Add-Type @"
using System.Runtime.InteropServices;
public class ScrollHelper {
  [DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int e);
}
"@
[ScrollHelper]::mouse_event(0x800, 0, 0, ${delta}, 0)`;
      await this.ps.runPowerShell({ command: script });
    }
    return { success: true };
  }

  // ── Copy text to clipboard ──
  async copyToClipboard({ text }) {
    await this.ps.runPowerShell({
      command: `Set-Clipboard -Value '${text.replace(/'/g, "''")}'`
    });
    return { success: true };
  }

  // ── Helpers ──
  _mapKeyForSendKeys(key) {
    const map = {
      'ctrl':     '^',
      'alt':      '%',
      'shift':    '+',
      'enter':    '{ENTER}',
      'tab':      '{TAB}',
      'escape':   '{ESC}',
      'esc':      '{ESC}',
      'backspace':'{BS}',
      'delete':   '{DEL}',
      'home':     '{HOME}',
      'end':      '{END}',
      'pageup':   '{PGUP}',
      'pagedown': '{PGDN}',
      'up':       '{UP}',
      'down':     '{DOWN}',
      'left':     '{LEFT}',
      'right':    '{RIGHT}',
      'f1':       '{F1}', 'f2': '{F2}', 'f3': '{F3}',
      'f4':       '{F4}', 'f5': '{F5}', 'f6': '{F6}',
      'f7':       '{F7}', 'f8': '{F8}', 'f9': '{F9}',
      'f10':      '{F10}', 'f11': '{F11}', 'f12': '{F12}',
    };

    // Handle combos like ctrl+c
    if (key.includes('+')) {
      return key.split('+').map(k => map[k.toLowerCase()] || k).join('');
    }
    return map[key.toLowerCase()] || key;
  }

  _mapKeyForRobot(key) {
    const map = {
      'ctrl':     'control',
      'escape':   'escape',
      'esc':      'escape',
      'backspace':'backspace',
      'enter':    'return',
      'pageup':   'page_up',
      'pagedown': 'page_down',
    };
    if (key.includes('+')) {
      return key.split('+').map(k => map[k.toLowerCase()] || k.toLowerCase()).join('+');
    }
    return map[key.toLowerCase()] || key.toLowerCase();
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

module.exports = UIAutomation;
