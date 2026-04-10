'use strict';

const fs     = require('fs');
const path   = require('path');
const PowerShellController = require('./powerShellController');
const Logger = require('../core/logger');
const chalk  = require('chalk');

class ScreenshotController {
  constructor() {
    this.ps = new PowerShellController();
    this.screenshotLib = null;

    try {
      this.screenshotLib = require('screenshot-desktop');
    } catch (_) {
      Logger.info('screenshot-desktop not installed. Using PS fallback.');
    }
  }

  async take({ path: savePath }) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = path.join(
      process.env.USERPROFILE || 'C:\\Users\\User',
      'Desktop',
      `jarvis_screenshot_${timestamp}.png`
    );
    const outPath = savePath || defaultPath;

    Logger.info(`Taking screenshot → ${outPath}`);

    if (this.screenshotLib) {
      try {
        await this.screenshotLib({ filename: outPath });
        console.log(chalk.green(`  ✓ Screenshot saved: ${outPath}`));
        return { success: true, path: outPath };
      } catch (e) {
        Logger.warn(`screenshot-desktop failed: ${e.message}. Trying PS fallback.`);
      }
    }

    // PowerShell fallback using .NET Graphics
    const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp    = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$g      = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bmp.Save("${outPath.replace(/\\/g, '\\\\')}")
$g.Dispose()
$bmp.Dispose()
Write-Output "saved:${outPath.replace(/\\/g, '\\\\')}"`;

    const result = await this.ps.runPowerShell({ command: script });
    if (result.output.includes('saved:')) {
      console.log(chalk.green(`  ✓ Screenshot saved: ${outPath}`));
      return { success: true, path: outPath };
    }

    return { success: false, error: result.error };
  }

  async takeRegion({ x = 0, y = 0, width = 800, height = 600, path: savePath }) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = savePath || path.join(
      process.env.USERPROFILE || 'C:\\Users\\User',
      'Desktop',
      `jarvis_region_${timestamp}.png`
    );

    const script = `
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(${width}, ${height})
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(${x}, ${y}, 0, 0, [System.Drawing.Size]::new(${width}, ${height}))
$bmp.Save("${outPath.replace(/\\/g, '\\\\')}")
$g.Dispose(); $bmp.Dispose()`;

    await this.ps.runPowerShell({ command: script });
    console.log(chalk.green(`  ✓ Region screenshot saved: ${outPath}`));
    return { success: true, path: outPath };
  }
}

module.exports = ScreenshotController;
