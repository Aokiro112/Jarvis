'use strict';

const Logger         = require('../core/logger');
const AppController  = require('./appController');
const FileController = require('./fileController');
const WindowCtrl     = require('./windowController');
const SystemCtrl     = require('./systemController');
const UIAutomation   = require('./uiAutomation');
const ChromeCtrl     = require('./chromeController');
const BrowserCtrl    = require('./browserController');
const ScreenshotCtrl = require('./screenshotController');
const PowerShellCtrl = require('./powerShellController');

/**
 * ExecutionEngine
 * Routes parsed action objects to the correct handler module
 */
class ExecutionEngine {
  constructor() {
    this.handlers = {};
  }

  async initialize() {
    Logger.info('Execution engine initializing...');

    this.appCtrl       = new AppController();
    this.fileCtrl      = new FileController();
    this.windowCtrl    = new WindowCtrl();
    this.systemCtrl    = new SystemCtrl();
    this.uiAuto        = new UIAutomation();
    this.chromeCtrl    = new ChromeCtrl();
    this.browserCtrl   = new BrowserCtrl();
    this.screenshotCtrl = new ScreenshotCtrl();
    this.psCtrl        = new PowerShellCtrl();

    // Register action → handler mappings
    this._registerHandlers();
    Logger.success('Execution engine ready.');
  }

