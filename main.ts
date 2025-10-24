import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, View, WorkspaceLeaf } from 'obsidian';
import { BookHighlightsView, VIEW_TYPE_BOOK_HIGHLIGHTS } from './src/BookHighlightsView';

interface BookHighlightsPluginSettings {
  autoRefresh: boolean;
  showBookTitle: boolean;
  showAuthor: boolean;
  showComments: boolean;
  showMetadata: boolean;

  // Content settings
  maxHighlights: number;
  randomHighlightsCount: number;
  refreshInterval: number;

  // Highlight detection settings
  filterProperty: string;
  filterValue: string;
  highlightExample: string;

  // Folder settings
  highlightsFolder: string;  // Folder to search for highlight notes
  
  // Filename parsing
  filenameFormat: string; // Format to parse title and author from filename
}

const DEFAULT_SETTINGS: BookHighlightsPluginSettings = {
  // Display settings
  autoRefresh: true,
  showBookTitle: true,
  showAuthor: true,
  showComments: true,
  showMetadata: true,

  // Content settings
  maxHighlights: 50,
  randomHighlightsCount: 5,
  refreshInterval: 300, // in seconds

  // Highlight detection settings
  filterProperty: 'subtopic',
  filterValue: 'Book Highlights',
  highlightExample: '> Your highlight text here\n**Note:** Your note about the highlight',

  // Folder settings
  highlightsFolder: '',  // Empty means search entire vault
  
  // Filename parsing
  filenameFormat: '{{title}} by {{author}}' // Default format for parsing title and author from filename
};

export default class BookHighlightsPlugin extends Plugin {
  settings: BookHighlightsPluginSettings;
  private refreshIntervalId: number | null = null;
  async onload() {
    await this.loadSettings();

    // Register the view
    this.registerView(
      VIEW_TYPE_BOOK_HIGHLIGHTS,
      (leaf: WorkspaceLeaf) => new BookHighlightsView(leaf, this) as unknown as View
    );
    
    // Set up auto-refresh if enabled
    this.setupAutoRefresh();
    
    // Add the view on startup if it doesn't exist
    this.app.workspace.onLayoutReady(() => {
      this.activateView();
    });

    // Add a ribbon icon to open the view
    this.addRibbonIcon('book', 'Open Book Highlights', () => {
      this.activateView();
    });

    // Add a command to open the view
    this.addCommand({
      id: 'open-book-highlights',
      name: 'Open Book Highlights',
      callback: () => {
        this.activateView();
      }
    });

    // Add a command to refresh highlights
    this.addCommand({
      id: 'refresh-highlights',
      name: 'Refresh Book Highlights',
      callback: () => {
        this.refreshAllViews();
      }
    });

    // Add settings tab
    this.addSettingTab(new BookHighlightsSettingTab(this.app, this));

    // Auto-refresh when files change if enabled
    if (this.settings.autoRefresh) {
      this.registerEvent(
        this.app.vault.on('modify', (file) => {
          if (file.path.endsWith('.md')) {
            this.refreshAllViews();
          }
        })
      );
    }
	}

  async onunload() {
    // Clean up when the plugin is disabled
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_BOOK_HIGHLIGHTS);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.setupAutoRefresh(); // Re-setup auto-refresh when settings change
    this.refreshAllViews();
  }
  
  private setupAutoRefresh() {
    // Clear any existing interval
    this.clearAutoRefresh();
    
    // Set up new interval if auto-refresh is enabled and interval is greater than 0
    if (this.settings.autoRefresh && this.settings.refreshInterval > 0) {
      this.refreshIntervalId = window.setInterval(
        () => this.refreshAllViews(),
        this.settings.refreshInterval * 1000 // Convert to milliseconds
      );
    }
    
    // Still keep the file modification listener
    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file.path.endsWith('.md')) {
          this.refreshAllViews();
        }
      })
    );
  }
  
  private clearAutoRefresh() {
    if (this.refreshIntervalId !== null) {
      window.clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  async activateView() {
    const { workspace } = this.app;

    // Check if the view is already open
    let leaves = workspace.getLeavesOfType(VIEW_TYPE_BOOK_HIGHLIGHTS);
    let leaf: WorkspaceLeaf;

    if (leaves.length > 0) {
      // If the view is already open, just reveal it
      leaf = leaves[0];
      workspace.revealLeaf(leaf);
    } else {
      // Otherwise, create a new leaf in the right sidebar
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) return; // Shouldn't happen, but TypeScript needs this check
      
      leaf = rightLeaf;
      await leaf.setViewState({
        type: VIEW_TYPE_BOOK_HIGHLIGHTS,
        active: true,
      });
      workspace.revealLeaf(leaf);
    }

    // Refresh the view
    if (leaf) {
      const view = leaf.view as unknown as BookHighlightsView;
      if (view) {
        await view.refreshHighlights();
      }
    }
  }

  async refreshAllViews() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_HIGHLIGHTS);
    for (const leaf of leaves) {
      const view = leaf.view as unknown as BookHighlightsView;
      if (view) {
        await view.refreshHighlights();
      }
    }
  }
}

