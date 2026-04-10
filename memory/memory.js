'use strict';

const fs   = require('fs');
const path = require('path');
const Logger = require('../core/logger');
const Config = require('../core/config');

/**
 * MemorySystem
 * Persistent key-value store backed by a JSON file.
 * Stores user preferences, aliases, Chrome profile mappings, etc.
 */
class MemorySystem {
  constructor() {
    this.dbPath = path.resolve(Config.MEMORY_DB_PATH);
    this.data   = {};
  }

  async initialize() {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });

    // Load existing data
    try {
      if (fs.existsSync(this.dbPath)) {
        this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
        Logger.info(`Memory loaded: ${Object.keys(this.data).length} entries`);
      } else {
        await this._seedDefaults();
      }
    } catch (e) {
      Logger.warn(`Memory load failed: ${e.message}. Starting fresh.`);
      this.data = {};
      await this._seedDefaults();
    }
  }

  // ── Seed default preferences ──
  async _seedDefaults() {
    this.data = {
      'chrome_profile_main':       'Default',
      'chrome_profile_primary':    'Default',
      'chrome_profile_personal':   'Default',
      'chrome_profile_work':       'Profile 2',
      'chrome_profile_office':     'Profile 2',
      'chrome_profile_secondary':  'Profile 2',
      'chrome_profile_second':     'Profile 2',
      'user_name':                 process.env.USERNAME || 'User',
      'setup_created':             new Date().toISOString()
    };
    this._save();
  }

  _save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      Logger.warn(`Memory save failed: ${e.message}`);
    }
  }

  // ── CRUD operations ──
  async set(key, value) {
    const k = this._normalizeKey(key);
    this.data[k] = value;
    this._save();
    Logger.debug(`Memory SET: ${k} = ${JSON.stringify(value)}`);
    return { success: true };
  }

  async get(key) {
    return this.data[this._normalizeKey(key)] || null;
  }

  async delete(key) {
    delete this.data[this._normalizeKey(key)];
    this._save();
    return { success: true };
  }

  async getAll() {
    return { ...this.data };
  }

  async search(query) {
    const results = {};
    const q = query.toLowerCase();
    for (const [k, v] of Object.entries(this.data)) {
      if (k.includes(q) || JSON.stringify(v).toLowerCase().includes(q)) {
        results[k] = v;
      }
    }
    return results;
  }

  async clear() {
    this.data = {};
    this._save();
  }

  _normalizeKey(key) {
    return key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  // ── Specialized helpers for Chrome profiles ──
  async saveProfileAlias(alias, profileDirectory) {
    await this.set(`chrome_profile_${alias}`, profileDirectory);
  }

  async getChromeProfile(alias) {
    return await this.get(`chrome_profile_${alias}`);
  }

  // ── Save a "setup" (group of apps to open) ──
  async saveSetup(name, apps) {
    await this.set(`setup_${name}`, apps);
  }

  async getSetup(name) {
    return await this.get(`setup_${name}`);
  }
}

module.exports = MemorySystem;
