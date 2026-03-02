/**
 * Simple Template Loader
 * Fetches and caches HTML templates from the templates folder
 */
const TemplateLoader = {
    cache: new Map(),

    /**
     * Load a template file
     * @param {string} name - Template filename without extension
     * @returns {Promise<string>} Template HTML content
     */
    async load(name) {
        if (this.cache.has(name)) {
            return this.cache.get(name);
        }

        const response = await fetch(`templates/${name}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load template: ${name}`);
        }

        const html = await response.text();
        this.cache.set(name, html);
        return html;
    },

    /**
     * Render a template into a container element
     * @param {string} templateName - Template filename
     * @param {string} containerId - Target container element ID
     * @param {object} data - Optional data for template variables
     */
    async render(templateName, containerId, data = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container not found: ${containerId}`);
            return;
        }

        let html = await this.load(templateName);

        // Replace template variables {{key}} with data values
        for (const [key, value] of Object.entries(data)) {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        container.innerHTML = html;

        // Dispatch event for post-render initialization
        container.dispatchEvent(new CustomEvent('template-loaded', {
            detail: {templateName, data}
        }));
    },

    /**
     * Load all main templates (header + footer)
     */
    async init() {
        try {
            await Promise.all([
                this.render('header', 'header-container'),
                this.render('footer', 'footer-container')
            ]);
            console.log('[Templates] All templates loaded');
            return true;
        } catch (error) {
            console.error('[Templates] Failed to load:', error);
            return false;
        }
    },

    /**
     * Task-only mode: load header only
     */
    async initTaskOnly() {
        try {
            await this.render('header', 'header-container');
            console.log('[Templates] Header loaded');
            return true;
        } catch (error) {
            console.error('[Templates] Failed to load header:', error);
            return false;
        }
    }
};

// Export for global use
window.TemplateLoader = TemplateLoader;
