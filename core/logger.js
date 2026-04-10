'use strict';

const chalk  = require('chalk');
const fs     = require('fs');
const path   = require('path');
const Config = require('./config');

const LOGS_DIR = path.resolve(Config.LOGS_PATH);

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function getLogFile() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOGS_DIR, `jarvis_${date}.log`);
}

function writeToFile(level, message) {
  try {
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    fs.appendFileSync(getLogFile(), line, 'utf8');
  } catch (_) {}
}

function timestamp() {
  return chalk.gray(new Date().toLocaleTimeString());
}

const Logger = {
  info(msg) {
    if (!Config.SILENT_MODE) {
      console.log(`  ${timestamp()} ${chalk.blue('[INFO]')} ${chalk.gray(msg)}`);
    }
    writeToFile('INFO', msg);
  },

  success(msg) {
    console.log(`  ${timestamp()} ${chalk.green('[OK]')} ${chalk.white(msg)}`);
    writeToFile('SUCCESS', msg);
  },

  warn(msg) {
    console.log(`  ${timestamp()} ${chalk.yellow('[WARN]')} ${chalk.yellow(msg)}`);
    writeToFile('WARN', msg);
  },

  error(msg) {
    console.log(`  ${timestamp()} ${chalk.red('[ERROR]')} ${chalk.red(msg)}`);
    writeToFile('ERROR', msg);
  },

  action(actionName, details) {
    if (!Config.SILENT_MODE) {
      console.log(`  ${timestamp()} ${chalk.magenta('[ACTION]')} ${chalk.cyan(actionName)}`);
      if (Config.DEBUG_MODE && details) {
        console.log(chalk.gray('    ' + JSON.stringify(details)));
      }
    }
    writeToFile('ACTION', `${actionName} ${JSON.stringify(details || {})}`);
  },

  jarvis(msg) {
    console.log(`\n  ${chalk.cyan('JARVIS:')} ${chalk.white(msg)}`);
    writeToFile('JARVIS', msg);
  },

  debug(msg) {
    if (Config.DEBUG_MODE) {
      console.log(`  ${timestamp()} ${chalk.gray('[DEBUG]')} ${chalk.gray(msg)}`);
    }
    writeToFile('DEBUG', msg);
  }
};

module.exports = Logger;
