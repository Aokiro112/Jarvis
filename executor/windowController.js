'use strict';

const PowerShellController = require('./powerShellController');
const Logger = require('../core/logger');
const chalk  = require('chalk');

class WindowController {
  constructor() {
    this.ps = new PowerShellController();
  }

  async minimize({ title }) {
    if (title && title.toLowerCase() === 'all') {
      await this.ps.runPowerShell({ command: '(New-Object -ComObject Shell.Application).MinimizeAll()' });
    } else {
      await this._sendWindowCommand(title, 'minimize');
    }
    return { success: true };
  }

  async maximize({ title }) {
    await this._sendWindowCommand(title, 'maximize');
    return { success: true };
  }

  async close({ title }) {
    await this._sendWindowCommand(title, 'close');
    return { success: true };
  }

  async focus({ title }) {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${title}*" } | Select-Object -First 1
if ($proc) {
  [WinAPI]::ShowWindow($proc.MainWindowHandle, 9)
  [WinAPI]::SetForegroundWindow($proc.MainWindowHandle)
}`;
    await this.ps.runPowerShell({ command: script });
    return { success: true };
  }

  async listWindows() {
    const result = await this.ps.runPowerShell({
      command: 'Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -Property Name, MainWindowTitle | Format-Table -AutoSize'
    });

    if (result.output) {
      console.log(chalk.cyan('\n  Open Windows:'));
      console.log(chalk.gray(result.output));
    }
    return { success: true, output: result.output };
  }

  async tile({ layout }) {
    const cmds = {
      left:   'Start-Process -FilePath "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -ArgumentList "-Command", "(New-Object -ComObject Shell.Application).TileVertically()"',
      right:  '',
      top:    '(New-Object -ComObject Shell.Application).TileHorizontally()',
      bottom: '(New-Object -ComObject Shell.Application).TileHorizontally()'
    };
    const cmd = cmds[layout];
    if (cmd) await this.ps.runPowerShell({ command: cmd });
    return { success: true };
  }

  // ── Send WM_CLOSE or SW_MINIMIZE via P/Invoke ──
  async _sendWindowCommand(title, action) {
    const actionMap = {
      minimize: 'SW_MINIMIZE',
      maximize: 'SW_MAXIMIZE',
      restore:  'SW_RESTORE',
      close:    'WM_CLOSE'
    };

    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinCtrl {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, int m, int w, int l);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
}
"@
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${title}*" } | Select-Object -First 1
if ($proc) {
  $h = $proc.MainWindowHandle
  ${action === 'close'    ? '[WinCtrl]::SendMessage($h, 0x0010, 0, 0)' : ''}
  ${action === 'minimize' ? '[WinCtrl]::ShowWindow($h, 6)' : ''}
  ${action === 'maximize' ? '[WinCtrl]::ShowWindow($h, 3)' : ''}
}`;

    await this.ps.runPowerShell({ command: script });
  }
}

module.exports = WindowController;
