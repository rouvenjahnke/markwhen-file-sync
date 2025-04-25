import { Plugin } from 'obsidian';
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
interface MarkwhenSyncSettings {
    markwhenPath: string;
    notesFolderPath: string;
    enableBidirectionalSync: boolean;
    enableAutoSync: boolean;
    autoSyncInterval: string;
    customProperty: string;
    propertyConfig: PropertyConfig;
    bidirectionalSyncConfig: BidirectionalSyncConfig;
    tagConfig: TagConfig;
    groupingConfig: GroupingConfig;
    formattingConfig: FormattingConfig;
    filterConfig: FilterConfig;
    notificationConfig: NotificationConfig;
    debugConfig: DebugConfig;
    timelineHeader?: string;
}
export default class MarkwhenSync extends Plugin {
    settings: MarkwhenSyncSettings;
    lastSync: {
        notes: Map<string, number>;
        timeline: string;
    };
    private autoSyncIntervalId;
    private debouncedHandleFileChange;
    onload(): Promise<void>;
    loadSettings(): Promise<void>;
    saveSettings(): Promise<void>;
    setupAutoSync(): void;
    private handleFileChange;
    syncWithSettings(): Promise<void>;
    private collectEntries;
    private extractInlineProperties;
    private formatDate;
    private formatISODateToNormal;
    syncToMarkwhen(): Promise<void>;
    syncFromMarkwhen(): Promise<void>;
    private parseMarkwhenContent;
    private updateNoteFromEvent;
    private generateTimelineContent;
    private groupEntries;
    private formatEntries;
    private isValidEntry;
    onunload(): void;
    private log;
}
export {};
