'use strict';

const { Plugin, PluginSettingTab, Setting, Notice } = require('obsidian');

// Settings Definition
class MilestoneTimelineSyncSettings {
    constructor() {
        // Basic Paths
        this.markwhenPath = '3_Areas/02_Zielsetzung/Zielsetzung (Meilensteine).mw';
        this.milestonesPath = '3_Areas/02_Zielsetzung/Meilensteine';

        // Sync Options
        this.enableBidirectionalSync = true;
        this.enableAutoSync = false;
        this.autoSyncInterval = '60'; // seconds

        // Tag Configuration
        this.tagConfig = {
            tags: ['goal', 'focus'],
            requireAllTags: false
        };

        // Grouping Settings
        this.groupingConfig = {
            enabled: true,
            propertyName: 'Jahresziel',
            sortBy: 'number', // 'number', 'alpha', 'date'
            sortEntriesBy: 'date' // 'date', 'alpha'
        };

        // Formatting Options
        this.formattingConfig = {
            showStatusTags: true,
            dateFormat: 'YYYY-MM-DD',
            groupStartText: 'group',
            groupEndText: 'end group'
        };

        // Filter Options
        this.filterConfig = {
            excludeStatus: ['done'],
            enableDateFilter: false,
            dateFilterType: 'all', // 'all', 'future', 'current'
            excludeFolders: []
        };

        // Notification Settings
        this.notificationConfig = {
            enabled: true,
            detailLevel: 'normal', // 'minimal', 'normal', 'detailed'
            showErrors: true
        };

        // Debug Options
        this.debugConfig = {
            enabled: false,
            logLevel: 'error', // 'error', 'warn', 'info', 'debug'
            dryRun: false
        };
    }
}

// Settings Tab Implementation
class MilestoneTimelineSyncSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;
        containerEl.empty();

        // Basic Settings
        containerEl.createEl('h2', {text: 'Basic Settings'});
        this.addBasicSettings(containerEl);

        // Sync Settings
        containerEl.createEl('h2', {text: 'Synchronization Settings'});
        this.addSyncSettings(containerEl);

        // Tag Settings
        containerEl.createEl('h2', {text: 'Tag Configuration'});
        this.addTagSettings(containerEl);

        // Grouping Settings
        containerEl.createEl('h2', {text: 'Grouping Settings'});
        this.addGroupingSettings(containerEl);

        // Format Settings
        containerEl.createEl('h2', {text: 'Format Settings'});
        this.addFormatSettings(containerEl);

        // Filter Settings
        containerEl.createEl('h2', {text: 'Filter Settings'});
        this.addFilterSettings(containerEl);

        // Notification Settings
        containerEl.createEl('h2', {text: 'Notification Settings'});
        this.addNotificationSettings(containerEl);

        // Debug Settings
        containerEl.createEl('h2', {text: 'Debug Settings'});
        this.addDebugSettings(containerEl);
    }
