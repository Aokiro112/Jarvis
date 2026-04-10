'use strict';

const fs     = require('fs');
const path   = require('path');
const Config = require('./config');

const HISTORY_FILE = path.resolve('./memory/command_history.json');

class CommandHistory {
  constructor() {
    this.history = [];
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        this.history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      }
    } catch (_) {
      this.history = [];
    }
  }

  _save() {
    try {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2));
    } catch (_) {}
  }

  add(command, parsedResult) {
    const entry = {
      command,
      actions: (parsedResult.actions || []).map(a => a.action),
      response: parsedResult.response || '',
      timestamp: new Date().toLocaleString()
    };
    this.history.unshift(entry);

    // Limit history
    if (this.history.length > Config.HISTORY_LIMIT) {
      this.history = this.history.slice(0, Config.HISTORY_LIMIT);
    }
    this._save();
  }

  getRecent(n = 5) {
    return this.history.slice(0, n);
  }

  count() {
    return this.history.length;
  }

  clear() {
    this.history = [];
    this._save();
  }

  search(keyword) {
    return this.history.filter(h =>
      h.command.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}

module.exports = CommandHistory;
