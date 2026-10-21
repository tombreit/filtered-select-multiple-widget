/**
 * Theme Switcher for FilteredSelectMultiple Demo
 * Handles loading themes, applying theme resources, and managing widget instances
 *
 * Each theme gets a fresh page load (?theme=…&disabled=1): framework resets and
 * Tailwind's runtime-injected styles cannot be cleanly removed once loaded.
 */

import * as widgetExports from './src/index.js';

const { FilteredSelectMultiple } = widgetExports;

export class ThemeSwitcher {
    constructor(options = {}) {
        this.themes = {};
        this.currentWidget = null;
        this.currentTheme = 'default';
        this.onThemeChange = options.onThemeChange || (() => { });
        this.themesUrl = options.themesUrl || './themes.json';
    }

    /**
     * Initialize the theme switcher
     */
    async init() {
        await this.loadThemes();

        const params = new URLSearchParams(location.search);
        const themeKey = params.get('theme') in this.themes ? params.get('theme') : 'default';

        // Disable before the widget is created, so it starts read-only
        const disabled = params.get('disabled') === '1';
        document.querySelector('#demo-select').disabled = disabled;
        const disabledToggle = document.getElementById('disabled-toggle');
        if (disabledToggle) disabledToggle.checked = disabled;

        await this.applyTheme(themeKey);
        this.setupEventListeners();
    }

    /**
     * Load theme configurations from JSON
     */
    async loadThemes() {
        try {
            const response = await fetch(this.themesUrl);
            this.themes = await response.json();
        } catch (error) {
            console.error('Failed to load themes:', error);
            throw error;
        }
    }

    /**
     * Apply a theme by key
     */
    async applyTheme(themeKey) {
        const theme = this.themes[themeKey];
        if (!theme) {
            throw new Error(`Theme not found: ${themeKey}`);
        }

        // Update navigation active state
        this.updateNavigation(themeKey);

        // Add JS scripts first (for frameworks like Tailwind that need to load before CSS)
        await this.loadScripts(theme.js);

        // Add CSS links after JS
        await this.loadStylesheets(theme.css);

        // Wait briefly to let external resources settle
        await this.waitForResources(150);

        // Create widget with the theme
        await this.createWidget(theme);

        // Update UI elements
        this.updateUI(theme);

        this.currentTheme = themeKey;
        this.onThemeChange(themeKey, theme);
    }

    /**
     * Update navigation button states
     */
    updateNavigation(activeThemeKey) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === activeThemeKey);
        });
    }

    /**
     * Load JavaScript resources
     */
    async loadScripts(scripts = []) {
        for (const scriptConfig of scripts) {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.setAttribute('data-theme-resource', 'true');

                if (scriptConfig.src) {
                    script.src = scriptConfig.src;
                    script.onload = resolve;
                    script.onerror = () => {
                        console.error('Script failed to load:', scriptConfig.src);
                        resolve(); // Continue anyway
                    };
                } else {
                    // Inline script
                    script.textContent = scriptConfig.content || '';
                    resolve();
                }

                document.head.appendChild(script);
            });
        }
    }

    /**
     * Load CSS stylesheets
     */
    async loadStylesheets(stylesheets = []) {
        for (const cssConfig of stylesheets) {
            await new Promise((resolve) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.setAttribute('data-theme-resource', 'true');

                if (cssConfig.href) {
                    link.href = cssConfig.href;
                    if (cssConfig.integrity) link.integrity = cssConfig.integrity;
                    if (cssConfig.crossorigin) link.crossOrigin = cssConfig.crossorigin;

                    link.onload = resolve;
                    link.onerror = () => {
                        console.error('CSS failed to load:', cssConfig.href);
                        resolve(); // Continue anyway
                    };
                }

                document.head.appendChild(link);
            });
        }
    }

    /**
     * Wait for resources to load
     */
    waitForResources(delay) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Create the widget with the given theme
     */
    async createWidget(theme) {
        // Import theme module if specified
        let themeModule = null;
        if (theme.themeModule) {
            themeModule = widgetExports[theme.themeModule];
            if (!themeModule) {
                console.warn(`Theme module '${theme.themeModule}' not found in exports.`);
            }
        }

        // Create new widget
        const select = document.querySelector('#demo-select');
        if (select) {
            const options = themeModule ? { theme: themeModule } : {};
            this.currentWidget = new FilteredSelectMultiple(select, options);
        } else {
            console.error('Select element not found!');
        }
    }

    /**
     * Update UI elements based on theme
     */
    updateUI(theme) {
        // Update description
        const descEl = document.getElementById('demo-description');
        if (descEl && theme.description) {
            descEl.textContent = theme.description;
        }

        // Update code example
        this.updateCodeExample(theme);
    }

    /**
     * Update the code example display
     */
    updateCodeExample(theme) {
        const codeEl = document.getElementById('code-example');
        if (!codeEl) return;

        const themeImport = theme.themeModule ? `, ${theme.themeModule}` : '';
        const optionBlock = theme.themeModule
            ? `, {\n  theme: ${theme.themeModule}\n}`
            : '';

        const select = document.querySelector('#demo-select');
        const disabledBlock = select?.disabled
            ? '\n\n// Read-only: the widget follows changes live\nselect.disabled = true;'
            : '';

        codeEl.textContent = `import { FilteredSelectMultiple${themeImport} } from "filtered-select-multiple-widget";

const select = document.querySelector("#demo-select");
new FilteredSelectMultiple(select${optionBlock});${disabledBlock}`;
    }

    /**
     * Setup event listeners for theme buttons
     */
    setupEventListeners() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const themeKey = btn.dataset.theme;
                if (!themeKey) return;

                // Reload with the new theme, keeping the other parameters
                const params = new URLSearchParams(location.search);
                if (themeKey === 'default') {
                    params.delete('theme');
                } else {
                    params.set('theme', themeKey);
                }
                location.search = params.toString();
            });
        });

        const disabledToggle = document.getElementById('disabled-toggle');
        if (disabledToggle) {
            disabledToggle.addEventListener('change', () => {
                // No rebuild needed: the widget follows `disabled` on its <select> itself
                document.querySelector('#demo-select').disabled = disabledToggle.checked;
                this.updateCodeExample(this.themes[this.currentTheme]);

                // Remember the state in the URL, so a theme switch keeps it
                const params = new URLSearchParams(location.search);
                if (disabledToggle.checked) {
                    params.set('disabled', '1');
                } else {
                    params.delete('disabled');
                }
                const query = params.toString();
                history.replaceState(null, '', query ? `?${query}` : location.pathname);
            });
        }
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Get available themes
     */
    getThemes() {
        return this.themes;
    }

    /**
     * Get current widget instance
     */
    getCurrentWidget() {
        return this.currentWidget;
    }
}
