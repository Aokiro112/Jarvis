'use strict';

const fs     = require('fs');
const path   = require('path');
const PowerShellController = require('./powerShellController');
const MemorySystem = require('../memory/memory');
const Logger = require('../core/logger');
const Config = require('../core/config');

class ChromeController {
  constructor() {
    this.ps     = new PowerShellController();
    this.memory = new MemorySystem();
    this._profiles = null;
  }

  // ── Open Chrome with a specific profile and optional URL ──
  async openProfile({ profile, url }) {
    const resolvedProfile = await this._resolveProfile(profile);
    const chromePath      = Config.CHROME_PATH;
    const urlArg          = url ? ` --new-window "${url}"` : '';

    Logger.info(`Launching Chrome: profile="${resolvedProfile}" url="${url || 'none'}"`);

    const command = `Start-Process -FilePath "${chromePath}" -ArgumentList '--profile-directory="${resolvedProfile}"${urlArg}'`;
    await this.ps.runPowerShell({ command });

    return { success: true, profile: resolvedProfile, url };
  }

  // ── Detect all Chrome profiles installed ──
  async getProfiles() {
    if (this._profiles) return this._profiles;

    const profilesDir = Config.CHROME_PROFILES_DIR;
    const profiles    = [];

    try {
      if (!fs.existsSync(profilesDir)) {
        return [{ name: 'Default', directory: 'Default', displayName: 'Default Profile' }];
      }

      const dirs = fs.readdirSync(profilesDir);

      for (const dir of dirs) {
        if (dir === 'Default' || dir.startsWith('Profile ')) {
          const prefsFile = path.join(profilesDir, dir, 'Preferences');
          let displayName = dir;

          if (fs.existsSync(prefsFile)) {
            try {
              const prefs = JSON.parse(fs.readFileSync(prefsFile, 'utf8'));
              displayName = prefs?.profile?.name || dir;
            } catch (_) {}
          }

          profiles.push({
            name:        dir,
            directory:   dir,
            displayName: displayName
          });
        }
      }
    } catch (err) {
      Logger.warn(`Could not read Chrome profiles: ${err.message}`);
    }

    this._profiles = profiles;
    return profiles;
  }

  // ── Resolve profile name/alias to Chrome directory ──
  async _resolveProfile(profileInput) {
    if (!profileInput) return 'Default';

    const input = profileInput.toLowerCase().trim();

    // Direct profile directory names
    if (input.startsWith('profile ') || input === 'default') {
      return profileInput;
    }

    // Check memory for user-defined mappings
    const memoryKey = `chrome_profile_${input.replace(/\s+/g, '_')}`;
    const memValue  = await this.memory.get(memoryKey);
    if (memValue) return memValue;

    // Numeric profile references: "profile 2", "second account", "2nd account"
    const numMap = {
      'first': '1', 'second': '2', 'third': '3',
      '1st': '1', '2nd': '2', '3rd': '3',
      '1': '1', '2': '2', '3': '3', '4': '4', '5': '5'
    };

    for (const [word, num] of Object.entries(numMap)) {
      if (input.includes(word)) {
        if (num === '1') return 'Default';
        return `Profile ${num}`;
      }
    }

    // Smart aliases
    const smartAliases = {
      'main':       'Default',
      'primary':    'Default',
      'personal':   'Default',
      'default':    'Default',
      'work':       'Profile 2',
      'office':     'Profile 2',
      'secondary':  'Profile 2',
      'business':   'Profile 2',
      'backup':     'Profile 3',
      'extra':      'Profile 3',
      'gaming':     'Profile 4',
      'dev':        'Profile 2',
      'developer':  'Profile 2',
      'coding':     'Profile 2',
    };

    for (const [alias, dir] of Object.entries(smartAliases)) {
      if (input.includes(alias)) return dir;
    }

    // Try to match by profile display name
    const profiles = await this.getProfiles();
    const match = profiles.find(p =>
      p.displayName.toLowerCase().includes(input) ||
      p.name.toLowerCase().includes(input)
    );
    if (match) return match.directory;

    // Default fallback
    return 'Default';
  }

  // ── List all profiles ──
  async listProfiles() {
    const profiles = await this.getProfiles();
    const chalk = require('chalk');
    console.log(chalk.cyan('\n  Chrome Profiles:'));
    profiles.forEach((p, i) => {
      console.log(chalk.gray(`  ${i + 1}. `) + chalk.white(p.displayName) + chalk.gray(` [${p.directory}]`));
    });
    return { success: true, profiles };
  }
}

module.exports = ChromeController;
