'use strict';

const { exec, execSync, spawn } = require('child_process');
const Logger = require('../core/logger');

/**
 * PowerShellController
 * Executes PowerShell and CMD commands via child_process
 */
class PowerShellController {

  // ── Run a PowerShell command ──
  runPowerShell({ command }) {
    return new Promise((resolve, reject) => {
      if (!command) return resolve({ success: true, output: '' });

      Logger.debug(`PS> ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`);

      // Use powershell.exe with -Command flag
      const proc = exec(
        `powershell.exe -NonInteractive -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}"`,
        { timeout: 30000, windowsHide: true },
        (err, stdout, stderr) => {
          if (err && err.code !== 0) {
            // Non-zero exit is not always fatal
            Logger.debug(`PS Error (exit ${err.code}): ${stderr}`);
          }
          resolve({
            success: !err || err.code === 0,
            output:  stdout.trim(),
            error:   stderr.trim()
          });
        }
      );

      proc.on('error', (e) => {
        resolve({ success: false, output: '', error: e.message });
      });
    });
  }

  // ── Run a CMD command ──
  runCmd({ command }) {
    return new Promise((resolve) => {
      if (!command) return resolve({ success: true, output: '' });

      Logger.debug(`CMD> ${command}`);

      exec(command, { timeout: 30000, shell: 'cmd.exe', windowsHide: true },
        (err, stdout, stderr) => {
          resolve({
            success: !err || err.code === 0,
            output:  stdout.trim(),
            error:   stderr.trim()
          });
        }
      );
    });
  }

  // ── Run a command and get output synchronously (for quick queries) ──
  runSync(command, isPowerShell = true) {
    try {
      if (isPowerShell) {
        return execSync(
          `powershell.exe -NonInteractive -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}"`,
          { timeout: 10000, windowsHide: true, encoding: 'utf8' }
        ).trim();
      } else {
        return execSync(command, { timeout: 10000, encoding: 'utf8', shell: 'cmd.exe' }).trim();
      }
    } catch (e) {
      return '';
    }
  }

  // ── Start a detached process (app launch) ──
  startDetached(command) {
    return new Promise((resolve) => {
      const child = spawn('cmd.exe', ['/c', command], {
        detached:  true,
        stdio:     'ignore',
        windowsHide: false
      });
      child.unref();
      resolve({ success: true });
    });
  }

  // ── Start process with powershell Start-Process ──
  startProcess(executable, args = '') {
    return new Promise((resolve) => {
      const psCmd = args
        ? `Start-Process "${executable}" -ArgumentList "${args}"`
        : `Start-Process "${executable}"`;

      this.runPowerShell({ command: psCmd }).then(resolve).catch(() => {
        resolve({ success: false });
      });
    });
  }
}

module.exports = PowerShellController;
