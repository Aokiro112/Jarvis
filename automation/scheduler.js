'use strict';

const fs     = require('fs');
const path   = require('path');
const Logger = require('../core/logger');
const Config = require('../core/config');
const chalk  = require('chalk');

const TASKS_FILE = path.resolve('./memory/scheduled_tasks.json');

class Scheduler {
  constructor() {
    this.tasks   = {};
    this.timers  = {};
  }

  async initialize() {
    if (!Config.SCHEDULER_ENABLED) return;
    this._loadTasks();
    this._rehydrateTasks();
    Logger.success(`Scheduler ready. Active tasks: ${Object.keys(this.tasks).length}`);
  }

  _loadTasks() {
    try {
      if (fs.existsSync(TASKS_FILE)) {
        this.tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
      }
    } catch (_) {
      this.tasks = {};
    }
  }

  _saveTasks() {
    try {
      fs.mkdirSync(path.dirname(TASKS_FILE), { recursive: true });
      fs.writeFileSync(TASKS_FILE, JSON.stringify(this.tasks, null, 2));
    } catch (_) {}
  }

  // ── Schedule a new task ──
  async scheduleTask({ command, at, repeat = 'once', id }) {
    const taskId = id || `task_${Date.now()}`;
    const task   = { id: taskId, command, at, repeat, createdAt: new Date().toISOString() };

    this.tasks[taskId] = task;
    this._saveTasks();
    this._activateTask(task);

    Logger.success(`Task scheduled: "${command}" at ${at} (${repeat})`);
    return { success: true, id: taskId };
  }

  // ── Cancel a task ──
  async cancelTask({ id }) {
    if (this.timers[id]) {
      clearTimeout(this.timers[id]);
      clearInterval(this.timers[id]);
      delete this.timers[id];
    }
    delete this.tasks[id];
    this._saveTasks();
    Logger.info(`Task cancelled: ${id}`);
    return { success: true };
  }

  // ── List all tasks ──
  async listTasks() {
    console.log(chalk.cyan('\n  Scheduled Tasks:'));
    const taskList = Object.values(this.tasks);
    if (!taskList.length) {
      console.log(chalk.gray('  No scheduled tasks.'));
      return { success: true, tasks: [] };
    }
    taskList.forEach(t => {
      console.log(
        chalk.green('  ● ') +
        chalk.white(t.command) +
        chalk.gray(` | at: ${t.at} | repeat: ${t.repeat} | id: ${t.id}`)
      );
    });
    return { success: true, tasks: taskList };
  }

  // ── Activate a task (set timer) ──
  _activateTask(task) {
    const now     = new Date();
    const [h, m]  = (task.at || '00:00').split(':').map(Number);
    const target  = new Date(now);
    target.setHours(h, m, 0, 0);

    if (target <= now) target.setDate(target.getDate() + 1);

    const delay = target - now;

    const run = async () => {
      Logger.info(`Executing scheduled task: "${task.command}"`);
      // Re-emit to main Jarvis via global event (if available)
      if (global.jarvisExecuteCommand) {
        await global.jarvisExecuteCommand(task.command);
      }

      if (task.repeat === 'daily') {
        this.timers[task.id] = setTimeout(run, 24 * 60 * 60 * 1000);
      } else if (task.repeat === 'weekly') {
        this.timers[task.id] = setTimeout(run, 7 * 24 * 60 * 60 * 1000);
      } else {
        // once - remove after execution
        delete this.tasks[task.id];
        this._saveTasks();
      }
    };

    this.timers[task.id] = setTimeout(run, delay);
  }

  _rehydrateTasks() {
    for (const task of Object.values(this.tasks)) {
      this._activateTask(task);
    }
  }
}

module.exports = Scheduler;
