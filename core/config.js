'use strict';

/**
 * Centralized configuration loaded from environment
 */
const Config = {
  GROQ_API_KEY:       process.env.GROQ_API_KEY || '',
  GROQ_MODEL:         process.env.GROQ_MODEL || 'llama3-70b-8192',
  ASSISTANT_NAME:     process.env.ASSISTANT_NAME || 'Jarvis',
  DEBUG_MODE:         process.env.DEBUG_MODE === 'true',
  VOICE_MODE:         process.env.VOICE_MODE === 'true',
  SILENT_MODE:        process.env.SILENT_MODE === 'true',
  AUTO_START:         process.env.AUTO_START === 'true',
  HISTORY_LIMIT:      parseInt(process.env.HISTORY_LIMIT || '100', 10),
  SCREENSHOT_ENABLED: process.env.SCREENSHOT_ENABLED !== 'false',
  LANGUAGE:           process.env.LANGUAGE || 'en',
  WAKE_WORD:          process.env.WAKE_WORD || 'jarvis',
  MEMORY_DB_PATH:     process.env.MEMORY_DB_PATH || './memory/jarvis_memory.json',
  LOGS_PATH:          process.env.LOGS_PATH || './logs/',
  SCHEDULER_ENABLED:  process.env.SCHEDULER_ENABLED !== 'false',
  MAX_RETRIES:        parseInt(process.env.MAX_RETRIES || '3', 10),

  // Chrome paths
  CHROME_PATH: process.env.CHROME_PATH ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  CHROME_PROFILES_DIR: process.env.CHROME_PROFILES_DIR ||
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\User Data`,

  // Common app paths
  APP_PATHS: {
    notepad:     'notepad.exe',
    paint:       'mspaint.exe',
    calculator:  'calc.exe',
    explorer:    'explorer.exe',
    taskmanager: 'taskmgr.exe',
    cmd:         'cmd.exe',
    powershell:  'powershell.exe',
    wordpad:     'wordpad.exe',
    vlc:         'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    vscode:      'code',
    spotify:     `${process.env.APPDATA}\\Spotify\\Spotify.exe`,
    discord:     `${process.env.LOCALAPPDATA}\\Discord\\Update.exe --processStart Discord.exe`,
    steam:       'C:\\Program Files (x86)\\Steam\\Steam.exe',
    edge:        'msedge.exe',
    firefox:     'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
  }
};

module.exports = Config;