// Settings Tab Methods
    addBasicSettings(containerEl) {
        new Setting(containerEl)
            .setName('Markwhen file path')
            .setDesc('Path to your Markwhen timeline file')
            .addText(text => text
                .setPlaceholder('path/to/timeline.mw')
                .setValue(this.plugin.settings.markwhenPath)
                .onChange(async (value) => {
                    this.plugin.settings.markwhenPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Milestones folder path')
            .setDesc('Path to your milestones folder')
            .addText(text => text
                .setPlaceholder('path/to/milestones')
                .setValue(this.plugin.settings.milestonesPath)
                .onChange(async (value) => {
                    this.plugin.settings.milestonesPath = value;
                    await this.plugin.saveSettings();
                }));
    }

    addSyncSettings(containerEl) {
        new Setting(containerEl)
            .setName('Enable bidirectional sync')
            .setDesc('Sync changes in both directions')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableBidirectionalSync)
                .onChange(async (value) => {
                    this.plugin.settings.enableBidirectionalSync = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable auto sync')
            .setDesc('Automatically sync when files change')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAutoSync)
                .onChange(async (value) => {
                    this.plugin.settings.enableAutoSync = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto sync interval')
            .setDesc('Interval in seconds for auto sync (if enabled)')
            .addText(text => text
                .setPlaceholder('60')
                .setValue(this.plugin.settings.autoSyncInterval)
                .onChange(async (value) => {
                    if (!isNaN(value) && parseInt(value) > 0) {
                        this.plugin.settings.autoSyncInterval = value;
                        await this.plugin.saveSettings();
                    }
                }));
    }

    addTagSettings(containerEl) {
        new Setting(containerEl)
            .setName('Milestone tags')
            .setDesc('Tags to identify milestone files (comma-separated)')
            .addText(text => text
                .setPlaceholder('goal, focus')
                .setValue(this.plugin.settings.tagConfig.tags.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.tagConfig.tags = value.split(',').map(t => t.trim());
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
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
        new Setting(containerEl)
            .setName('Enable grouping')
            .setDesc('Group milestones in timeline')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.groupingConfig.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.groupingConfig.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Grouping property')
            .setDesc('Property name used for grouping')
            .addText(text => text
                .setPlaceholder('Jahresziel')
                .setValue(this.plugin.settings.groupingConfig.propertyName)
                .onChange(async (value) => {
                    this.plugin.settings.groupingConfig.propertyName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Group sort method')
            .setDesc('How to sort the groups')
            .addDropdown(dropdown => dropdown
                .addOption('number', 'By Number')
                .addOption('alpha', 'Alphabetically')
                .addOption('date', 'By Date')
                .setValue(this.plugin.settings.groupingConfig.sortBy)
                .onChange(async (value) => {
                    this.plugin.settings.groupingConfig.sortBy = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
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
        new Setting(containerEl)
            .setName('Show status tags')
            .setDesc('Show status as tags in timeline')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.formattingConfig.showStatusTags)
                .onChange(async (value) => {
                    this.plugin.settings.formattingConfig.showStatusTags = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Date format')
            .setDesc('Format for dates in timeline')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.formattingConfig.dateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.formattingConfig.dateFormat = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Group start text')
            .setDesc('Text used to start a group')
            .addText(text => text
                .setPlaceholder('group')
                .setValue(this.plugin.settings.formattingConfig.groupStartText)
                .onChange(async (value) => {
                    this.plugin.settings.formattingConfig.groupStartText = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Group end text')
            .setDesc('Text used to end a group')
            .addText(text => text
                .setPlaceholder('end group')
                .setValue(this.plugin.settings.formattingConfig.groupEndText)
                .onChange(async (value) => {
                    this.plugin.settings.formattingConfig.groupEndText = value;
                    await this.plugin.saveSettings();
                }));
    }
addFilterSettings(containerEl) {
        new Setting(containerEl)
            .setName('Excluded status values')
            .setDesc('Status values to exclude (comma-separated)')
            .addText(text => text
                .setPlaceholder('done, cancelled')
                .setValue(this.plugin.settings.filterConfig.excludeStatus.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.filterConfig.excludeStatus = value.split(',').map(s => s.trim());
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable date filtering')
            .setDesc('Filter milestones based on dates')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.filterConfig.enableDateFilter)
                .onChange(async (value) => {
                    this.plugin.settings.filterConfig.enableDateFilter = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Date filter type')
            .setDesc('Which milestones to include based on date')
            .addDropdown(dropdown => dropdown
                .addOption('all', 'All')
                .addOption('future', 'Future only')
                .addOption('current', 'Current only')
                .setValue(this.plugin.settings.filterConfig.dateFilterType)
                .onChange(async (value) => {
                    this.plugin.settings.filterConfig.dateFilterType = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
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
        new Setting(containerEl)
            .setName('Enable notifications')
            .setDesc('Show notification popups')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.notificationConfig.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.notificationConfig.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Notification detail level')
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

        new Setting(containerEl)
            .setName('Show error notifications')
            .setDesc('Show notifications for errors')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.notificationConfig.showErrors)
                .onChange(async (value) => {
                    this.plugin.settings.notificationConfig.showErrors = value;
                    await this.plugin.saveSettings();
                }));
    }

    addDebugSettings(containerEl) {
        new Setting(containerEl)
            .setName('Enable debug mode')
            .setDesc('Enable detailed logging')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugConfig.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.debugConfig.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Log level')
            .setDesc('Level of detail for logging')
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

        new Setting(containerEl)
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

class MilestoneTimelineSync extends Plugin {
    async onload() {
        console.log('Loading MilestoneTimelineSync');

        await this.loadSettings();

        // Add ribbon icon
        this.addRibbonIcon('sync', 'Sync Milestones with Timeline', async () => {
            await this.syncWithSettings();
        });

        // Add settings tab
        this.addSettingTab(new MilestoneTimelineSyncSettingTab(this.app, this));

        // Setup auto sync if enabled
        this.setupAutoSync();
    }

    async loadSettings() {
        this.settings = Object.assign(new MilestoneTimelineSyncSettings(), await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.setupAutoSync(); // Refresh auto sync when settings change
    }

    setupAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
        }

        if (this.settings.enableAutoSync) {
            const interval = parseInt(this.settings.autoSyncInterval) * 1000;
            this.autoSyncInterval = setInterval(() => this.syncWithSettings(), interval);
        }
    }
// Main sync function that uses settings
    async syncWithSettings() {
        if (this.settings.debugConfig.enabled) {
            this.log('Starting sync with current settings...', 'info');
        }

        try {
            const markwhenFile = this.app.vault.getAbstractFileByPath(this.settings.markwhenPath);
            const milestonesFolder = this.app.vault.getAbstractFileByPath(this.settings.milestonesPath);
            
            if (!markwhenFile || !milestonesFolder) {
                this.showNotification('Required files not found', 'error');
                return;
            }

            // Read Timeline Events
            const markwhenContent = await this.app.vault.read(markwhenFile);
            const timelineEvents = this.parseTimelineEvents(markwhenContent);
            const markwhenStat = await this.app.vault.adapter.stat(this.settings.markwhenPath);
            
            // Collect Milestone Events
            const milestonesToSync = [];

            for (const child of milestonesFolder.children) {
                if (!this.shouldProcessFile(child)) continue;

                const metadata = this.app.metadataCache.getFileCache(child)?.frontmatter;
                if (!this.isValidMilestone(metadata)) continue;

                const milestoneStat = await this.app.vault.adapter.stat(child.path);
                const timelineEvent = timelineEvents.find(e => e.fileName === child.basename);
                
                if (await this.shouldUpdateMilestone(child, metadata, timelineEvent, milestoneStat, markwhenStat)) {
                    milestonesToSync.push({
                        file: child,
                        metadata: metadata
                    });
                }
            }

            // Group and sort milestones
            const groupedMilestones = this.settings.groupingConfig.enabled
                ? await this.groupMilestonesByProperty(milestonesToSync)
                : new Map([['', milestonesToSync]]);

            // Create new timeline content
            let newContent = '';
            for (const [groupName, milestones] of groupedMilestones) {
                if (groupName && this.settings.groupingConfig.enabled) {
                    newContent += `\n${this.settings.formattingConfig.groupStartText} ${groupName}\n`;
                }
                
                const sortedMilestones = this.sortMilestones(milestones);
                for (const milestone of sortedMilestones) {
                    newContent += this.formatMilestoneEntry(milestone);
                }
                
                if (groupName && this.settings.groupingConfig.enabled) {
                    newContent += `${this.settings.formattingConfig.groupEndText}\n\n`;
                }
            }

            // Update if not dry run
            if (!this.settings.debugConfig.dryRun) {
                if (newContent.trim() !== markwhenContent.trim()) {
                    await this.app.vault.modify(markwhenFile, newContent.trim());
                    this.showNotification('Timeline synchronized', 'success');
                } else {
                    this.showNotification('Everything already in sync', 'info');
                }
            } else {
                this.log('Dry run - would update with:', 'info');
                this.log(newContent, 'debug');
            }

        } catch (error) {
            this.handleError('Error in sync', error);
        }
    }

    // Helper functions
    shouldProcessFile(file) {
        if (file.extension !== 'md') return false;
        
        // Check excluded folders
        const relativePath = file.path.replace(this.settings.milestonesPath, '');
        return !this.settings.filterConfig.excludeFolders
            .some(folder => relativePath.startsWith(folder));
    }

    isValidMilestone(metadata) {
        if (!metadata?.date || !metadata?.endDate || !metadata?.title) return false;
        
        // Check status
        if (this.settings.filterConfig.excludeStatus.includes(metadata.Status)) return false;
        
        // Check tags
        const fileTags = metadata.tags || [];
        const requiredTags = this.settings.tagConfig.tags;
        
        if (this.settings.tagConfig.requireAllTags) {
            return requiredTags.every(tag => fileTags.includes(tag));
        } else {
            return requiredTags.some(tag => fileTags.includes(tag));
        }
    }

    async shouldUpdateMilestone(file, metadata, timelineEvent, milestoneStat, markwhenStat) {
        if (!timelineEvent) return true;

        const datesAreDifferent = metadata.date !== timelineEvent.startDate ||
                                metadata.endDate !== timelineEvent.endDate;

        if (datesAreDifferent) {
            if (!this.settings.enableBidirectionalSync) {
                return true;
            }

            return milestoneStat.mtime > markwhenStat.mtime;
        }

        return true; // Update for potential status changes
    }

    sortMilestones(milestones) {
        const sortMethod = this.settings.groupingConfig.sortEntriesBy;
        return [...milestones].sort((a, b) => {
            if (sortMethod === 'date') {
                return new Date(a.metadata.date) - new Date(b.metadata.date);
            } else {
                return a.metadata.title.localeCompare(b.metadata.title);
            }
        });
    }

    formatMilestoneEntry(milestone) {
        let entry = `${milestone.metadata.date}/${milestone.metadata.endDate}: [[${milestone.file.basename}]]`;
        
        if (this.settings.formattingConfig.showStatusTags && milestone.metadata.Status) {
            entry += ` #${milestone.metadata.Status.replace(/\s+/g, '-')}`;
        }
        
        return entry + '\n';
    }

    // Logging and notification functions
    log(message, level = 'info') {
        if (!this.settings.debugConfig.enabled) return;
        
        const logLevels = ['error', 'warn', 'info', 'debug'];
        const configLevel = logLevels.indexOf(this.settings.debugConfig.logLevel);
        const messageLevel = logLevels.indexOf(level);

        if (messageLevel <= configLevel) {
            console[level](`[MilestoneTimelineSync] ${message}`);
        }
    }

    showNotification(message, type = 'info') {
        if (!this.settings.notificationConfig.enabled) return;
        if (type === 'error' && !this.settings.notificationConfig.showErrors) return;

        const detailLevel = this.settings.notificationConfig.detailLevel;
        if (detailLevel === 'minimal' && type === 'info') return;

        new Notice(message);
    }

    handleError(message, error) {
        this.log(`${message}: ${error.message}`, 'error');
        if (this.settings.debugConfig.enabled) {
            console.error(error);
        }
        this.showNotification(`${message}: ${error.message}`, 'error');
    }
async groupMilestonesByProperty(milestones) {
        const groupedMilestones = new Map();
        const milestonesWithoutProperty = [];
        const propertyName = this.settings.groupingConfig.propertyName;

        for (const milestone of milestones) {
            try {
                let groupValue = await this.getGroupingProperty(milestone.file, propertyName);
                
                if (!groupValue) {
                    milestonesWithoutProperty.push(milestone.file.basename);
                    groupValue = 'Ungrouped';
                }

                if (!groupedMilestones.has(groupValue)) {
                    groupedMilestones.set(groupValue, []);
                }
                groupedMilestones.get(groupValue).push(milestone);
            } catch (error) {
                this.handleError(`Error processing milestone ${milestone.file.path}`, error);
            }
        }

        if (milestonesWithoutProperty.length > 0) {
            const message = `Missing ${propertyName} property in: ${milestonesWithoutProperty.join(', ')}`;
            this.log(message, 'warn');
            if (this.settings.notificationConfig.detailLevel === 'detailed') {
                this.showNotification(message, 'warn');
            }
        }

        // Sort groups based on settings
        return this.sortGroups(groupedMilestones);
    }

    async getGroupingProperty(file, propertyName) {
        const content = await this.app.vault.read(file);
        const propertyRegex = new RegExp(`${propertyName}:\\s*"?\\[\\[([^\\]|]+?)(?:\\|[^\\]]+?)?\\]\\]"?`);
        const match = content.match(propertyRegex);
        return match ? match[1].replace(/^.*?}/, '').trim() : null;
    }

    sortGroups(groupedMilestones) {
        const sortMethod = this.settings.groupingConfig.sortBy;
        const entries = Array.from(groupedMilestones.entries());

        const sortedEntries = entries.sort((a, b) => {
            const [groupA, milestonesA] = a;
            const [groupB, milestonesB] = b;

            if (groupA === 'Ungrouped') return 1;
            if (groupB === 'Ungrouped') return -1;

            switch (sortMethod) {
                case 'number':
                    const numA = parseFloat(groupA.match(/^\d+(\.\d+)?/)?.[0] || '0');
                    const numB = parseFloat(groupB.match(/^\d+(\.\d+)?/)?.[0] || '0');
                    return numA - numB || groupA.localeCompare(groupB);

                case 'date':
                    const dateA = Math.min(...milestonesA.map(m => new Date(m.metadata.date)));
                    const dateB = Math.min(...milestonesB.map(m => new Date(m.metadata.date)));
                    return dateA - dateB;

                default: // 'alpha'
                    return groupA.localeCompare(groupB);
            }
        });

        return new Map(sortedEntries);
    }

    filterByDate(milestone) {
        if (!this.settings.filterConfig.enableDateFilter) return true;

        const today = new Date();
        const startDate = new Date(milestone.metadata.date);
        const endDate = new Date(milestone.metadata.endDate);

        switch (this.settings.filterConfig.dateFilterType) {
            case 'future':
                return startDate >= today;
            case 'current':
                return startDate <= today && endDate >= today;
            default:
                return true;
        }
    }

    parseTimelineEvents(content) {
        const events = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            const match = line.match(/^(\d{4}(?:-\d{2}(?:-\d{2})?)??)\/(\d{4}(?:-\d{2}(?:-\d{2})?)?): \[\[(.+?)\]\]/);
            if (match) {
                events.push({
                    startDate: match[1],
                    endDate: match[2],
                    fileName: match[3]
                });
            }
        }
        return events;
    }

    async updateMilestoneFile(file, metadata) {
        if (!this.settings.enableBidirectionalSync) return;
        if (this.settings.debugConfig.dryRun) {
            this.log(`Would update milestone file: ${file.path}`, 'info');
            return;
        }

        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            let inFrontmatter = false;
            let frontmatterStart = -1;
            let frontmatterEnd = -1;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === '---') {
                    if (!inFrontmatter) {
                        inFrontmatter = true;
                        frontmatterStart = i;
                    } else {
                        frontmatterEnd = i;
                        break;
                    }
                }
            }

            if (frontmatterStart === -1 || frontmatterEnd === -1) {
                throw new Error('Invalid frontmatter structure');
            }

            const currentFrontmatter = lines.slice(frontmatterStart + 1, frontmatterEnd);
            const updatedFrontmatter = this.updateFrontmatterContent(currentFrontmatter, metadata);

            const newContent = [
                ...lines.slice(0, frontmatterStart + 1),
                ...updatedFrontmatter,
                ...lines.slice(frontmatterEnd)
            ].join('\n');

            await this.app.vault.modify(file, newContent);
            this.log(`Updated milestone file: ${file.path}`, 'info');
        } catch (error) {
            this.handleError(`Error updating milestone file: ${file.path}`, error);
        }
    }

    updateFrontmatterContent(currentFrontmatter, metadata) {
        const updatedFrontmatter = [];
        let dateUpdated = false;
        let endDateUpdated = false;

        for (const line of currentFrontmatter) {
            if (line.startsWith('date:')) {
                updatedFrontmatter.push(`date: ${metadata.date}`);
                dateUpdated = true;
            } else if (line.startsWith('endDate:')) {
                updatedFrontmatter.push(`endDate: ${metadata.endDate}`);
                endDateUpdated = true;
            } else {
                updatedFrontmatter.push(line);
            }
        }

        if (!dateUpdated) {
            updatedFrontmatter.push(`date: ${metadata.date}`);
        }
        if (!endDateUpdated) {
            updatedFrontmatter.push(`endDate: ${metadata.endDate}`);
        }

        return updatedFrontmatter;
    }

    onunload() {
        console.log('Unloading MilestoneTimelineSync');
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }
    }
}

module.exports = MilestoneTimelineSync;