  _registerHandlers() {
    // App control
    this.handlers['open_app']            = (a) => this.appCtrl.openApp(a);
    this.handlers['close_app']           = (a) => this.appCtrl.closeApp(a);
    this.handlers['kill_process']        = (a) => this.appCtrl.killProcess(a);

    // Chrome profiles
    this.handlers['open_chrome_profile'] = (a) => this.chromeCtrl.openProfile(a);

    // File system
    this.handlers['create_file']         = (a) => this.fileCtrl.createFile(a);
    this.handlers['delete_file']         = (a) => this.fileCtrl.deleteFile(a);
    this.handlers['open_file']           = (a) => this.fileCtrl.openFile(a);
    this.handlers['open_folder']         = (a) => this.fileCtrl.openFolder(a);
    this.handlers['list_files']          = (a) => this.fileCtrl.listFiles(a);
    this.handlers['copy_file']           = (a) => this.fileCtrl.copyFile(a);
    this.handlers['move_file']           = (a) => this.fileCtrl.moveFile(a);
    this.handlers['rename_file']         = (a) => this.fileCtrl.renameFile(a);
    this.handlers['create_folder']       = (a) => this.fileCtrl.createFolder(a);
    this.handlers['delete_folder']       = (a) => this.fileCtrl.deleteFolder(a);
    this.handlers['write_to_file']       = (a) => this.fileCtrl.writeToFile(a);

    // Window management
    this.handlers['minimize_window']     = (a) => this.windowCtrl.minimize(a);
    this.handlers['maximize_window']     = (a) => this.windowCtrl.maximize(a);
    this.handlers['close_window']        = (a) => this.windowCtrl.close(a);
    this.handlers['focus_window']        = (a) => this.windowCtrl.focus(a);
    this.handlers['list_windows']        = (a) => this.windowCtrl.listWindows(a);
    this.handlers['tile_windows']        = (a) => this.windowCtrl.tile(a);

    // System
    this.handlers['shutdown']            = (a) => this.systemCtrl.shutdown(a);
    this.handlers['restart']             = (a) => this.systemCtrl.restart(a);
    this.handlers['sleep']               = (a) => this.systemCtrl.sleep(a);
    this.handlers['lock_screen']         = (a) => this.systemCtrl.lockScreen(a);
    this.handlers['logout']              = (a) => this.systemCtrl.logout(a);
    this.handlers['set_volume']          = (a) => this.systemCtrl.setVolume(a);
    this.handlers['mute_volume']         = (a) => this.systemCtrl.muteVolume(a);
    this.handlers['unmute_volume']       = (a) => this.systemCtrl.unmuteVolume(a);
    this.handlers['empty_recycle_bin']   = (a) => this.systemCtrl.emptyRecycleBin(a);
    this.handlers['get_system_info']     = (a) => this.systemCtrl.getSystemInfo(a);
    this.handlers['get_battery']         = (a) => this.systemCtrl.getBattery(a);
    this.handlers['get_network_info']    = (a) => this.systemCtrl.getNetworkInfo(a);
    this.handlers['get_running_processes'] = (a) => this.systemCtrl.getProcesses(a);
    this.handlers['get_disk_info']       = (a) => this.systemCtrl.getDiskInfo(a);
    this.handlers['open_settings']       = (a) => this.systemCtrl.openSettings(a);
    this.handlers['open_control_panel']  = (a) => this.systemCtrl.openControlPanel(a);
    this.handlers['open_task_manager']   = (a) => this.systemCtrl.openTaskManager(a);
    this.handlers['open_device_manager'] = (a) => this.systemCtrl.openDeviceManager(a);
    this.handlers['set_environment_variable'] = (a) => this.systemCtrl.setEnvVar(a);
    this.handlers['set_wallpaper']       = (a) => this.systemCtrl.setWallpaper(a);

    // UI Automation
    this.handlers['type_text']           = (a) => this.uiAuto.typeText(a);
    this.handlers['press_key']           = (a) => this.uiAuto.pressKey(a);
    this.handlers['click']               = (a) => this.uiAuto.click(a);
    this.handlers['move_mouse']          = (a) => this.uiAuto.moveMouse(a);
    this.handlers['scroll']              = (a) => this.uiAuto.scroll(a);
    this.handlers['hotkey']              = (a) => this.uiAuto.hotkey(a);
    this.handlers['copy_to_clipboard']   = (a) => this.uiAuto.copyToClipboard(a);

    // Browser
    this.handlers['open_url']            = (a) => this.browserCtrl.openUrl(a);
    this.handlers['search_web']          = (a) => this.browserCtrl.searchWeb(a);

    // Screenshots
    this.handlers['take_screenshot']     = (a) => this.screenshotCtrl.take(a);
    this.handlers['take_screenshot_region'] = (a) => this.screenshotCtrl.takeRegion(a);

    // PowerShell / CMD
    this.handlers['run_powershell']      = (a) => this.psCtrl.runPowerShell(a);
    this.handlers['run_cmd']             = (a) => this.psCtrl.runCmd(a);

    // Misc
    this.handlers['speak']               = (a) => this._speak(a);
    this.handlers['notify']              = (a) => this._notify(a);
  }

  // ── Route action to handler ──
  async execute(action) {
    const handler = this.handlers[action.action];
    if (!handler) {
      // Try PowerShell fallback for unknown actions
      Logger.warn(`No handler for action: ${action.action}. Attempting PS fallback.`);
      return await this.psCtrl.runPowerShell({ command: action.command || action.action });
    }

    try {
      const result = await handler(action);
      return result || { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── TTS via Windows SAPI ──
  async _speak(action) {
    const text = action.text || '';
    if (!text) return { success: true };
    await this.psCtrl.runPowerShell({
      command: `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Speak('${text.replace(/'/g, "''")}');`
    });
    return { success: true };
  }

  // ── Windows Toast Notification ──
  async _notify(action) {
    const title   = action.title || 'Jarvis';
    const message = action.message || '';
    const ps = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName('text')
$textNodes.Item(0).AppendChild($template.CreateTextNode('${title.replace(/'/g, "''")}')) | Out-Null
$textNodes.Item(1).AppendChild($template.CreateTextNode('${message.replace(/'/g, "''")}')) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Jarvis').Show($toast)
`;
    await this.psCtrl.runPowerShell({ command: ps }).catch(() => {});
    return { success: true };
  }
}

module.exports = ExecutionEngine;
