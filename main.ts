'use strict';

var obsidian = require('obsidian');

class MarkwhenSyncSettings {
    constructor() {
        this.markwhenPath = 'timeline.mw';
        this.notesFolderPath = 'notes';
        this.enableBidirectionalSync = true;
        this.enableAutoSync = false;
        this.autoSyncInterval = '60';
        this.customProperty = 'status';

        this.tagConfig = {
            propertyName: 'tags',
            tags: [],
            requireAllTags: false
        };

        this.groupingConfig = {
            enabled: false,
            propertyName: 'group',
            sortBy: 'date',
            sortEntriesBy: 'date'
        };

        this.formattingConfig = {
            showStatusTags: true,
            dateFormat: 'YYYY-MM-DD',
            groupStartText: 'group',
            groupEndText: 'end group'
        };

        this.filterConfig = {
            excludeStatus: [],
            enableDateFilter: false,
            dateFilterType: 'all',
            excludeFolders: []
        };

        this.notificationConfig = {
            enabled: true,
            detailLevel: 'normal',
            showErrors: true
        };

        this.debugConfig = {
            enabled: false,
            logLevel: 'error',
            dryRun: false
        };
    }
}

class MarkwhenSyncSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Basic Settings' });
        this.addBasicSettings(containerEl);

        containerEl.createEl('h2', { text: 'Synchronization Settings' });
        this.addSyncSettings(containerEl);

        containerEl.createEl('h2', { text: 'Tag Configuration' });
        this.addTagSettings(containerEl);

        containerEl.createEl('h2', { text: 'Grouping Settings' });
        this.addGroupingSettings(containerEl);

        containerEl.createEl('h2', { text: 'Format Settings' });
        this.addFormatSettings(containerEl);

        containerEl.createEl('h2', { text: 'Filter Settings' });
        this.addFilterSettings(containerEl);

        containerEl.createEl('h2', { text: 'Notification Settings' });
        this.addNotificationSettings(containerEl);

        containerEl.createEl('h2', { text: 'Debug Settings' });
        this.addDebugSettings(containerEl);
    }

    addBasicSettings(containerEl) {
        new obsidian.Setting(containerEl)
            .setName('Timeline file path')
            .setDesc('Path to your Markwhen timeline file')
            .addText(text => text
                .setPlaceholder('timeline.mw')
                .setValue(this.plugin.settings.markwhenPath)
                .onChange(async (value) => {
                    this.plugin.settings.markwhenPath = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Notes folder path')
            .setDesc('Path to your notes folder')
            .addText(text => text
                .setPlaceholder('notes')
                .setValue(this.plugin.settings.notesFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.notesFolderPath = value;
                    await this.plugin.saveSettings();
                }));
    }

    addSyncSettings(containerEl) {
        new obsidian.Setting(containerEl)
            .setName('Enable bidirectional sync')
            .setDesc('Sync changes in both directions, otherwise the synchronisations is only from the notes to the timeline')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableBidirectionalSync)
                .onChange(async (value) => {
                    this.plugin.settings.enableBidirectionalSync = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Enable auto sync')
            .setDesc('Automatically sync when files change')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAutoSync)
                .onChange(async (value) => {
                    this.plugin.settings.enableAutoSync = value;
                    await this.plugin.saveSettings();
                    this.plugin.setupAutoSync();
                }));

        new obsidian.Setting(containerEl)
            .setName('Auto sync interval')
            .setDesc('Interval in seconds for auto sync')
            .addText(text => text
                .setPlaceholder('60')
                .setValue(this.plugin.settings.autoSyncInterval)
                .onChange(async (value) => {
                    if (!isNaN(value) && parseInt(value) > 0) {
                        this.plugin.settings.autoSyncInterval = value;
                        await this.plugin.saveSettings();
                        this.plugin.setupAutoSync();
                    }
                }));
    }
    addTagSettings(containerEl) {
        new obsidian.Setting(containerEl)
            .setName('Tags property name')
            .setDesc('Name of the frontmatter property that contains tags')
            .addText(text => text
                .setPlaceholder('tags')
                .setValue(this.plugin.settings.tagConfig.propertyName)
                .onChange(async (value) => {
                    this.plugin.settings.tagConfig.propertyName = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Required tags')
            .setDesc('Tags required for sync (comma-separated)')
            .addText(text => text
                .setPlaceholder('tag1, tag2')
                .setValue(this.plugin.settings.tagConfig.tags.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.tagConfig.tags = value.split(',').map(t => t.trim());
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Require all tags')
            .setDesc('Require all specified tags (instead of any)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.tagConfig.requireAllTags)
                .onChange(async (value) => {
                    this.plugin.settings.tagConfig.requireAllTags = value;
                    await this.plugin.saveSettings();
                }));
    }

    addGroupingSettings(containerEl) {
        new obsidian.Setting(containerEl)
            .setName('Enable grouping')
            .setDesc('Group entries in timeline')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.groupingConfig.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.groupingConfig.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Grouping property')
            .setDesc('Property name for grouping')
            .addText(text => text
                .setPlaceholder('group')
                .setValue(this.plugin.settings.groupingConfig.propertyName)
                .onChange(async (value) => {
                    this.plugin.settings.groupingConfig.propertyName = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Group sort method')
            .setDesc('How to sort the groups')
            .addDropdown(dropdown => dropdown
                .addOption('date', 'By Date')
                .addOption('alpha', 'Alphabetically')
                .addOption('number', 'By Number')
                .setValue(this.plugin.settings.groupingConfig.sortBy)
                .onChange(async (value) => {
                    this.plugin.settings.groupingConfig.sortBy = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Entry sort method')
            .setDesc('How to sort entries within groups')
            .addDropdown(dropdown => dropdown
                .addOption('date', 'By Date')
                .addOption('alpha', 'Alphabetically')
                .setValue(this.plugin.settings.groupingConfig.sortEntriesBy)
                .onChange(async (value) => {
                    this.plugin.settings.groupingConfig.sortEntriesBy = value;
                    await this.plugin.saveSettings();
                }));
    }

    addFormatSettings(containerEl) {
        new obsidian.Setting(containerEl)
            .setName('Show status tags')
            .setDesc('Show status as tags in timeline')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.formattingConfig.showStatusTags)
                .onChange(async (value) => {
                    this.plugin.settings.formattingConfig.showStatusTags = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Date format')
            .setDesc('Format for dates in timeline')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.formattingConfig.dateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.formattingConfig.dateFormat = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Custom Property')
            .setDesc('Name of the custom frontmatter property to use for tags in timeline')
            .addText(text => text
                .setPlaceholder('status')
                .setValue(this.plugin.settings.customProperty)
                .onChange(async (value) => {
                    this.plugin.settings.customProperty = value;
                    await this.plugin.saveSettings();
                }));
    }

    addFilterSettings(containerEl) {
        new obsidian.Setting(containerEl)
            .setName('Excluded property value')
            .setDesc('Property values to exclude (comma-separated)')
            .addText(text => text
                .setPlaceholder('done, cancelled')
                .setValue(this.plugin.settings.filterConfig.excludeStatus.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.filterConfig.excludeStatus = value.split(',').map(s => s.trim());
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Enable date filter')
            .setDesc('Filter entries based on dates')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.filterConfig.enableDateFilter)
                .onChange(async (value) => {
                    this.plugin.settings.filterConfig.enableDateFilter = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Date filter type')
            .setDesc('Which entries to include based on date')
            .addDropdown(dropdown => dropdown
                .addOption('all', 'All')
                .addOption('future', 'Future only')
                .addOption('current', 'Current only')
                .setValue(this.plugin.settings.filterConfig.dateFilterType)
                .onChange(async (value) => {
                    this.plugin.settings.filterConfig.dateFilterType = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Excluded folders')
            .setDesc('Subfolders to exclude (comma-separated)')
            .addText(text => text
                .setPlaceholder('archive, temp')
                .setValue(this.plugin.settings.filterConfig.excludeFolders.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.filterConfig.excludeFolders = value.split(',').map(f => f.trim());
                    await this.plugin.saveSettings();
                }));
    }

    addNotificationSettings(containerEl) {
        new obsidian.Setting(containerEl)
            .setName('Enable notifications')
            .setDesc('Show notification popups')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.notificationConfig.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.notificationConfig.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Detail level')
            .setDesc('How detailed should notifications be')
            .addDropdown(dropdown => dropdown
                .addOption('minimal', 'Minimal')
                .addOption('normal', 'Normal')
                .addOption('detailed', 'Detailed')
                .setValue(this.plugin.settings.notificationConfig.detailLevel)
                .onChange(async (value) => {
                    this.plugin.settings.notificationConfig.detailLevel = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Show errors')
            .setDesc('Show error notifications')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.notificationConfig.showErrors)
                .onChange(async (value) => {
                    this.plugin.settings.notificationConfig.showErrors = value;
                    await this.plugin.saveSettings();
                }));
    }

    addDebugSettings(containerEl) {
        new obsidian.Setting(containerEl)
            .setName('Debug mode')
            .setDesc('Enable debug logging')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugConfig.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.debugConfig.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Log level')
            .setDesc('Level of debug logging')
            .addDropdown(dropdown => dropdown
                .addOption('error', 'Errors only')
                .addOption('warn', 'Warnings and errors')
                .addOption('info', 'General info')
                .addOption('debug', 'Detailed debug')
                .setValue(this.plugin.settings.debugConfig.logLevel)
                .onChange(async (value) => {
                    this.plugin.settings.debugConfig.logLevel = value;
                    await this.plugin.saveSettings();
                }));

        new obsidian.Setting(containerEl)
            .setName('Dry run')
            .setDesc('Simulate sync without making changes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugConfig.dryRun)
                .onChange(async (value) => {
                    this.plugin.settings.debugConfig.dryRun = value;
                    await this.plugin.saveSettings();
                }));
    }
}

class MarkwhenSync extends obsidian.Plugin {
    async onload() {
        this.lastSync = {
            notes: new Map(),
            timeline: ''
        };

        await this.loadSettings();

        this.addRibbonIcon('sync', 'Sync Timeline', async () => {
            await this.syncWithSettings();
        });

        this.addSettingTab(new MarkwhenSyncSettingTab(this.app, this));

        if (this.settings.enableAutoSync) {
            this.setupAutoSync();
        }

        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (this.settings.enableAutoSync) {
                    this.handleFileChange(file);
                }
            })
        );
    }

    async loadSettings() {
        this.settings = Object.assign(new MarkwhenSyncSettings(), await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    setupAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }
        const interval = parseInt(this.settings.autoSyncInterval) * 1000;
        this.autoSyncInterval = setInterval(() => this.syncWithSettings(), interval);
    }

    async handleFileChange(file) {
        if (file.path === this.settings.markwhenPath) {
            await this.syncFromMarkwhen();
        } else if (file.path.startsWith(this.settings.notesFolderPath)) {
            await this.syncToMarkwhen();
        }
    }

    async syncWithSettings() {
        await this.syncToMarkwhen();
        if (this.settings.enableBidirectionalSync) {
            await this.syncFromMarkwhen();
        }
    }

    async collectEntries() {
        const entries = [];
        const notesFolder = this.app.vault.getAbstractFileByPath(this.settings.notesFolderPath);

        if (!notesFolder) {
            throw new Error('Notes folder not found');
        }

        const scanFolder = async (folder) => {
            for (const child of folder.children) {
                if (child instanceof obsidian.TFile && child.extension === 'md') {
                    const metadata = this.app.metadataCache.getFileCache(child)?.frontmatter;
                    if (this.isValidEntry(metadata)) {
                        entries.push({
                            file: child,
                            metadata: metadata,
                            title: child.basename
                        });
                    }
                } else if (child instanceof obsidian.TFolder) {
                    if (!this.settings.filterConfig.excludeFolders.includes(child.name)) {
                        await scanFolder(child);
                    }
                }
            }
        };

        await scanFolder(notesFolder);
        return entries;
    }

    formatDate(date, isEndDate = false) {
        if (!date) return date;

        if (/^\d{4}$/.test(date)) {
            return isEndDate ? `${date}-12-31` : `${date}-01-01`;
        }

        if (/^\d{4}-\d{2}$/.test(date)) {
            if (isEndDate) {
                const [year, month] = date.split('-').map(Number);
                const nextMonth = month === 12 ? '01' : String(month + 1).padStart(2, '0');
                const nextYear = month === 12 ? year + 1 : year;
                return `${nextYear}-${nextMonth}-01`;
            }
            return `${date}-01`;
        }

        return date;
    }

    async syncToMarkwhen() {
        try {
            const entries = await this.collectEntries();
            const newContent = await this.generateTimelineContent(entries);

            const markwhenFile = this.app.vault.getAbstractFileByPath(this.settings.markwhenPath);
            if (!markwhenFile) return;

            const currentContent = await this.app.vault.read(markwhenFile);

            if (this.lastSync.timeline !== currentContent) {
                return;
            }

            if (newContent.trim() !== currentContent.trim()) {
                await this.app.vault.modify(markwhenFile, newContent.trim());
                this.lastSync.timeline = newContent.trim();
                if (this.settings.notificationConfig.enabled) {
                    new obsidian.Notice('Timeline synchronized');
                }
            }
        } catch (error) {
            console.error('Sync to Markwhen error:', error);
            if (this.settings.notificationConfig.showErrors) {
                new obsidian.Notice('Error during synchronization to timeline');
            }
        }
    }

    async syncFromMarkwhen() {
        try {
            const markwhenFile = this.app.vault.getAbstractFileByPath(this.settings.markwhenPath);
            if (!markwhenFile) return;

            const content = await this.app.vault.read(markwhenFile);
            const timelineEvents = this.parseMarkwhenContent(content);

            for (const event of timelineEvents) {
                await this.updateNoteFromEvent(event);
            }

            this.lastSync.timeline = content;
        } catch (error) {
            console.error('Sync from Markwhen error:', error);
            if (this.settings.notificationConfig.showErrors) {
                new obsidian.Notice('Error during synchronization from timeline');
            }
        }
    }

    parseMarkwhenContent(content) {
        const events = [];
        const lines = content.split('\n');
        let currentGroup = null;

        for (const line of lines) {
            if (line.startsWith('group ')) {
                currentGroup = line.substring(6).trim();
            } else if (line === 'end group') {
                currentGroup = null;
            } else if (line.includes(':')) {
                const [dateRange, title] = line.split(':').map(s => s.trim());
                const [startDate, endDate] = dateRange.split('/').map(s => s.trim());
                const noteName = title.match(/\[\[(.*?)\]\]/)?.[1];

                if (noteName) {
                    events.push({
                        startDate,
                        endDate,
                        noteName,
                        group: currentGroup,
                        status: line.match(/#(\w+)/)?.[1]
                    });
                }
            }
        }
        return events;
    }

    async updateNoteFromEvent(event) {
        const notePath = `${this.settings.notesFolderPath}/${event.noteName}.md`;
        const noteFile = this.app.vault.getAbstractFileByPath(notePath);

        if (!noteFile) return;

        const content = await this.app.vault.read(noteFile);
        const frontmatter = this.app.metadataCache.getFileCache(noteFile)?.frontmatter;

        if (!frontmatter ||
            frontmatter.date !== event.startDate ||
            frontmatter.endDate !== event.endDate ||
            (event.group && frontmatter[this.settings.groupingConfig.propertyName] !== event.group)) {

            const newFrontmatter = {
                ...frontmatter,
                date: event.startDate,
                endDate: event.endDate
            };

            if (event.group) {
                newFrontmatter[this.settings.groupingConfig.propertyName] = event.group;
            }

            const newContent = this.updateFrontmatter(content, newFrontmatter);
            await this.app.vault.modify(noteFile, newContent);
        }
    }

    updateFrontmatter(content, frontmatter) {
        const yamlStr = '---\n' + Object.entries(frontmatter)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n') + '\n---';

        if (content.startsWith('---')) {
            const endIndex = content.indexOf('---', 3) + 3;
            return yamlStr + content.substring(endIndex);
        }
        return yamlStr + '\n' + content;
    }

    async generateTimelineContent(entries) {
        let content = '';

        if (this.settings.groupingConfig.enabled) {
            const grouped = await this.groupEntries(entries);
            for (const [group, groupEntries] of grouped) {
                content += `\ngroup ${group}\n`;
                content += this.formatEntries(groupEntries);
                content += 'end group\n';
            }
        } else {
            content = this.formatEntries(entries);
        }

        return content.trim();
    }

    async groupEntries(entries) {
        const grouped = new Map();

        for (const entry of entries) {
            const groupValue = entry.metadata[this.settings.groupingConfig.propertyName] || 'Ungrouped';
            if (!grouped.has(groupValue)) {
                grouped.set(groupValue, []);
            }
            grouped.get(groupValue).push(entry);
        }

        return new Map([...grouped.entries()].sort((a, b) => {
            if (this.settings.groupingConfig.sortBy === 'alpha') {
                return a[0].localeCompare(b[0]);
            } else if (this.settings.groupingConfig.sortBy === 'number') {
                return parseInt(a[0]) - parseInt(b[0]);
            }
            return 0;
        }));
    }

    formatEntries(entries) {
        const sortedEntries = [...entries].sort((a, b) => {
            if (this.settings.groupingConfig.sortEntriesBy === 'date') {
                return new Date(a.metadata.date) - new Date(b.metadata.date);
            } else if (this.settings.groupingConfig.sortEntriesBy === 'alpha') {
                return a.title.localeCompare(b.title);
            }
            return 0;
        });

        let content = '';
        for (const entry of sortedEntries) {
            const startDate = this.formatDate(entry.metadata.date);
            const endDate = this.formatDate(entry.metadata.endDate, true);
            // Hier verwenden wir das customProperty anstelle des hartcodierten 'status'
            const customPropertyValue = entry.metadata[this.settings.customProperty];
            const statusTag = this.settings.formattingConfig.showStatusTags && customPropertyValue
                ? ` #${customPropertyValue.replace(/\s+/g, '-')}`
                : '';
            content += `${startDate}/${endDate}: [[${entry.title}]]${statusTag}\n`;
        }
        return content;
    }

    isValidEntry(metadata) {
        if (!metadata) return false;
        if (!metadata.date || !metadata.endDate) return false;

        // Hier verwenden wir das customProperty für die Status-Überprüfung
        const customPropertyValue = metadata[this.settings.customProperty];
        if (customPropertyValue && this.settings.filterConfig.excludeStatus.includes(customPropertyValue.toLowerCase())) {
            return false;
        }

        const entryTags = metadata[this.settings.tagConfig.propertyName] || [];

        if (this.settings.tagConfig.tags.length > 0) {
            if (this.settings.tagConfig.requireAllTags) {
                return this.settings.tagConfig.tags.every(tag =>
                    Array.isArray(entryTags) ? entryTags.includes(tag) : entryTags === tag
                );
            } else {
                return this.settings.tagConfig.tags.some(tag =>
                    Array.isArray(entryTags) ? entryTags.includes(tag) : entryTags === tag
                );
            }
        }

        return true;
    }

    onunload() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }
    }
}

module.exports = MarkwhenSync;