class BookHighlightsSettingTab extends PluginSettingTab {
  plugin: BookHighlightsPlugin;

  constructor(app: App, plugin: BookHighlightsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;
    containerEl.empty();

    containerEl.createEl('h2', {text: 'Book Highlights Settings'});

    new Setting(containerEl)
      .setName('Auto-refresh')
      .setDesc('Automatically refresh highlights when opening the view')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoRefresh)
        .onChange(async (value) => {
          this.plugin.settings.autoRefresh = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show book title')
      .setDesc('Show the book title for each highlight')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showBookTitle)
        .onChange(async (value) => {
          this.plugin.settings.showBookTitle = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show author')
      .setDesc('Show the author for each highlight')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showAuthor)
        .onChange(async (value) => {
          this.plugin.settings.showAuthor = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show comments')
      .setDesc('Show comments for each highlight')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showComments)
        .onChange(async (value) => {
          this.plugin.settings.showComments = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show metadata')
      .setDesc('Show metadata like page number and location')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showMetadata)
        .onChange(async (value) => {
          this.plugin.settings.showMetadata = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Maximum highlights to load')
      .setDesc('The more highlights we load, the bigger selection we have (0 for no limit)')
      .addText(text => text
        .setValue(this.plugin.settings.maxHighlights.toString())
        .onChange(async (value) => {
          this.plugin.settings.maxHighlights = parseInt(value) || 0;
          await this.plugin.saveSettings();
        }));
        
    new Setting(containerEl)
      .setName('Number of random highlights')
      .setDesc('Number of random highlights to display in the pane.')
      .addText(text => text
        .setValue(this.plugin.settings.randomHighlightsCount.toString())
        .onChange(async (value) => {
          this.plugin.settings.randomHighlightsCount = Math.max(1, parseInt(value) || 1);
          await this.plugin.saveSettings();
        }));
        
    new Setting(containerEl)
      .setName('Refresh interval (seconds)')
      .setDesc('How often to show new random highlights (0 to disable auto-refresh)')
      .addText(text => text
        .setValue(this.plugin.settings.refreshInterval.toString())
        .onChange(async (value) => {
          this.plugin.settings.refreshInterval = Math.max(0, parseInt(value) || 300);
          await this.plugin.saveSettings();
        }));
        
    // Add a separator
    containerEl.createEl('h3', { text: 'Note Filtering' });
    
    // Filter property setting
    new Setting(containerEl)
      .setName('Filter Property')
      .setDesc('Frontmatter property to identify book notes (e.g., "type")')
      .addText(text => text
        .setValue(this.plugin.settings.filterProperty)
        .onChange(async (value) => {
          this.plugin.settings.filterProperty = value || 'type';
          await this.plugin.saveSettings();
        }));
    
    // Filter value setting
    new Setting(containerEl)
      .setName('Filter Value')
      .setDesc('Value that identifies a book note (e.g., "book")')
      .addText(text => text
        .setValue(this.plugin.settings.filterValue)
        .onChange(async (value) => {
          this.plugin.settings.filterValue = value;
          await this.plugin.saveSettings();
        }));

    // Filename format setting
    new Setting(containerEl)
      .setName('Filename Format')
      .setDesc('Format to parse title and author from filename (use {{title}} and {{author}} placeholders)')
      .addText(text => text
        .setValue(this.plugin.settings.filenameFormat)
        .onChange(async (value) => {
          this.plugin.settings.filenameFormat = value || '{{title}} by {{author}}';
          await this.plugin.saveSettings();
        }));

    // Highlights folder setting
    new Setting(containerEl)
      .setName('Highlights Folder')
      .setDesc('Optional: Only process files in this folder (leave empty to search entire vault)')
      .addText(text => text
        .setValue(this.plugin.settings.highlightsFolder)
        .onChange(async (value) => {
          // Remove leading/trailing slashes
          this.plugin.settings.highlightsFolder = value.replace(/^\/+|\/+$/g, '');
          await this.plugin.saveSettings();
        }));
          
    // No specific format instructions needed - the plugin is now more flexible
  }
}
