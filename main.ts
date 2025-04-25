import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	MetadataCache,
	Vault,
	Notice,
	debounce, // Import debounce directly
	Debouncer, // Import Debouncer type for better typing
	// Moment // <-- Ensure this is removed or commented out
} from 'obsidian';

// Make moment globally available via window for type checking, requires esModuleInterop: true
declare global {
    interface Window { moment: typeof import('moment'); }
}

// Define interfaces for settings structure for better type safety
interface PropertyConfig {
	dateProperty: string;
	endDateProperty: string;
	allowInlineProperties: boolean;
}

interface BidirectionalSyncConfig {
	syncDates: boolean;
	syncStatus: boolean;
	syncGroup: boolean;
}

interface TagConfig {
	propertyName: string;
	tags: string[];
	requireAllTags: boolean;
}

interface GroupingConfig {
	enabled: boolean;
	propertyName: string;
	sortBy: 'date' | 'alpha' | 'number';
	sortEntriesBy: 'date' | 'alpha';
}

interface FormattingConfig {
	showStatusTags: boolean;
	dateFormat: string;
	groupStartText: string;
	groupEndText: string;
	supportISODateFormat: boolean;
}

interface FilterConfig {
	excludeStatus: string[];
	enableDateFilter: boolean;
	dateFilterType: 'all' | 'future' | 'current';
	excludeFolders: string[];
}

interface NotificationConfig {
	enabled: boolean;
	detailLevel: 'minimal' | 'normal' | 'detailed';
	showErrors: boolean;
}

interface DebugConfig {
	enabled: boolean;
	logLevel: 'error' | 'warn' | 'info' | 'debug';
	dryRun: boolean;
}

// Interface for the main settings object
interface MarkwhenSyncSettings {
	markwhenPath: string;
	notesFolderPath: string;
	enableBidirectionalSync: boolean;
	enableAutoSync: boolean;
	autoSyncInterval: string;
	customProperty: string; // Property used for status tags
	propertyConfig: PropertyConfig;
	bidirectionalSyncConfig: BidirectionalSyncConfig;
	tagConfig: TagConfig;
	groupingConfig: GroupingConfig;
	formattingConfig: FormattingConfig;
	filterConfig: FilterConfig;
	notificationConfig: NotificationConfig;
	debugConfig: DebugConfig;
	timelineHeader?: string; // Optional header for the timeline file
}

// Default settings implementation
const DEFAULT_SETTINGS: MarkwhenSyncSettings = {
	markwhenPath: 'timeline.mw',
	notesFolderPath: 'notes',
	enableBidirectionalSync: true,
	enableAutoSync: false,
	autoSyncInterval: '60',
	customProperty: 'status',
	propertyConfig: {
		dateProperty: 'date',
		endDateProperty: 'endDate',
		allowInlineProperties: false
	},
	bidirectionalSyncConfig: {
		syncDates: true,
		syncStatus: true, // Defaulting to true based on previous user settings
		syncGroup: true   // Defaulting to true based on previous user settings
	},
	tagConfig: {
		propertyName: 'tags',
		tags: [],
		requireAllTags: false
	},
	groupingConfig: {
		enabled: false,
		propertyName: 'group',
		sortBy: 'date',
		sortEntriesBy: 'date'
	},
	formattingConfig: {
		showStatusTags: true,
		dateFormat: 'YYYY-MM-DD',
		groupStartText: 'group',
		groupEndText: 'end group',
		supportISODateFormat: true // Defaulting to true based on previous user settings
	},
	filterConfig: {
		excludeStatus: [],
		enableDateFilter: false,
		dateFilterType: 'all',
		excludeFolders: []
	},
	notificationConfig: {
		enabled: true,
		detailLevel: 'normal',
		showErrors: true
	},
	debugConfig: {
		enabled: false,
		logLevel: 'error',
		dryRun: false
	},
	timelineHeader: '' // Default empty header
};

// Interface for parsed timeline events
interface TimelineEvent {
	startDate: string | null; // Parsed date string (YYYY-MM-DD) or null if invalid
	endDate: string | null;   // Parsed date string (YYYY-MM-DD) or null if invalid
	noteName: string;
	group: string | null;
	status: string | null;
}

// Interface for collected note entries
interface Entry {
	file: TFile;
	metadata: Record<string, any>; // Frontmatter + potential inline properties
	title: string;
}

// Correct type for the debounced function including the cancel method (TS2314 fix)
// Debouncer<T> requires T (tuple of args) and V (return type)
type DebouncedFunc<T extends any[], V = void> = Debouncer<T, V>;


// --- Setting Tab Class ---
class MarkwhenSyncSettingTab extends PluginSettingTab {
	plugin: MarkwhenSync;

	constructor(app: App, plugin: MarkwhenSync) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Basic section
		new Setting(containerEl).setName('Basic').setHeading();
		this.addBasicSettings(containerEl);

		// Synchronization section
		new Setting(containerEl).setName('Synchronization').setHeading();
		this.addSyncSettings(containerEl);

		// Properties configuration
		new Setting(containerEl).setName('Properties').setHeading();
		this.addPropertySettings(containerEl);

		// Bidirectional sync options
		new Setting(containerEl).setName('Bidirectional sync options').setHeading();
		this.addBidirectionalSyncSettings(containerEl);

		// Tag configuration section
		new Setting(containerEl).setName('Tag configuration').setHeading();
		this.addTagSettings(containerEl);

		// Grouping section
		new Setting(containerEl).setName('Grouping').setHeading();
		this.addGroupingSettings(containerEl);

		// Format section
		new Setting(containerEl).setName('Format').setHeading();
		this.addFormatSettings(containerEl);

		// Filter section
		new Setting(containerEl).setName('Filter').setHeading();
		this.addFilterSettings(containerEl);

		// Notification section
		new Setting(containerEl).setName('Notification').setHeading();
		this.addNotificationSettings(containerEl);

