'use strict';

const PowerShellController = require('./powerShellController');
const Logger = require('../core/logger');
const chalk  = require('chalk');

class SystemController {
  constructor() {
    this.ps = new PowerShellController();
  }

  async shutdown({ delay = 0 }) {
    Logger.warn(`System shutdown in ${delay} seconds...`);
    await this.ps.runCmd({ command: `shutdown /s /t ${delay}` });
    return { success: true };
  }

  async restart({ delay = 0 }) {
    Logger.warn(`System restart in ${delay} seconds...`);
    await this.ps.runCmd({ command: `shutdown /r /t ${delay}` });
    return { success: true };
  }

  async sleep() {
    Logger.info('Putting system to sleep...');
    await this.ps.runPowerShell({ command: 'Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $false, $false)' });
    return { success: true };
  }

  async lockScreen() {
    Logger.info('Locking screen...');
    await this.ps.runPowerShell({ command: 'rundll32.exe user32.dll,LockWorkStation' });
    return { success: true };
  }

  async logout() {
    Logger.info('Logging out...');
    await this.ps.runCmd({ command: 'shutdown /l' });
    return { success: true };
  }

  async setVolume({ level }) {
    const vol = Math.min(100, Math.max(0, parseInt(level, 10)));
    Logger.info(`Setting volume to ${vol}%`);
    const script = `
$wshShell = New-Object -ComObject WScript.Shell
$vol = ${vol}
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref System.Guid id, int ctx, int p, out IAudioEndpointVolume v); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int d, int r, out IMMDevice ep); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject {}
public class AudioManager {
  static IAudioEndpointVolume Vol() {
    var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev; enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
    var epVolId = typeof(IAudioEndpointVolume).GUID;
    IAudioEndpointVolume vol; dev.Activate(ref epVolId, 23, 0, out vol); return vol;
  }
  public static float GetVolume() { float v = -1; Vol().GetMasterVolumeLevelScalar(out v); return v; }
  public static void SetVolume(float v) { Vol().SetMasterVolumeLevelScalar(v, System.Guid.Empty); }
  public static void SetMute(bool m) { Vol().SetMute(m, System.Guid.Empty); }
}
"@
[AudioManager]::SetVolume(${vol / 100})`;
    await this.ps.runPowerShell({ command: script }).catch(async () => {
      // Fallback using nircmd if available
      await this.ps.runCmd({ command: `nircmd.exe setsysvolume ${Math.round(vol * 655.35)}` });
    });
    return { success: true };
  }

  async muteVolume() {
    Logger.info('Muting volume...');
    await this.ps.runPowerShell({
      command: `(New-Object -com WScript.Shell).SendKeys([char]173)`
    });
    return { success: true };
  }

  async unmuteVolume() {
    Logger.info('Unmuting volume...');
    await this.ps.runPowerShell({
      command: `(New-Object -com WScript.Shell).SendKeys([char]173)`
    });
    return { success: true };
  }

  async emptyRecycleBin() {
    Logger.info('Emptying recycle bin...');
    await this.ps.runPowerShell({
      command: `Clear-RecycleBin -Force -ErrorAction SilentlyContinue`
    });
    return { success: true };
  }

  async getSystemInfo() {
    const script = `
$cpu = (Get-WmiObject Win32_Processor).LoadPercentage
$os  = Get-WmiObject Win32_OperatingSystem
$ram_total = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$ram_free  = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$uptime    = (Get-Date) - (gcim Win32_OperatingSystem).LastBootUpTime
[PSCustomObject]@{
  CPU       = $cpu
  RAMTotal  = $ram_total
  RAMFree   = $ram_free
  RAMUsed   = $ram_total - $ram_free
  Uptime    = "$([math]::Floor($uptime.TotalHours))h $($uptime.Minutes)m"
  OS        = (Get-WmiObject Win32_OperatingSystem).Caption
  Hostname  = $env:COMPUTERNAME
  User      = $env:USERNAME
} | ConvertTo-Json`;

    const result = await this.ps.runPowerShell({ command: script });
    try {
      const info = JSON.parse(result.output);
      console.log(chalk.cyan('\n  System Information:'));
      console.log(chalk.gray('  ─────────────────────────────────'));
      Object.entries(info).forEach(([k, v]) => {
        console.log(chalk.green('  ● ') + chalk.gray(`${k}: `) + chalk.white(v));
      });
      return { success: true, data: info };
    } catch (_) {
      console.log(chalk.gray(result.output));
      return { success: true };
    }
  }

  async getBattery() {
    const result = await this.ps.runPowerShell({
      command: 'Get-WmiObject Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json'
    });
    console.log(chalk.cyan('\n  Battery:'));
    console.log(chalk.gray(result.output || 'No battery info available (desktop?)'));
    return { success: true };
  }

  async getNetworkInfo() {
    const result = await this.ps.runPowerShell({
      command: `Get-NetIPAddress | Where-Object { $_.AddressFamily -eq 'IPv4' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object InterfaceAlias, IPAddress | ConvertTo-Json`
    });
    console.log(chalk.cyan('\n  Network Info:'));
    try {
      const nets = JSON.parse(result.output);
      const arr = Array.isArray(nets) ? nets : [nets];
      arr.forEach(n => {
        console.log(chalk.green('  ● ') + chalk.gray(`${n.InterfaceAlias}: `) + chalk.white(n.IPAddress));
      });
    } catch (_) {
      console.log(chalk.gray(result.output));
    }
    return { success: true };
  }

  async getProcesses() {
    const result = await this.ps.runPowerShell({
      command: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Name, CPU, WorkingSet | Format-Table -AutoSize'
    });
    console.log(chalk.cyan('\n  Top Processes:'));
    console.log(chalk.gray(result.output));
    return { success: true };
  }

  async getDiskInfo() {
    const result = await this.ps.runPowerShell({
      command: 'Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N="Used(GB)";E={[math]::Round($_.Used/1GB,2)}}, @{N="Free(GB)";E={[math]::Round($_.Free/1GB,2)}} | Format-Table -AutoSize'
    });
    console.log(chalk.cyan('\n  Disk Information:'));
    console.log(chalk.gray(result.output));
    return { success: true };
  }

  async openSettings() {
    await this.ps.runPowerShell({ command: 'Start-Process ms-settings:' });
    return { success: true };
  }

  async openControlPanel() {
    await this.ps.runPowerShell({ command: 'Start-Process control.exe' });
    return { success: true };
  }

  async openTaskManager() {
    await this.ps.runPowerShell({ command: 'Start-Process taskmgr.exe' });
    return { success: true };
  }

  async openDeviceManager() {
    await this.ps.runPowerShell({ command: 'Start-Process devmgmt.msc' });
    return { success: true };
  }

  async setEnvVar({ name, value, scope = 'user' }) {
    const target = scope === 'machine' ? 'Machine' : 'User';
    await this.ps.runPowerShell({
      command: `[System.Environment]::SetEnvironmentVariable("${name}", "${value}", [System.EnvironmentVariableTarget]::${target})`
    });
    return { success: true };
  }

  async setWallpaper({ path: wallpaperPath }) {
    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Wallpaper {
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
[Wallpaper]::SystemParametersInfo(20, 0, "${wallpaperPath}", 3)`;
    await this.ps.runPowerShell({ command: script });
    return { success: true };
  }
}

module.exports = SystemController;
