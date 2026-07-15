/* INTERIUM_MAIN */
(() => {
  'use strict';

  const LOG = '[Interium]';
  const SETTINGS_KEY = 'interium.settings.v1';
  const DEFAULTS = Object.freeze({
    enabled: true,
    compactNavigation: false,
    reduceMotion: false,
    accentColor: '#5e9fe8'
  });

  const safeParse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const storage = {
    get() {
      const stored = typeof GM_getValue === 'function'
        ? GM_getValue(SETTINGS_KEY, '{}')
        : localStorage.getItem(SETTINGS_KEY) || '{}';
      return { ...DEFAULTS, ...safeParse(stored, {}) };
    },
    set(next) {
      const clean = { ...DEFAULTS, ...next };
      const serialized = JSON.stringify(clean);
      if (typeof GM_setValue === 'function') GM_setValue(SETTINGS_KEY, serialized);
      else localStorage.setItem(SETTINGS_KEY, serialized);
      return clean;
    },
    reset() { return this.set(DEFAULTS); }
  };

  let settings = storage.get();

  function applySettings() {
    let style = document.getElementById('interium-core-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'interium-core-style';
      document.head.appendChild(style);
    }
    if (!settings.enabled) { style.textContent = ''; return; }
    const accent = /^#[0-9a-f]{6}$/i.test(settings.accentColor) ? settings.accentColor : DEFAULTS.accentColor;
    style.textContent = `
      :root { --interium-accent: ${accent}; }
      ${settings.compactNavigation ? 'nav { min-height: 48px !important; } nav a { padding-top: 8px !important; padding-bottom: 8px !important; }' : ''}
      ${settings.reduceMotion ? '*, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }' : ''}
    `;
  }

  function promptForSettings() {
    const current = settings;
    const accent = prompt('Interium accent color (hex)', current.accentColor);
    if (accent === null) return;
    if (!/^#[0-9a-f]{6}$/i.test(accent.trim())) {
      console.warn(LOG, 'Settings unchanged: accent must look like #5e9fe8.');
      return;
    }
    settings = storage.set({ ...current, accentColor: accent.trim() });
    applySettings();
    console.info(LOG, 'Settings saved locally.');
  }

  window.Interium = Object.freeze({
    version: '1.0.0',
    getSettings: () => ({ ...settings }),
    setSettings: (patch) => { settings = storage.set({ ...settings, ...patch }); applySettings(); return { ...settings }; },
    resetSettings: () => { settings = storage.reset(); applySettings(); return { ...settings }; }
  });

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Interium: edit appearance', promptForSettings);
    GM_registerMenuCommand('Interium: toggle enabled', () => {
      settings = storage.set({ ...settings, enabled: !settings.enabled });
      applySettings();
      console.info(LOG, settings.enabled ? 'Enabled.' : 'Disabled.');
    });
    GM_registerMenuCommand('Interium: reset settings', () => {
      settings = storage.reset(); applySettings(); console.info(LOG, 'Settings reset.');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applySettings, { once: true });
  else applySettings();
  console.info(LOG, 'Core loaded. Settings stay in Tampermonkey/localStorage.');
})();
