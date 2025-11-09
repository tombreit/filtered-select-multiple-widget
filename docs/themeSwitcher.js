/**
 * Theme Switcher for FilteredSelectMultiple Demo
 * Handles loading themes, applying theme resources, and managing widget instances
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
        await this.applyTheme('default');
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

        // Reset layout to baseline styles before applying theme resources
        this.resetLayout();

        // Update navigation active state
        this.updateNavigation(themeKey);

        // Remove old theme resources
        this.removeThemeResources();

        // Add JS scripts first (for frameworks like Tailwind that need to load before CSS)
        await this.loadScripts(theme.js);

        // Add CSS links after JS
        await this.loadStylesheets(theme.css);

        // Wait briefly to let external resources settle
        await this.waitForResources(150);

        // Recreate widget with new theme
        await this.recreateWidget(theme);

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
     * Remove all theme-specific resources
     */
    removeThemeResources() {
        document.querySelectorAll('[data-theme-resource]').forEach(el => el.remove());
    }

    /**
     * Load JavaScript resources
     */
    async loadScripts(scripts = []) {
        for (const scriptConfig of scripts) {
            await new Promise((resolve, reject) => {
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
            await new Promise((resolve, reject) => {
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
     * Reset layout to baseline styles
     */
    resetLayout() {
        document.body.className = '';

        const container = document.getElementById('demo-container');
        if (container) {
            container.className = 'demo-container';
        }

        const card = document.getElementById('demo-card');
        if (card) {
            card.className = 'demo-card';
        }
    }

    /**
     * Wait for resources to load
     */
    waitForResources(delay) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Recreate the widget with new theme
     */
    async recreateWidget(theme) {
        // Destroy old widget
        if (this.currentWidget) {
            this.currentWidget.destroy();
            this.currentWidget = null;
        }

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

        codeEl.textContent = `import { FilteredSelectMultiple${themeImport} } from "filtered-select-multiple-widget";

const select = document.querySelector("#demo-select");
new FilteredSelectMultiple(select${optionBlock});`;
    }

    /**
     * Setup event listeners for theme buttons
     */
    setupEventListeners() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const themeKey = btn.dataset.theme;
                if (themeKey) {
                    this.applyTheme(themeKey).catch(error => {
                        console.error('Failed to apply theme:', themeKey, error);
                    });
                }
            });
        });
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
