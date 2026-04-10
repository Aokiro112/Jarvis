#!/usr/bin/env node
'use strict';

/**
 * Install Jarvis to Windows Startup
 * Run: node scripts/install-startup.js
 */

const { exec } = require('child_process');
const path     = require('path');
const fs       = require('fs');
const chalk    = require('chalk');

const JARVIS_DIR  = path.resolve('.');
const JARVIS_MAIN = path.join(JARVIS_DIR, 'index.js');
const NODE_EXE    = process.execPath;
const STARTUP_DIR = `${process.env.APPDATA}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup`;

async function installStartup() {
  console.log(chalk.cyan('\n  Installing Jarvis to Windows Startup...\n'));

  // Method 1: Registry
  const regKey  = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  const regCmd  = `reg add "${regKey}" /v "JarvisAI" /t REG_SZ /d "\\"${NODE_EXE}\\" \\"${JARVIS_MAIN}\\"" /f`;

  exec(regCmd, (err) => {
    if (err) {
      console.log(chalk.yellow('  Registry method failed. Trying Startup folder...'));
      _installViaStartupFolder();
    } else {
      console.log(chalk.green('  ✓ Jarvis added to Windows Registry startup'));
      console.log(chalk.gray(`    Key: ${regKey}\\JarvisAI`));
      console.log(chalk.gray(`    Value: "${NODE_EXE}" "${JARVIS_MAIN}"`));
    }
  });
}

function _installViaStartupFolder() {
  // Method 2: Startup folder shortcut via VBScript
  const vbsPath = path.join(JARVIS_DIR, '_create_shortcut.vbs');
  const vbsContent = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${STARTUP_DIR.replace(/\\/g, '\\\\')}\\JarvisAI.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${NODE_EXE.replace(/\\/g, '\\\\')}"
oLink.Arguments = "\\"${JARVIS_MAIN.replace(/\\/g, '\\\\')}\\"" 
oLink.WorkingDirectory = "${JARVIS_DIR.replace(/\\/g, '\\\\')}"
oLink.WindowStyle = 1
oLink.Description = "JARVIS AI Assistant"
oLink.Save
WScript.Echo "Shortcut created: " & sLinkFile
`;
  fs.writeFileSync(vbsPath, vbsContent, 'utf8');

  exec(`cscript //nologo "${vbsPath}"`, (err, stdout) => {
    fs.unlinkSync(vbsPath); // cleanup
    if (err) {
      console.log(chalk.red('  ✗ Startup installation failed.'));
      console.log(chalk.yellow('  Tip: Run as Administrator for full access.'));
    } else {
      console.log(chalk.green('  ✓ ' + stdout.trim()));
    }
  });
}

function uninstallStartup() {
  console.log(chalk.yellow('\n  Removing Jarvis from Windows Startup...\n'));

  const regCmd = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "JarvisAI" /f`;
  exec(regCmd, (err) => {
    if (err) {
      console.log(chalk.yellow('  Registry entry not found.'));
    } else {
      console.log(chalk.green('  ✓ Registry entry removed'));
    }
  });

  const shortcutPath = `${STARTUP_DIR}\\JarvisAI.lnk`;
  if (fs.existsSync(shortcutPath)) {
    fs.unlinkSync(shortcutPath);
    console.log(chalk.green('  ✓ Startup shortcut removed'));
  }
}

const arg = process.argv[2];
if (arg === '--uninstall') {
  uninstallStartup();
} else {
  installStartup();
}
