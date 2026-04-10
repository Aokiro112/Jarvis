'use strict';

const fs     = require('fs');
const path   = require('path');
const Logger = require('../core/logger');

/**
 * PluginManager
 * Loads and manages user-created plugins from /plugins directory.
 * Each plugin exports: { name, description, actions: { actionName: handler } }
 */
class PluginManager {
  constructor(executor) {
    this.executor = executor;
    this.plugins  = {};
    this.pluginsDir = path.resolve('./plugins');
  }

  // ── Load all plugins ──
  async loadPlugins() {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
      this._createExamplePlugin();
      return;
    }

    const files = fs.readdirSync(this.pluginsDir)
      .filter(f => f.endsWith('.js') && !f.startsWith('_'));

    for (const file of files) {
      try {
        const plugin = require(path.join(this.pluginsDir, file));
        if (plugin.name && plugin.actions) {
          this.plugins[plugin.name] = plugin;
          // Register actions into executor
          for (const [actionName, handler] of Object.entries(plugin.actions)) {
            this.executor.handlers[actionName] = handler;
          }
          Logger.success(`Plugin loaded: ${plugin.name}`);
        }
      } catch (e) {
        Logger.warn(`Failed to load plugin ${file}: ${e.message}`);
      }
    }

    if (files.length > 0) {
      Logger.info(`${files.length} plugin(s) loaded.`);
    }
  }

  // ── List loaded plugins ──
  listPlugins() {
    return Object.values(this.plugins).map(p => ({
      name:        p.name,
      description: p.description || '',
      actions:     Object.keys(p.actions || {})
    }));
  }

  // ── Create an example plugin ──
  _createExamplePlugin() {
    const example = `'use strict';

/**
 * Example Jarvis Plugin
 * Place this file in the /plugins directory to activate.
 */
module.exports = {
  name: 'example_plugin',
  description: 'Example plugin showing how to extend Jarvis',
  
  actions: {
    // Add a custom action: "say_hello"
    say_hello: async (action) => {
      const name = action.name || 'World';
      console.log(\`\\n  Hello, \${name}!\`);
      return { success: true };
    },

    // Custom weather check (example)
    check_weather: async (action) => {
      const city = action.city || 'London';
      const url  = \`https://wttr.in/\${encodeURIComponent(city)}?format=3\`;
      const https = require('https');
      return new Promise((resolve) => {
        https.get(url, (res) => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end',  () => {
            console.log(\`\\n  Weather: \${data.trim()}\`);
            resolve({ success: true });
          });
        }).on('error', () => resolve({ success: false }));
      });
    }
  }
};
`;
    fs.writeFileSync(path.join(this.pluginsDir, '_example_plugin.js'), example, 'utf8');
  }
}

module.exports = PluginManager;
