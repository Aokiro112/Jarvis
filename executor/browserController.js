'use strict';

const PowerShellController = require('./powerShellController');
const Logger = require('../core/logger');
const Config = require('../core/config');

class BrowserController {
  constructor() {
    this.ps = new PowerShellController();
  }

  async openUrl({ url, browser = 'chrome' }) {
    if (!url.startsWith('http')) url = 'https://' + url;

    Logger.info(`Opening URL: ${url} in ${browser}`);

    const browserPaths = {
      chrome:  Config.CHROME_PATH,
      edge:    'msedge.exe',
      firefox: Config.APP_PATHS.firefox,
      default: 'start'
    };

    const exe = browserPaths[browser.toLowerCase()] || browserPaths.default;

    if (exe === 'start') {
      await this.ps.runPowerShell({ command: `Start-Process "${url}"` });
    } else {
      await this.ps.runPowerShell({ command: `Start-Process "${exe}" -ArgumentList "${url}"` });
    }

    return { success: true };
  }

  async searchWeb({ query, engine = 'google' }) {
    const engines = {
      google:    `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      bing:      `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      youtube:   `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      duckduckgo:`https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      github:    `https://github.com/search?q=${encodeURIComponent(query)}`,
    };

    const url = engines[engine.toLowerCase()] || engines.google;
    Logger.info(`Searching "${query}" on ${engine}`);
    await this.ps.runPowerShell({ command: `Start-Process "${url}"` });
    return { success: true };
  }
}

module.exports = BrowserController;
