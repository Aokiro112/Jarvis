'use strict';

const PowerShellController = require('../executor/powerShellController');
const Logger = require('../core/logger');

class WindowsManager {
  constructor() {
    this.ps = new PowerShellController();
  }

  async initialize() {
    Logger.info('Windows integration layer initializing...');
    Logger.success('Windows integration ready.');
  }

  async getActiveWindow() {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinHelper {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
}
"@
$h = [WinHelper]::GetForegroundWindow()
$s = New-Object System.Text.StringBuilder(256)
[WinHelper]::GetWindowText($h, $s, 256) | Out-Null
$s.ToString()`;

    const result = await this.ps.runPowerShell({ command: script });
    return result.output || null;
  }

  async getSystemInfo() {
    try {
      const script = `
$cpu = (Get-WmiObject Win32_Processor).LoadPercentage
$os  = Get-WmiObject Win32_OperatingSystem
$ramFree = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
Write-Output "$cpu|$ramFree"`;
      const result = await this.ps.runPowerShell({ command: script });
      const parts = (result.output || '0|0').split('|');
      return { cpu: parts[0] || '0', ramFree: parts[1] || '0' };
    } catch (_) {
      return { cpu: '0', ramFree: '0' };
    }
  }

  async getInstalledApps() {
    const script = `
Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* |
Select-Object DisplayName, DisplayVersion |
Where-Object { $_.DisplayName } |
Sort-Object DisplayName |
ConvertTo-Json`;
    const result = await this.ps.runPowerShell({ command: script });
    try {
      return JSON.parse(result.output);
    } catch (_) {
      return [];
    }
  }

  async getStartupPrograms() {
    const script = `
Get-CimInstance Win32_StartupCommand |
Select-Object Name, Command, Location |
ConvertTo-Json`;
    const result = await this.ps.runPowerShell({ command: script });
    try {
      return JSON.parse(result.output);
    } catch (_) {
      return [];
    }
  }

  async addToStartup(name, exePath) {
    const script = `
$regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
Set-ItemProperty -Path $regPath -Name "${name}" -Value '"${exePath}"'`;
    await this.ps.runPowerShell({ command: script });
    return { success: true };
  }

  async removeFromStartup(name) {
    const script = `
$regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
Remove-ItemProperty -Path $regPath -Name "${name}" -ErrorAction SilentlyContinue`;
    await this.ps.runPowerShell({ command: script });
    return { success: true };
  }

  async getEnvironmentVariable(name) {
    const result = await this.ps.runPowerShell({
      command: `[System.Environment]::GetEnvironmentVariable("${name}", "User")`
    });
    return result.output || null;
  }

  async setRegistryKey(path, name, value, type = 'String') {
    const script = `
If (!(Test-Path "${path}")) { New-Item -Path "${path}" -Force | Out-Null }
Set-ItemProperty -Path "${path}" -Name "${name}" -Value "${value}" -Type ${type}`;
    await this.ps.runPowerShell({ command: script });
    return { success: true };
  }
}

module.exports = WindowsManager;
