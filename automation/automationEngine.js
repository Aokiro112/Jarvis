'use strict';

const Logger = require('../core/logger');

/**
 * AutomationEngine
 * Handles multi-step command execution with delays and conditionals
 */
class AutomationEngine {
  constructor(executor) {
    this.executor = executor;
  }

  // ── Run a sequence of actions with optional delays ──
  async runSequence(actions, delayMs = 500) {
    const results = [];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      Logger.info(`Step ${i + 1}/${actions.length}: ${action.action}`);

      // Support per-action delay override
      const delay = action._delay || delayMs;

      // Optional wait before this action
      if (action._waitBefore) await this._sleep(action._waitBefore);

      const result = await this.executor.execute(action);
      results.push(result);

      if (!result.success && action._stopOnFail) {
        Logger.warn(`Sequence stopped at step ${i + 1} due to failure.`);
        break;
      }

      // Wait between steps
      if (i < actions.length - 1) await this._sleep(delay);
    }
    return results;
  }

  // ── Run a named preset workflow ──
  async runPreset(name, memory) {
    const presets = {
      'coding_setup': [
        { action: 'open_app', app: 'vscode' },
        { action: 'open_chrome_profile', profile: 'Default', url: 'https://github.com', _waitBefore: 1000 },
        { action: 'open_app', app: 'spotify', _waitBefore: 500 }
      ],
      'morning_routine': [
        { action: 'open_url', url: 'https://calendar.google.com', browser: 'chrome' },
        { action: 'open_url', url: 'https://mail.google.com', browser: 'chrome', _waitBefore: 500 },
        { action: 'open_app', app: 'notepad', _waitBefore: 500 }
      ],
      'presentation_mode': [
        { action: 'minimize_window', title: 'all' },
        { action: 'open_app', app: 'powerpoint' }
      ],
      'shutdown_routine': [
        { action: 'take_screenshot', path: '' },
        { action: 'empty_recycle_bin' },
        { action: 'shutdown', delay: 30 }
      ]
    };

    // Check memory for custom presets
    const customPreset = memory ? await memory.getSetup(name) : null;
    const steps = customPreset || presets[name.toLowerCase().replace(/\s+/g, '_')];

    if (!steps) {
      Logger.warn(`Preset "${name}" not found.`);
      return { success: false, error: 'Preset not found' };
    }

    Logger.info(`Running preset: "${name}" (${steps.length} steps)`);
    return await this.runSequence(steps);
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

module.exports = AutomationEngine;
