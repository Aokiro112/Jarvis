'use strict';

const fs     = require('fs');
const path   = require('path');
const PowerShellController = require('./powerShellController');
const Logger = require('../core/logger');
const chalk  = require('chalk');

class FileController {
  constructor() {
    this.ps = new PowerShellController();
  }

  _resolvePath(inputPath) {
    if (!inputPath) return process.env.USERPROFILE || 'C:\\Users\\User';
    let p = inputPath;

    // Replace friendly shortcuts
    p = p.replace(/^desktop$/i,   `${process.env.USERPROFILE}\\Desktop`);
    p = p.replace(/^downloads$/i, `${process.env.USERPROFILE}\\Downloads`);
    p = p.replace(/^documents$/i, `${process.env.USERPROFILE}\\Documents`);
    p = p.replace(/^pictures$/i,  `${process.env.USERPROFILE}\\Pictures`);
    p = p.replace(/^music$/i,     `${process.env.USERPROFILE}\\Music`);
    p = p.replace(/^videos$/i,    `${process.env.USERPROFILE}\\Videos`);

    // Resolve %VAR% style
    p = p.replace(/%([^%]+)%/g, (_, key) => process.env[key] || `%${key}%`);

    return p;
  }

  async createFile({ path: filePath, content = '' }) {
    const resolved = this._resolvePath(filePath);
    Logger.info(`Creating file: ${resolved}`);

    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, 'utf8');
    return { success: true, path: resolved };
  }

  async deleteFile({ path: filePath }) {
    const resolved = this._resolvePath(filePath);
    Logger.info(`Deleting file: ${resolved}`);

    if (!fs.existsSync(resolved)) {
      return { success: false, error: 'File not found' };
    }
    fs.unlinkSync(resolved);
    return { success: true };
  }

  async openFile({ path: filePath }) {
    const resolved = this._resolvePath(filePath);
    Logger.info(`Opening file: ${resolved}`);
    await this.ps.runPowerShell({ command: `Start-Process "${resolved}"` });
    return { success: true };
  }

  async openFolder({ path: folderPath }) {
    const resolved = this._resolvePath(folderPath);
    Logger.info(`Opening folder: ${resolved}`);
    await this.ps.runPowerShell({ command: `explorer.exe "${resolved}"` });
    return { success: true };
  }

  async listFiles({ path: folderPath, display = true }) {
    const resolved = this._resolvePath(folderPath);

    try {
      const items = fs.readdirSync(resolved, { withFileTypes: true });
      if (display) {
        console.log(chalk.cyan(`\n  Contents of ${resolved}:`));
        items.forEach(item => {
          const icon = item.isDirectory() ? chalk.blue('📁') : chalk.gray('📄');
          console.log(`  ${icon} ${chalk.white(item.name)}`);
        });
        console.log(chalk.gray(`\n  Total: ${items.length} items`));
      }
      return { success: true, files: items.map(i => i.name) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async copyFile({ source, destination }) {
    const src  = this._resolvePath(source);
    const dest = this._resolvePath(destination);
    Logger.info(`Copying: ${src} → ${dest}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    return { success: true };
  }

  async moveFile({ source, destination }) {
    const src  = this._resolvePath(source);
    const dest = this._resolvePath(destination);
    Logger.info(`Moving: ${src} → ${dest}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
    return { success: true };
  }

  async renameFile({ path: filePath, newName }) {
    const resolved  = this._resolvePath(filePath);
    const newPath   = path.join(path.dirname(resolved), newName);
    fs.renameSync(resolved, newPath);
    return { success: true };
  }

  async createFolder({ path: folderPath }) {
    const resolved = this._resolvePath(folderPath);
    Logger.info(`Creating folder: ${resolved}`);
    fs.mkdirSync(resolved, { recursive: true });
    return { success: true };
  }

  async deleteFolder({ path: folderPath }) {
    const resolved = this._resolvePath(folderPath);
    Logger.info(`Deleting folder: ${resolved}`);
    fs.rmSync(resolved, { recursive: true, force: true });
    return { success: true };
  }

  async writeToFile({ path: filePath, content = '', append = false }) {
    const resolved = this._resolvePath(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    if (append) {
      fs.appendFileSync(resolved, content + '\n', 'utf8');
    } else {
      fs.writeFileSync(resolved, content, 'utf8');
    }
    return { success: true };
  }
}

module.exports = FileController;