		// Debug section
		new Setting(containerEl).setName('Debug').setHeading();
		this.addDebugSettings(containerEl);
	}

	// Helper method to add settings sections
	private addBasicSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Timeline file path')
			.setDesc('Path to your Markwhen timeline file')
			.addText(text => text
				.setPlaceholder('timeline.mw')
				.setValue(this.plugin.settings.markwhenPath)
				.onChange(async (value) => {
					this.plugin.settings.markwhenPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
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

	private addPropertySettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Date property')
			.setDesc('Name of the property used for the start date')
			.addText(text => text
				.setPlaceholder('date')
				.setValue(this.plugin.settings.propertyConfig.dateProperty)
				.onChange(async (value) => {
					this.plugin.settings.propertyConfig.dateProperty = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('End date property')
			.setDesc('Name of the property used for the end date')
			.addText(text => text
				.setPlaceholder('endDate')
				.setValue(this.plugin.settings.propertyConfig.endDateProperty)
				.onChange(async (value) => {
					this.plugin.settings.propertyConfig.endDateProperty = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Allow inline properties')
			.setDesc('Allow properties defined in the note body using the "property:: value" syntax')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.propertyConfig.allowInlineProperties)
				.onChange(async (value) => {
					this.plugin.settings.propertyConfig.allowInlineProperties = value;
					await this.plugin.saveSettings();
				}));
	}

	private addBidirectionalSyncSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Sync dates bidirectionally')
			.setDesc('Synchronize date properties in both directions')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.bidirectionalSyncConfig.syncDates)
				.onChange(async (value) => {
					this.plugin.settings.bidirectionalSyncConfig.syncDates = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sync status bidirectionally')
			.setDesc('Synchronize status property in both directions')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.bidirectionalSyncConfig.syncStatus)
				.onChange(async (value) => {
					this.plugin.settings.bidirectionalSyncConfig.syncStatus = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sync group bidirectionally')
			.setDesc('Synchronize group property in both directions')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.bidirectionalSyncConfig.syncGroup)
				.onChange(async (value) => {
					this.plugin.settings.bidirectionalSyncConfig.syncGroup = value;
					await this.plugin.saveSettings();
				}));
	}

	private addSyncSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Enable bidirectional sync')
			.setDesc('Sync changes in both directions, otherwise the synchronisations is only from the notes to the timeline')
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
					this.plugin.setupAutoSync(); // Trigger setup when toggled
				}));

		new Setting(containerEl)
			.setName('Auto sync interval')
			.setDesc('Interval in seconds for auto sync')
			.addText(text => text
				.setPlaceholder('60')
				.setValue(this.plugin.settings.autoSyncInterval)
				.onChange(async (value) => {
					const intervalNum = parseInt(value);
					if (!isNaN(intervalNum) && intervalNum > 0) {
						this.plugin.settings.autoSyncInterval = value;
						await this.plugin.saveSettings();
						this.plugin.setupAutoSync(); // Trigger setup when interval changes
					} else {
						new Notice("Please enter a valid positive number for the interval.");
					}
				}));
	}

	private addTagSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Tags property name')
			.setDesc('Name of the frontmatter property that contains tags')
			.addText(text => text
				.setPlaceholder('tags')
				.setValue(this.plugin.settings.tagConfig.propertyName)
				.onChange(async (value) => {
					this.plugin.settings.tagConfig.propertyName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Required tags')
			.setDesc('Tags required for sync (comma-separated)')
			.addText(text => text
				.setPlaceholder('tag1, tag2')
				.setValue(this.plugin.settings.tagConfig.tags.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.tagConfig.tags = value.split(',')
						.map(t => t.trim())
						.filter(t => t !== ''); // Filter out empty strings
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

	private addGroupingSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Enable grouping')
			.setDesc('Group entries in timeline')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.groupingConfig.enabled)
				.onChange(async (value) => {
					this.plugin.settings.groupingConfig.enabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Grouping property')
			.setDesc('Property name for grouping')
			.addText(text => text
				.setPlaceholder('group')
				.setValue(this.plugin.settings.groupingConfig.propertyName)
				.onChange(async (value) => {
					this.plugin.settings.groupingConfig.propertyName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Group sort method')
			.setDesc('How to sort the groups')
			.addDropdown(dropdown => dropdown
				.addOption('date', 'By Date')
				.addOption('alpha', 'Alphabetically')
				.addOption('number', 'By Number')
				.setValue(this.plugin.settings.groupingConfig.sortBy)
				// Remove explicit type annotation for 'value' here (TS2345 fix)
				.onChange(async (value) => {
					// Assign directly, use type assertion for safety
					this.plugin.settings.groupingConfig.sortBy = value as 'date' | 'alpha' | 'number';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Entry sort method')
			.setDesc('How to sort entries within groups')
			.addDropdown(dropdown => dropdown
				.addOption('date', 'By Date')
				.addOption('alpha', 'Alphabetically')
				.setValue(this.plugin.settings.groupingConfig.sortEntriesBy)
				 // Remove explicit type annotation for 'value' here (TS2345 fix)
				.onChange(async (value) => {
					this.plugin.settings.groupingConfig.sortEntriesBy = value as 'date' | 'alpha';
					await this.plugin.saveSettings();
				}));
	}

	private addFormatSettings(containerEl: HTMLElement): void {
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
			.setDesc('Format for dates in timeline (using Moment.js syntax)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.formattingConfig.dateFormat)
				.onChange(async (value) => {
					// Add basic validation for common date formats if desired
					this.plugin.settings.formattingConfig.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Support ISO date format')
			.setDesc('Support ISO date format in timeline (e.g., "2025-09-30T22:00:00.000Z - 2027-07-02T23:00:00.000Z")')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.formattingConfig.supportISODateFormat)
				.onChange(async (value) => {
					this.plugin.settings.formattingConfig.supportISODateFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Custom property')
			.setDesc('Name of the custom frontmatter property to use for status tags in timeline')
			.addText(text => text
				.setPlaceholder('status')
				.setValue(this.plugin.settings.customProperty)
				.onChange(async (value) => {
					this.plugin.settings.customProperty = value;
					await this.plugin.saveSettings();
				}));
	}

	private addFilterSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Excluded property value')
			.setDesc('Property values to exclude (comma-separated)')
			.addText(text => text
				.setPlaceholder('done, cancelled')
				.setValue(this.plugin.settings.filterConfig.excludeStatus.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.filterConfig.excludeStatus = value.split(',')
						.map(s => s.trim())
						.filter(s => s !== ''); // Filter empty
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable date filter')
			.setDesc('Filter entries based on dates')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.filterConfig.enableDateFilter)
				.onChange(async (value) => {
					this.plugin.settings.filterConfig.enableDateFilter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date filter type')
			.setDesc('Which entries to include based on date')
			.addDropdown(dropdown => dropdown
				.addOption('all', 'All')
				.addOption('future', 'Future only')
				.addOption('current', 'Current only')
				.setValue(this.plugin.settings.filterConfig.dateFilterType)
				 // Remove explicit type annotation for 'value' here (TS2345 fix)
				.onChange(async (value) => {
					this.plugin.settings.filterConfig.dateFilterType = value as 'all' | 'future' | 'current';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Excluded folders')
			.setDesc('Subfolders to exclude (comma-separated, relative to Notes Folder Path)')
			.addText(text => text
				.setPlaceholder('archive, temp')
				.setValue(this.plugin.settings.filterConfig.excludeFolders.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.filterConfig.excludeFolders = value.split(',')
						.map(f => f.trim())
						.filter(f => f !== ''); // Filter empty
					await this.plugin.saveSettings();
				}));
	}

	private addNotificationSettings(containerEl: HTMLElement): void {
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
			.setName('Detail level')
			.setDesc('How detailed should notifications be')
			.addDropdown(dropdown => dropdown
				.addOption('minimal', 'Minimal')
				.addOption('normal', 'Normal')
				.addOption('detailed', 'Detailed')
				.setValue(this.plugin.settings.notificationConfig.detailLevel)
				 // Remove explicit type annotation for 'value' here (TS2345 fix)
				.onChange(async (value) => {
					this.plugin.settings.notificationConfig.detailLevel = value as 'minimal' | 'normal' | 'detailed';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show errors')
			.setDesc('Show error notifications')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.notificationConfig.showErrors)
				.onChange(async (value) => {
					this.plugin.settings.notificationConfig.showErrors = value;
					await this.plugin.saveSettings();
				}));
	}

	private addDebugSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Debug mode')
			.setDesc('Enable debug logging in the developer console')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugConfig.enabled)
				.onChange(async (value) => {
					this.plugin.settings.debugConfig.enabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Log level')
			.setDesc('Level of debug logging')
			.addDropdown(dropdown => dropdown
				.addOption('error', 'Errors only')
				.addOption('warn', 'Warnings and errors')
				.addOption('info', 'General info')
				.addOption('debug', 'Detailed debug')
				.setValue(this.plugin.settings.debugConfig.logLevel)
				 // Remove explicit type annotation for 'value' here (TS2345 fix)
				.onChange(async (value) => {
					this.plugin.settings.debugConfig.logLevel = value as 'error' | 'warn' | 'info' | 'debug';
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

// --- Main Plugin Class ---
export default class MarkwhenSync extends Plugin {
	// Add definite assignment assertion (!) (TS2564 fix)
	settings!: MarkwhenSyncSettings;
	// Store last sync state to compare changes
	lastSync: {
		notes: Map<string, number>; // Map<filePath, mtime>
		timeline: string;          // Content of the timeline file
	} = { notes: new Map(), timeline: '' };
	// Interval ID for auto-sync
	private autoSyncIntervalId: number | null = null;
	// Debounced file change handler with correct type (TS2314 fix)
	// Add definite assignment assertion (!) (TS2564 fix)
	// Use the imported Debouncer type with correct generic arguments
	private debouncedHandleFileChange!: DebouncedFunc<[TFile], void>;


	async onload(): Promise<void> {
		await this.loadSettings();

		this.addRibbonIcon('sync', 'Sync timeline', async () => {
			await this.syncWithSettings();
		});

		this.addSettingTab(new MarkwhenSyncSettingTab(this.app, this));

		// Initial setup for auto-sync based on settings
		this.setupAutoSync();

		// Debounce the handler to avoid excessive syncs on rapid changes
		// Use `true` for leading edge execution if desired
		// Assign the result of debounce to the correctly typed property
		this.debouncedHandleFileChange = debounce(
			this.handleFileChange.bind(this), // Function to debounce
			1500,                             // Debounce interval in ms
			true                              // Execute on leading edge
		);


		// Register file system event listeners
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (this.settings.enableAutoSync && file instanceof TFile) {
					this.debouncedHandleFileChange(file);
				}
			})
		);
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				 // Trigger sync if a markdown file is created within the notes folder
				if (this.settings.enableAutoSync && file instanceof TFile && file.extension === 'md' && file.path.startsWith(this.settings.notesFolderPath + '/')) {
					this.log('debug', `Note created (${file.path}), triggering sync to Markwhen.`);
					// Use debounce here too if creation might trigger rapid modifications
					this.syncToMarkwhen(); // Or use debounced version
				}
			})
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (this.settings.enableAutoSync) {
					// If a note file is deleted
					if (file instanceof TFile && file.path.startsWith(this.settings.notesFolderPath + '/')) {
						this.log('debug', `Note deleted (${file.path}), triggering sync to Markwhen.`);
						// Trigger sync to remove deleted item from timeline
						this.syncToMarkwhen(); // Sync immediately to reflect deletion
						// Remove from last sync state if tracked
						this.lastSync.notes.delete(file.path);
					}
					// If the timeline file itself is deleted
					else if (file.path === this.settings.markwhenPath) {
						this.log('info', `Timeline file deleted (${file.path}). Clearing last sync state.`);
						// Handle timeline file deletion (e.g., clear last sync state)
						this.lastSync.timeline = '';
					}
				}
			})
		);

		this.log('info', 'Markwhen Sync plugin loaded.');
	}

	// Load settings, merging defaults with saved data
	async loadSettings(): Promise<void> {
		// Use Object.assign for shallow merge, then deep merge nested objects
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// Ensure nested config objects exist and merge them properly
		this.settings.propertyConfig = Object.assign({}, DEFAULT_SETTINGS.propertyConfig, this.settings.propertyConfig);
		this.settings.bidirectionalSyncConfig = Object.assign({}, DEFAULT_SETTINGS.bidirectionalSyncConfig, this.settings.bidirectionalSyncConfig);
		this.settings.tagConfig = Object.assign({}, DEFAULT_SETTINGS.tagConfig, this.settings.tagConfig);
		this.settings.groupingConfig = Object.assign({}, DEFAULT_SETTINGS.groupingConfig, this.settings.groupingConfig);
		this.settings.formattingConfig = Object.assign({}, DEFAULT_SETTINGS.formattingConfig, this.settings.formattingConfig);
		this.settings.filterConfig = Object.assign({}, DEFAULT_SETTINGS.filterConfig, this.settings.filterConfig);
		this.settings.notificationConfig = Object.assign({}, DEFAULT_SETTINGS.notificationConfig, this.settings.notificationConfig);
		this.settings.debugConfig = Object.assign({}, DEFAULT_SETTINGS.debugConfig, this.settings.debugConfig);
	}

	// Save settings to Obsidian's storage
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	// Set up or clear the auto-sync interval based on settings
	setupAutoSync(): void {
		// Clear existing interval if it exists
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
			this.autoSyncIntervalId = null;
		}
		// Set up new interval only if auto-sync is enabled
		if (this.settings.enableAutoSync) {
			const intervalSeconds = parseInt(this.settings.autoSyncInterval);
			if (!isNaN(intervalSeconds) && intervalSeconds > 0) {
				 const intervalMilliseconds = intervalSeconds * 1000;
				 // Use window.setInterval and register it
				 this.autoSyncIntervalId = window.setInterval(() => this.syncWithSettings(), intervalMilliseconds);
				 this.registerInterval(this.autoSyncIntervalId); // Let Obsidian manage clearing on unload
				 this.log('info', `Auto-sync interval set to ${intervalSeconds} seconds.`);
			 } else {
				 this.log('warn', "Invalid auto-sync interval. Auto-sync disabled.");
				 // Optionally disable auto-sync setting if interval is invalid and save
				 // this.settings.enableAutoSync = false;
				 // this.saveSettings();
			 }
		} else {
			 this.log('info', "Auto-sync disabled.");
		}
	}

	// Handle file changes detected by the vault listener
	private async handleFileChange(file: TFile): Promise<void> {
		// Check if the file is the timeline file
		if (file.path === this.settings.markwhenPath) {
			this.log('debug', "Timeline file modified, syncing from Markwhen.");
			await this.syncFromMarkwhen();
		// Check if the file is a markdown file within the notes folder
		} else if (file.path.startsWith(this.settings.notesFolderPath + '/') && file.extension === 'md') {
			 // Optional: Check mtime against last sync state to avoid redundant syncs
			 // const lastMtime = this.lastSync.notes.get(file.path);
			 // if (lastMtime === undefined || file.stat.mtime > lastMtime) {
				 this.log('debug', `Note file modified (${file.path}), syncing to Markwhen.`);
				 await this.syncToMarkwhen();
				 // this.lastSync.notes.set(file.path, file.stat.mtime); // Update last sync time
			 // } else {
			 //     this.log('debug', `Note file modified (${file.path}), but mtime unchanged since last sync. Skipping.`);
			 // }
		}
	}

	// Perform sync based on current settings (manual trigger or interval)
	async syncWithSettings(): Promise<void> {
		this.log('info', "Starting sync cycle.");
		if (this.settings.debugConfig.dryRun) {
			new Notice('Dry run: Simulating sync.');
			this.log('info', "Dry run enabled, no actual changes will be made.");
			// Optionally perform read-only operations for dry run feedback
			return;
		}

		try {
			// Sync notes to timeline first
			await this.syncToMarkwhen();
			// Then sync back from timeline if bidirectional sync is enabled
			if (this.settings.enableBidirectionalSync) {
				await this.syncFromMarkwhen();
			}
			 if (this.settings.notificationConfig.enabled && this.settings.notificationConfig.detailLevel !== 'minimal') {
				 new Notice('Sync complete.');
			 }
			 this.log('info', "Sync cycle finished.");
		} catch (error) { // Catch block error handling (TS2571 fix)
			let errorMessage = 'Unknown error during sync cycle';
			// Check if it's an Error object before accessing message
			if (error instanceof Error) {
				errorMessage = error.message;
			} else if (typeof error === 'string') {
				errorMessage = error;
			}
			this.log('error', 'Error during sync cycle:', error); // Log the original error object too
			if (this.settings.notificationConfig.showErrors) {
				new Notice(`Sync error: ${errorMessage}`);
			}
		}
	}

	// Collect valid entries from the notes folder
	private async collectEntries(): Promise<Entry[]> {
		const entries: Entry[] = [];
		const notesFolderPath = this.settings.notesFolderPath;
		const notesFolder = this.app.vault.getAbstractFileByPath(notesFolderPath);

		if (!(notesFolder instanceof TFolder)) {
			const errorMsg = `Notes folder path "${notesFolderPath}" not found or is not a folder.`;
			 this.log('error', errorMsg);
			 if (this.settings.notificationConfig.showErrors) {
				 new Notice(errorMsg);
			 }
			return []; // Return empty array
		}

		const files = this.app.vault.getMarkdownFiles(); // Get all markdown files

		for (const file of files) {
			// Check if file is within the specified notes folder (ensure trailing slash for correct path check)
			if (!file.path.startsWith(notesFolder.path + '/')) {
				continue;
			}
			// Check if file is in an excluded subfolder
			const relativePath = file.path.substring(notesFolder.path.length + 1); // Get path relative to notes folder
			if (this.settings.filterConfig.excludeFolders.some(folder => relativePath.startsWith(folder + '/'))) {
				this.log('debug', `Skipping excluded file: ${file.path}`);
				continue;
			}

			// Process the file
			const cache = this.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter || {};
			let metadata: Record<string, any> = {...frontmatter}; // Start with frontmatter

			// Handle inline properties if enabled
			if (this.settings.propertyConfig.allowInlineProperties) {
				try {
					const content = await this.app.vault.cachedRead(file); // Use cachedRead
					const inlineProps = this.extractInlineProperties(content);

					// Merge inline properties, giving frontmatter precedence
					for (const key in inlineProps) {
						if (!metadata.hasOwnProperty(key)) {
							 metadata[key] = inlineProps[key];
						}
					}
				} catch (readError) {
					 this.log('error', `Error reading file for inline properties: ${file.path}`, readError);
					 // Decide whether to skip the file or continue without inline props
					 continue;
				}
			}

			// Validate the entry based on collected metadata
			if (this.isValidEntry(metadata, file.basename)) { // Pass basename for logging
				entries.push({
					file: file,
					metadata: metadata,
					title: file.basename
				});
			}
		}
		this.log('debug', `Collected ${entries.length} valid entries.`);
		return entries;
	}

	// Helper function for manual inline property extraction (fallback)
	private extractInlineProperties(content: string): Record<string, any> {
		 const props: Record<string, any> = {};
		 // Improved regex for Dataview inline fields: [key:: value] or (key:: value) or key:: value
		 const propertyRegex = /^\s*(?:\[|\()?\s*([a-zA-Z0-9_\-]+)\s*::\s*([^\]\)\n]+?)\s*(?:\]|\))?\s*$/gm;
		 let match;
		 while ((match = propertyRegex.exec(content)) !== null) {
			 const key = match[1].trim();
			 let value: any = match[2].trim();
			 // Basic type inference (optional, can be expanded)
			 if (!isNaN(Number(value)) && value.trim() !== '') {
				 value = Number(value);
			 } else if (value.toLowerCase() === 'true') {
				 value = true;
			 } else if (value.toLowerCase() === 'false') {
				 value = false;
			 }
			 // Avoid overwriting if key already exists (inline fields might appear multiple times)
			 if (!props.hasOwnProperty(key)) {
				 props[key] = value;
			 }
		 }
		 return props;
	 }


	// Format a date string according to settings, handling partial dates
	private formatDate(dateString: string | null | undefined, isEndDate: boolean = false): string {
		if (!dateString || typeof dateString !== 'string') return ''; // Return empty for invalid input

		const targetFormat = this.settings.formattingConfig.dateFormat;
		// Try parsing with target format first (strict)
		let dateMoment = window.moment(dateString, targetFormat, true);

		// If strict fails, try flexible parsing
		if (!dateMoment.isValid()) {
			dateMoment = window.moment(dateString);
		}

		// Handle specific formats before general validation
		if (/^\d{4}$/.test(dateString)) { // Year only:
			const yearMoment = window.moment(dateString, 'YYYY');
			 return isEndDate ? yearMoment.endOf('year').format(targetFormat)
							  : yearMoment.startOf('year').format(targetFormat);
		} else if (/^\d{4}-\d{2}$/.test(dateString)) { // Year-Month:
			 const monthMoment = window.moment(dateString, 'YYYY-MM');
			 return isEndDate ? monthMoment.endOf('month').format(targetFormat)
							  : monthMoment.startOf('month').format(targetFormat);
		}

		// If still not valid after flexible parsing, return original string
		if (!dateMoment.isValid()) {
			 this.log('warn', `Invalid date format encountered: "${dateString}". Could not parse.`);
			 return dateString; // Return original invalid string
		}

		// Otherwise, format the valid date according to settings
		return dateMoment.format(targetFormat);
	}

	// Convert ISO date string to the format specified in settings
	private formatISODateToNormal(isoDate: string | null | undefined): string | null {
		if (!isoDate || typeof isoDate !== 'string') return null;
		try {
			// Use moment.utc for ISO 8601 with 'Z' timezone
			const dateMoment = window.moment.utc(isoDate);
			if (dateMoment.isValid()) {
				// Format using the configured dateFormat
				return dateMoment.format(this.settings.formattingConfig.dateFormat);
			} else {
				this.log('warn', `Could not parse ISO date using moment.utc: "${isoDate}"`);
				return null; // Indicate parsing failure
			}
		} catch (error) {
			this.log('error', `Error parsing ISO date "${isoDate}":`, error);
			return null; // Indicate error
		}
	}

	// Sync changes from collected entries to the Markwhen timeline file
	async syncToMarkwhen(): Promise<void> {
		this.log('info', "Starting sync to Markwhen timeline.");
		try {
			const entries = await this.collectEntries();
			const newContent = await this.generateTimelineContent(entries);
			const timelinePath = this.settings.markwhenPath;

			let markwhenFile = this.app.vault.getAbstractFileByPath(timelinePath);

			// --- Create File/Folders if they don't exist ---
			if (!markwhenFile) {
				this.log('info', `Timeline file "${timelinePath}" not found, attempting to create it.`);
				const parentDir = timelinePath.substring(0, timelinePath.lastIndexOf('/'));
				if (parentDir && !this.app.vault.getAbstractFileByPath(parentDir)) {
					try {
						await this.app.vault.createFolder(parentDir);
						this.log('info', `Created directory "${parentDir}".`);
					} catch (dirError: any) {
						 this.log('error', `Failed to create directory "${parentDir}":`, dirError);
						 throw new Error(`Failed to create directory for timeline: ${dirError.message}`);
					}
				}
				 try {
					markwhenFile = await this.app.vault.create(timelinePath, newContent.trim());
					this.lastSync.timeline = newContent.trim(); // Update sync state
					if (this.settings.notificationConfig.enabled) {
						new Notice(`Created timeline: ${timelinePath}`);
					}
					this.log('info', `Successfully created timeline file "${timelinePath}".`);
					return; // Exit after creation
				 } catch (createError: any) {
					 this.log('error', `Failed to create timeline file "${timelinePath}":`, createError);
					 throw new Error(`Failed to create timeline file: ${createError.message}`);
				 }
			}

			// Ensure it's a file, not a folder
			if (!(markwhenFile instanceof TFile)) {
				throw new Error(`Timeline path points to a directory, not a file: ${timelinePath}`);
			}

			// --- Check for external changes before overwriting ---
			const currentContent = await this.app.vault.read(markwhenFile);
			if (this.settings.enableBidirectionalSync && this.lastSync.timeline !== '' && this.lastSync.timeline !== currentContent) {
				this.log('warn', "Timeline file has changed externally since last sync. Skipping sync *to* timeline to avoid overwriting. Please sync manually if needed.");
				 if (this.settings.notificationConfig.enabled) {
					new Notice('Timeline changed externally. Sync paused.');
				 }
				return;
			}

			// --- Write content only if it differs ---
			if (newContent.trim() !== currentContent.trim()) {
				 this.log('info', `Timeline content differs, updating file "${timelinePath}".`);
				await this.app.vault.modify(markwhenFile, newContent.trim());
				this.lastSync.timeline = newContent.trim(); // Update last sync state
				if (this.settings.notificationConfig.enabled && this.settings.notificationConfig.detailLevel !== 'minimal') {
					new Notice('Timeline synchronized');
				}
			} else {
				 this.log('debug', "Timeline content is already up-to-date.");
			}
		} catch (error: any) {
			this.log('error', 'Error during sync to timeline:', error);
			if (this.settings.notificationConfig.showErrors) {
				new Notice(`Error syncing to timeline: ${error.message || 'Unknown error'}`);
			}
		}
	}

	// Sync changes from the Markwhen timeline file back to Obsidian notes
	async syncFromMarkwhen(): Promise<void> {
		if (!this.settings.enableBidirectionalSync) {
			this.log('info', "Bidirectional sync disabled, skipping sync from Markwhen.");
			return;
		}
		this.log('info', "Starting sync from Markwhen timeline.");

		try {
			const markwhenFile = this.app.vault.getAbstractFileByPath(this.settings.markwhenPath);
			if (!markwhenFile) {
				 this.log('warn', `Timeline file "${this.settings.markwhenPath}" not found, cannot sync from it.`);
				 return;
			}
			if (!(markwhenFile instanceof TFile)) {
				 this.log('error', `Timeline path "${this.settings.markwhenPath}" points to a directory.`);
				 if (this.settings.notificationConfig.showErrors) {
					 new Notice(`Timeline path is a directory: ${this.settings.markwhenPath}`);
				 }
				return;
			}

			const content = await this.app.vault.read(markwhenFile);

			// Avoid processing if content hasn't changed since last sync *from* timeline
			if (content === this.lastSync.timeline) {
				 this.log('debug', "Timeline content unchanged since last sync, skipping sync from Markwhen.");
				 return;
			}

			const timelineEvents = this.parseMarkwhenContent(content);
			this.log('debug', `Parsed ${timelineEvents.length} events from timeline.`);

			let updatedNotesCount = 0;
			for (const event of timelineEvents) {
				// Ensure event has valid dates before attempting update
				if (event.startDate && event.endDate) {
					const updated = await this.updateNoteFromEvent(event);
					if (updated) updatedNotesCount++;
				} else {
					 this.log('warn', `Skipping update for event "${event.noteName}" due to invalid parsed dates (Start: ${event.startDate}, End: ${event.endDate}).`);
				}
			}

			 if (updatedNotesCount > 0 && this.settings.notificationConfig.enabled && this.settings.notificationConfig.detailLevel === 'detailed') {
				 new Notice(`Updated ${updatedNotesCount} notes from timeline.`);
			 }

			// Update last sync state *after* successful processing
			this.lastSync.timeline = content;
			 this.log('info', "Finished sync from Markwhen timeline.");

		} catch (error: any) {
			this.log('error', 'Error during sync from timeline:', error);
			if (this.settings.notificationConfig.showErrors) {
				new Notice(`Error syncing from timeline: ${error.message || 'Unknown error'}`);
			}
		}
	}

	// Parse the content of the Markwhen file into structured events
	private parseMarkwhenContent(content: string): TimelineEvent[] {
		const events: TimelineEvent[] = [];
		const lines = content.split(/\r?\n/); // Handle different line endings
		let currentGroup: string | null = null;
		const groupStartTextLower = this.settings.formattingConfig.groupStartText.toLowerCase();
		const groupEndTextLower = this.settings.formattingConfig.groupEndText.toLowerCase();

		// Regex to capture: (date part): [[link]] #optionalTag
		const eventLineRegex = /^(.*?):\s*\[\[(.*?)]](?:\s*(#[\w-]+))?\s*$/;

		for (let i = 0; i < lines.length; i++) { // Use index for logging line number
			const line = lines[i];
			const trimmedLine = line.trim();
			if (trimmedLine === '') continue;

			const trimmedLineLower = trimmedLine.toLowerCase();

			// Handle group start/end (case-insensitive)
			if (trimmedLineLower.startsWith(groupStartTextLower + ' ')) {
				currentGroup = trimmedLine.substring(this.settings.formattingConfig.groupStartText.length + 1).trim();
				this.log('debug', `Line ${i+1}: Started group "${currentGroup}"`);
				continue;
			} else if (trimmedLineLower === groupEndTextLower) {
				this.log('debug', `Line ${i+1}: Ended group "${currentGroup}"`);
				currentGroup = null;
				continue;
			}

			// Match event line format
			const match = trimmedLine.match(eventLineRegex);
			if (match) {
				const dateRangePart = match[1].trim();
				const noteName = match[2].trim();
				const statusTag = match[3] ? match[3].substring(1) : null; // Extract status from #tag

				let startDate: string | null = null;
				let endDate: string | null = null;

				// Check for ISO format first if enabled
				if (this.settings.formattingConfig.supportISODateFormat && dateRangePart.includes('T') && dateRangePart.includes('Z')) {
					const isoParts = dateRangePart.split(/\s*-\s*/);
					if (isoParts.length >= 1 && isoParts[0]) {
						startDate = this.formatISODateToNormal(isoParts[0]);
						endDate = (isoParts.length === 2 && isoParts[1]) ? this.formatISODateToNormal(isoParts[1]) : startDate;
						if (startDate === null || endDate === null) {
							 this.log('warn', `Line ${i+1}: Failed to parse ISO date range: "${dateRangePart}" for note "[[${noteName}]]". Skipping event.`);
							 continue; // Skip this event
						}
					} else {
						 this.log('warn', `Line ${i+1}: Could not split ISO date range correctly: "${dateRangePart}" for note "[[${noteName}]]". Skipping event.`);
						 continue;
					}
				} else {
					// Standard format parsing
					const dateParts = dateRangePart.split('/');
					if (dateParts.length > 0 && dateParts[0].trim()) {
						startDate = this.formatDate(dateParts[0].trim());
						endDate = (dateParts.length === 2 && dateParts[1].trim()) ? this.formatDate(dateParts[1].trim(), true) : startDate;

						// Validate parsed standard dates more strictly using the configured format
						if (!window.moment(startDate, this.settings.formattingConfig.dateFormat, true).isValid() ||
							!window.moment(endDate, this.settings.formattingConfig.dateFormat, true).isValid())
						{
							 this.log('warn', `Line ${i+1}: Failed to parse standard date range or result is invalid according to format '${this.settings.formattingConfig.dateFormat}': "${dateRangePart}" -> "${startDate}" / "${endDate}" for note "[[${noteName}]]". Skipping event.`);
							 continue; // Skip if standard dates are invalid after formatting
						}

					} else {
						 this.log('warn', `Line ${i+1}: Invalid standard date part: "${dateRangePart}" for note "[[${noteName}]]". Skipping event.`);
						 continue;
					}
				}

				// Add event if all parts are valid
				if (noteName && startDate && endDate) {
					events.push({
						startDate,
						endDate,
						noteName,
						group: currentGroup,
						status: statusTag
					});
				} else {
					 this.log('warn', `Line ${i+1}: Could not create valid event from line: "${trimmedLine}" (Note: ${noteName}, Start: ${startDate}, End: ${endDate})`);
				}
			} else {
				 this.log('debug', `Line ${i+1}: Does not match event format: "${trimmedLine}"`);
			}
		}
		return events;
	}

	// Update an Obsidian note based on a parsed timeline event
	private async updateNoteFromEvent(event: TimelineEvent): Promise<boolean> {
		if (!this.settings.enableBidirectionalSync) return false;

		// Construct the potential note path
		const notePath = `${this.settings.notesFolderPath}/${event.noteName}.md`;
		const noteFile = this.app.vault.getAbstractFileByPath(notePath);

		if (!(noteFile instanceof TFile)) {
			 // this.log('debug', `Note file not found for event "${event.noteName}", skipping update.`); // Less verbose
			 return false;
		}

		// --- Crucial Check: Ensure event dates are valid before proceeding ---
		// Dates should be in 'YYYY-MM-DD' format by now
		if (!event.startDate || !event.endDate ||
			!window.moment(event.startDate, 'YYYY-MM-DD', true).isValid() ||
			!window.moment(event.endDate, 'YYYY-MM-DD', true).isValid())
		{
			this.log('warn', `Skipping update for "${event.noteName}" because event dates are invalid or missing after parsing. Start: ${event.startDate}, End: ${event.endDate}`);
			return false;
		}

		const dateProperty = this.settings.propertyConfig.dateProperty;
		const endDateProperty = this.settings.propertyConfig.endDateProperty;
		const groupProperty = this.settings.groupingConfig.propertyName;
		const statusProperty = this.settings.customProperty;

		let updateMade = false;

		try {
			// Use processFrontMatter for safe updates
			await this.app.fileManager.processFrontMatter(noteFile, (fm) => {
				// Update Dates
				if (this.settings.bidirectionalSyncConfig.syncDates) {
					if (fm[dateProperty] !== event.startDate) {
						fm[dateProperty] = event.startDate;
						updateMade = true;
						this.log('debug', `Updating "${dateProperty}" for "${event.noteName}" to "${event.startDate}".`);
					}
					if (fm[endDateProperty] !== event.endDate) {
						fm[endDateProperty] = event.endDate;
						updateMade = true;
						this.log('debug', `Updating "${endDateProperty}" for "${event.noteName}" to "${event.endDate}".`);
					}
				}
				// Update Group
				if (this.settings.bidirectionalSyncConfig.syncGroup) {
					if (event.group && fm[groupProperty] !== event.group) {
						fm[groupProperty] = event.group;
						updateMade = true;
						this.log('debug', `Updating "${groupProperty}" for "${event.noteName}" to "${event.group}".`);
					} else if (!event.group && fm.hasOwnProperty(groupProperty)) {
						delete fm[groupProperty];
						updateMade = true;
						this.log('debug', `Removing "${groupProperty}" for "${event.noteName}".`);
					}
				}
				// Update Status
				if (this.settings.bidirectionalSyncConfig.syncStatus) {
					if (event.status && fm[statusProperty] !== event.status) {
						fm[statusProperty] = event.status;
						updateMade = true;
						this.log('debug', `Updating "${statusProperty}" for "${event.noteName}" to "${event.status}".`);
					} else if (!event.status && fm.hasOwnProperty(statusProperty)) {
						 delete fm[statusProperty];
						 updateMade = true;
						 this.log('debug', `Removing "${statusProperty}" for "${event.noteName}".`);
					}
				}
			});

			// Handle Inline Properties (remains complex and generally discouraged for bidirectional)
			if (this.settings.propertyConfig.allowInlineProperties && updateMade) {
				this.log('warn', "Bidirectional sync for inline properties is not fully supported and may be unreliable.");
			}

			if (updateMade) {
				 this.log('debug', `Successfully processed updates for note "${event.noteName}".`);
			}
			return updateMade;

		} catch (error: any) {
			this.log('error', `Error updating note "${notePath}" using processFrontMatter:`, error);
			if (this.settings.notificationConfig.showErrors) {
				new Notice(`Error updating note ${event.noteName}: ${error.message || 'Unknown error'}`);
			}
			return false;
		}
	}

	// Generate the content for the Markwhen timeline file from entries
	private async generateTimelineContent(entries: Entry[]): Promise<string> {
		let content = '';
		const header = this.settings.timelineHeader || '';
		if (header) {
			content += header.trim() + '\n\n';
		}

		if (this.settings.groupingConfig.enabled) {
			const grouped = this.groupEntries(entries); // Grouping doesn't need to be async

			// Sort group keys
			const sortedGroupKeys = [...grouped.keys()].sort((a, b) => {
				const sortBy = this.settings.groupingConfig.sortBy;
				if (sortBy === 'alpha') {
					return String(a).localeCompare(String(b));
				} else if (sortBy === 'number') {
					const numA = parseFloat(String(a)); // Convert to string first
					const numB = parseFloat(String(b));
					return !isNaN(numA) && !isNaN(numB) ? numA - numB : String(a).localeCompare(String(b));
				} else if (sortBy === 'date') {
					const earliestDate = (groupEntries: Entry[]): import('moment').Moment | null => groupEntries.reduce((earliest: import('moment').Moment | null, entry: Entry) => {
						 // Use window.moment here
						 const entryDate = window.moment(entry.metadata[this.settings.propertyConfig.dateProperty], this.settings.formattingConfig.dateFormat);
						 return !earliest || (entryDate.isValid() && entryDate.isBefore(earliest)) ? entryDate : earliest;
					 }, null);
					const dateA = earliestDate(grouped.get(a) || []);
					const dateB = earliestDate(grouped.get(b) || []);
					if (dateA && dateB) return dateA.diff(dateB);
					if (dateA) return -1;
					if (dateB) return 1;
					return String(a).localeCompare(String(b));
				}
				return 0;
			});

			// Format grouped entries
			for (const group of sortedGroupKeys) {
				const groupEntries = grouped.get(group) || [];
				content += `\n${this.settings.formattingConfig.groupStartText} ${group}\n`;
				content += this.formatEntries(groupEntries);
				content += `${this.settings.formattingConfig.groupEndText}\n`;
			}
		} else {
			// Format all entries without grouping
			content += this.formatEntries(entries);
		}

		return content.trim();
	}

	// Group entries based on the configured property
	private groupEntries(entries: Entry[]): Map<string, Entry[]> {
		const grouped = new Map<string, Entry[]>();
		const groupProperty = this.settings.groupingConfig.propertyName;

		for (const entry of entries) {
			const groupValue = entry.metadata[groupProperty] || 'Ungrouped'; // Default group
			const groupKey = String(groupValue); // Ensure group key is a string
			if (!grouped.has(groupKey)) {
				grouped.set(groupKey, []);
			}
			grouped.get(groupKey)?.push(entry);
		}
		return grouped;
	}

	// Format a list of entries into Markwhen syntax lines
	private formatEntries(entries: Entry[]): string {
		const dateProperty = this.settings.propertyConfig.dateProperty;
		const endDateProperty = this.settings.propertyConfig.endDateProperty;
		const statusProperty = this.settings.customProperty;
		const dateFormat = this.settings.formattingConfig.dateFormat;

		// Sort entries based on settings
		const sortedEntries = [...entries].sort((a, b) => {
			const sortBy = this.settings.groupingConfig.enabled ? this.settings.groupingConfig.sortEntriesBy : 'date';
			if (sortBy === 'date') {
				// Use window.moment here
				const dateA = window.moment(a.metadata[dateProperty], dateFormat);
				const dateB = window.moment(b.metadata[dateProperty], dateFormat);
				if (dateA.isValid() && !dateB.isValid()) return -1;
				if (!dateA.isValid() && dateB.isValid()) return 1;
				if (!dateA.isValid() && !dateB.isValid()) return a.title.localeCompare(b.title);
				return dateA.diff(dateB);
			} else if (sortBy === 'alpha') {
				return a.title.localeCompare(b.title);
			}
			return 0;
		});

		let content = '';
		for (const entry of sortedEntries) {
			// Format dates using the helper, ensuring validity
			const startDate = this.formatDate(entry.metadata[dateProperty]);
			const endDate = this.formatDate(entry.metadata[endDateProperty], true);

			let dateRangeString = startDate;
			// Only add end date if different and start date was valid
			// Use window.moment here
			if (endDate && endDate !== startDate && window.moment(startDate, dateFormat, true).isValid()) {
				dateRangeString += ` / ${endDate}`;
			}

			const statusValue = entry.metadata[statusProperty];
			const statusTag = this.settings.formattingConfig.showStatusTags && statusValue
				? ` #${String(statusValue).replace(/\s+/g, '-')}`
				: '';

			content += `${dateRangeString}: [[${entry.title}]]${statusTag}\n`;
		}
		return content;
	}

	// Check if an entry's metadata meets the criteria for syncing
	private isValidEntry(metadata: Record<string, any>, noteTitle: string = 'Untitled'): boolean {
		if (!metadata) return false;

		const dateProperty = this.settings.propertyConfig.dateProperty;
		const endDateProperty = this.settings.propertyConfig.endDateProperty;
		const statusProperty = this.settings.customProperty;
		const tagsProperty = this.settings.tagConfig.propertyName;
		const dateFormat = this.settings.formattingConfig.dateFormat;

		// --- Date Check ---
		const startDateValue = metadata[dateProperty];
		const endDateValue = metadata[endDateProperty];
		if (!startDateValue || typeof startDateValue !== 'string' || startDateValue.trim() === '' ||
			!endDateValue || typeof endDateValue !== 'string' || endDateValue.trim() === '') {
			 this.log('debug', `Invalid entry "${noteTitle}" - Missing or empty date properties.`);
			 return false;
		}
		// Validate date format *in the note* against the setting
		// Use window.moment here
		if (!window.moment(startDateValue, dateFormat, true).isValid() ||
			!window.moment(endDateValue, dateFormat, true).isValid())
		{
			 this.log('debug', `Invalid entry "${noteTitle}" - Date format doesn't match settings ('${dateFormat}'). Start: ${startDateValue}, End: ${endDateValue}`);
			 // Allow sync even if format is slightly off? Or enforce? Enforcing for now.
			 return false;
		}

		// --- Excluded Status Check ---
		const statusValue = metadata[statusProperty];
		if (statusValue && this.settings.filterConfig.excludeStatus.length > 0) {
			 const lowerCaseStatus = String(statusValue).toLowerCase();
			 if (this.settings.filterConfig.excludeStatus.map(s => s.toLowerCase()).includes(lowerCaseStatus)) {
				 this.log('debug', `Invalid entry "${noteTitle}" - Excluded status: "${statusValue}"`);
				 return false;
			 }
		}

		// --- Required Tags Check ---
		const requiredTags = this.settings.tagConfig.tags;
		if (requiredTags && requiredTags.length > 0 && requiredTags[0] !== '') {
			let entryTagsRaw = metadata[tagsProperty];
			let entryTags: string[] = [];
			// Normalize entryTags to an array of lowercase strings
			if (!entryTagsRaw) {
				entryTags = [];
			} else if (typeof entryTagsRaw === 'string') {
				entryTags = entryTagsRaw.split(/[, ]+/).map(t => t.trim().toLowerCase()).filter(t => t !== '');
			} else if (Array.isArray(entryTagsRaw)) {
				entryTags = entryTagsRaw.map(t => String(t).toLowerCase().trim()).filter(t => t !== '');
			} else {
				entryTags = [String(entryTagsRaw).toLowerCase().trim()].filter(t => t !== '');
			}

			const lowerCaseRequiredTags = requiredTags.map(t => t.toLowerCase());

			if (this.settings.tagConfig.requireAllTags) {
				if (!lowerCaseRequiredTags.every(reqTag => entryTags.includes(reqTag))) {
					 this.log('debug', `Invalid entry "${noteTitle}" - Missing required tags (require all). Needed: ${lowerCaseRequiredTags.join(', ')}, Found: ${entryTags.join(', ')}`);
					 return false;
				}
			} else {
				if (!lowerCaseRequiredTags.some(reqTag => entryTags.includes(reqTag))) {
					 this.log('debug', `Invalid entry "${noteTitle}" - Missing required tags (require any). Needed one of: ${lowerCaseRequiredTags.join(', ')}, Found: ${entryTags.join(', ')}`);
					 return false;
				}
			}
		}

		 // --- Date Filter Check ---
		 if (this.settings.filterConfig.enableDateFilter) {
			 // Use window.moment here
			 const startDate = window.moment(startDateValue, dateFormat);
			 const endDate = window.moment(endDateValue, dateFormat);
			 const now = window.moment();

			 if (!startDate.isValid()) { // If start date invalid (should have been caught earlier, but safety check)
				 this.log('debug', `Invalid entry "${noteTitle}" - Date filtering enabled but start date is invalid.`);
				 return false;
			 }

			 const filterType = this.settings.filterConfig.dateFilterType;
			 if (filterType === 'future') { // Start date is today or later
				 if (startDate.isBefore(now.startOf('day'))) {
					 this.log('debug', `Invalid entry "${noteTitle}" - Filtered out past event (future only).`);
					 return false;
				 }
			 } else if (filterType === 'current') { // Today is within the start/end range
				 const endCompareDate = endDate.isValid() ? endDate : startDate; // Use start date if end date is invalid
				 if (!now.isBetween(startDate, endCompareDate, 'day', '[]')) { // '[]' includes start/end days
					 this.log('debug', `Invalid entry "${noteTitle}" - Filtered out non-current event (current only).`);
					 return false;
				 }
			 }
			 // 'all' type passes through
		 }


		// If all checks passed
		return true;
	}

	// Cleanup on plugin unload
	onunload(): void {
		this.log('info', 'Markwhen Sync plugin unloaded.');
		// Obsidian automatically clears intervals registered with this.registerInterval
		if (this.autoSyncIntervalId !== null) {
			window.clearInterval(this.autoSyncIntervalId);
			 this.log('debug', "Cleared auto-sync interval manually (onunload).");
		}
		// Cancel any pending debounced function calls (TS2339 fix)
		if (this.debouncedHandleFileChange && typeof this.debouncedHandleFileChange.cancel === 'function') {
			this.debouncedHandleFileChange.cancel();
			 this.log('debug', "Cancelled pending debounced operations.");
		}
	}

	// Helper for logging based on debug settings
	private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, ...args: any[]): void {
		if (!this.settings?.debugConfig?.enabled) return; // Add null checks for settings

		const levelMap = { error: 0, warn: 1, info: 2, debug: 3 };
		const currentLevel = levelMap[this.settings.debugConfig.logLevel];
		const messageLevel = levelMap[level];

		if (messageLevel <= currentLevel) {
			const prefix = `[Markwhen Sync|${level.toUpperCase()}]`;
			if (level === 'error') {
				console.error(prefix, message, ...args);
			} else if (level === 'warn') {
				console.warn(prefix, message, ...args);
			} else if (level === 'info') {
				console.info(prefix, message, ...args);
			} else {
				console.log(prefix, message, ...args);
			}
		}
	}
}

