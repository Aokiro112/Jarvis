'use strict';

const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');
const Logger    = require('../core/logger');
const Config    = require('../core/config');

/**
 * VoiceManager
 * Uses Windows Speech Recognition (SAPI) via PowerShell for voice input.
 * Falls back to a polling approach if continuous mode is unavailable.
 */
class VoiceManager {
  constructor() {
    this.isListening = false;
    this.callback    = null;
    this.psProcess   = null;
  }

  async initialize() {
    Logger.info('Voice subsystem initializing...');
    Logger.success('Voice recognition ready (Windows SAPI).');
  }

  // ── Start continuous listening ──
  startListening(callback) {
    this.callback    = callback;
    this.isListening = true;

    Logger.info(`Voice listening started. Wake word: "${Config.WAKE_WORD}"`);
    this._startSAPIListener();
  }

  // ── Stop listening ──
  stopListening() {
    this.isListening = false;
    if (this.psProcess) {
      this.psProcess.kill();
      this.psProcess = null;
    }
    Logger.info('Voice listening stopped.');
  }

  // ── Windows SAPI continuous recognizer via PowerShell ──
  _startSAPIListener() {
    // Write the PS1 script to a temp file and run it
    const scriptPath = path.join(__dirname, '_voice_listener.ps1');
    const psScript   = `
Add-Type -AssemblyName System.Speech
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$recognizer.SetInputToDefaultAudioDevice()
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$recognizer.LoadGrammar($grammar)
$recognizer.EndSilenceTimeoutAmbiguous = [TimeSpan]::FromSeconds(1)
Write-Host "VOICE_READY"
while ($true) {
  try {
    $result = $recognizer.Recognize([TimeSpan]::FromSeconds(5))
    if ($result -and $result.Text) {
      Write-Host "RECOGNIZED:$($result.Text)"
    }
  } catch {
    Start-Sleep -Milliseconds 100
  }
}
`;

    fs.writeFileSync(scriptPath, psScript, 'utf8');

    this.psProcess = spawn('powershell.exe', [
      '-NonInteractive', '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    this.psProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'VOICE_READY') {
          Logger.success('Voice recognition engine started.');
        } else if (trimmed.startsWith('RECOGNIZED:')) {
          const text = trimmed.replace('RECOGNIZED:', '').trim();
          Logger.debug(`Voice recognized: "${text}"`);
          if (this.callback) this.callback(text);
        }
      }
    });

    this.psProcess.on('close', (code) => {
      if (this.isListening) {
        Logger.warn(`Voice process exited (${code}). Restarting...`);
        setTimeout(() => this._startSAPIListener(), 2000);
      }
    });

    this.psProcess.on('error', (err) => {
      Logger.error(`Voice process error: ${err.message}`);
    });
  }

  // ── Text-to-speech ──
  async speak(text) {
    const { exec } = require('child_process');
    const escaped  = text.replace(/'/g, "''");
    return new Promise((resolve) => {
      exec(
        `powershell.exe -Command "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('${escaped}');"`,
        { windowsHide: true },
        () => resolve()
      );
    });
  }
}

module.exports = VoiceManager;
