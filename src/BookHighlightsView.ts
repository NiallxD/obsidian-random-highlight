import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as yaml from 'js-yaml';
import BookHighlightsPlugin from '../main';

export const VIEW_TYPE_BOOK_HIGHLIGHTS = 'book-highlights-view';

interface BookHighlight {
  bookTitle: string;
  author: string | null;
  date: string;
  page: string;
  location: string;
  text: string;
  comment: string;
  sourceFile: string;
}

export class BookHighlightsView extends ItemView {
  private highlights: BookHighlight[] = [];
  private refreshInterval: number | null = null;
  private plugin: BookHighlightsPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: BookHighlightsPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_BOOK_HIGHLIGHTS;
  }
  
  getDisplayText(): string {
    return 'Book Highlights';
  }
  
  getIcon(): string {
    return 'book';
  }

  async onOpen() {
    await super.onOpen();
    this.contentEl = this.containerEl.children[1] as HTMLElement;
    this.contentEl.empty();
    this.contentEl.addClass('book-highlights-view');
    
    // Add header
    const header = this.contentEl.createEl('div', { cls: 'book-highlights-header' });
    
    // Add title
    header.createEl('h3', { text: 'Book Highlights' });
    
    // Add refresh button
    const refreshButton = header.createEl('button', { 
      text: ' Refresh',
      cls: 'mod-cta'
    });
    refreshButton.onclick = () => this.refreshHighlights();
    
    // Add container for highlights
    this.contentEl.createEl('div', { cls: 'book-highlights-container' });
    
    // Initial load
    await this.refreshHighlights();
    
    // Set up auto-refresh if enabled
    this.setupAutoRefresh();
  }
  
  private setupAutoRefresh() {
    // Clear any existing interval
    if (this.refreshInterval) {
      window.clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Set up new interval if refresh is enabled and interval is greater than 0
    const refreshSeconds = this.plugin.settings.refreshInterval;
    if (this.plugin.settings.autoRefresh && refreshSeconds > 0) {
      this.refreshInterval = window.setInterval(
        () => this.refreshHighlights(),
        refreshSeconds * 1000
      );
    }
  }

  async refreshHighlights() {
    try {
      console.log('Starting to refresh highlights...');
      
      // Get all markdown files in the vault
      let files = this.app.vault.getMarkdownFiles();
      
      // Filter by folder if specified
      const highlightsFolder = this.plugin.settings.highlightsFolder;
      if (highlightsFolder) {
        const folderPath = highlightsFolder.endsWith('/') ? highlightsFolder : `${highlightsFolder}/`;
        files = files.filter(file => file.path.startsWith(folderPath));
        console.log(`Filtering to ${files.length} files in folder: ${highlightsFolder}`);
      } else {
        console.log(`Searching all ${files.length} markdown files in the vault`);
      }
      
      const highlights: BookHighlight[] = [];
      let processedFiles = 0;
      let matchedFilterCount = 0;
      
      // Process each file
      for (const file of files) {
        processedFiles++;
        if (processedFiles % 10 === 0) {
          console.log(`Processing file ${processedFiles}/${files.length}...`);
        }
        
        try {
          const content = await this.app.vault.read(file);
          const frontmatter = this.extractFrontmatter(content);
          
          // Skip files without frontmatter or title
          if (!frontmatter) {
            console.log(`Skipping ${file.path} - no frontmatter found`);
            continue;
          }
          
          // Check if this is a book note based on filter settings
          const filterProperty = this.plugin.settings.filterProperty;
          const filterValue = this.plugin.settings.filterValue;
          
          if (filterProperty && filterValue) {
            const propertyValue = frontmatter[filterProperty];
            let matches = false;
            
            // Handle different types of property values
            if (propertyValue === undefined) {
              // Property doesn't exist
              matches = false;
            } else if (Array.isArray(propertyValue)) {
              // Handle array values
              matches = propertyValue.some(item => 
                String(item).trim() === String(filterValue).trim()
              );
            } else if (typeof propertyValue === 'string') {
              // Handle string values (including JSON strings)
              try {
                // Try to parse as JSON array
                const parsedArray = JSON.parse(propertyValue);
                if (Array.isArray(parsedArray)) {
                  matches = parsedArray.some(item => 
                    String(item).trim() === String(filterValue).trim()
                  );
                } else {
                  // Not an array, do direct comparison
                  matches = String(propertyValue).trim() === String(filterValue).trim();
                }
              } catch (e) {
                // Not valid JSON, do direct string comparison
                matches = String(propertyValue).trim() === String(filterValue).trim();
              }
            } else {
              // Handle other types (numbers, booleans, etc.)
              matches = String(propertyValue).trim() === String(filterValue).trim();
            }
            
            if (!matches) {
              console.log(`Skipping ${file.path} - doesn't match filter (${filterProperty}: ${JSON.stringify(propertyValue)} !== ${filterValue})`);
              continue;
            }
          }
          
          console.log(`Processing file: ${file.path}`);
          
          // Extract highlights from the file
          const bookHighlights = this.extractHighlights(content, file.path, frontmatter);
          console.log(`Found ${bookHighlights.length} highlights in ${file.path}`);
          
          if (bookHighlights.length > 0) {
            highlights.push(...bookHighlights);
            matchedFilterCount++;
            console.log(`Added ${bookHighlights.length} highlights from ${file.path}`);
          }
          
          // Stop if we've reached the maximum number of highlights
          if (this.plugin.settings.maxHighlights > 0 && 
              highlights.length >= this.plugin.settings.maxHighlights) {
            console.log(`Reached maximum highlights limit (${this.plugin.settings.maxHighlights})`);
            highlights.length = this.plugin.settings.maxHighlights;
            break;
          }
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
        }
      }
      
      console.log(`Processed ${matchedFilterCount} files matching the filter`);
      
      console.log(`Total highlights found: ${highlights.length}`);
      
      this.highlights = highlights;
      this.displayHighlights();
    } catch (error) {
      console.error('Error refreshing highlights:', error);
      this.contentEl.createEl('p', { 
        text: 'Error loading highlights. Check console for details.' 
      });
    }
  }
  
  private extractFrontmatter(content: string): any {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;
    
    try {
      return yaml.load(frontmatterMatch[1]) || {};
    } catch (e) {
      console.error('Error parsing frontmatter:', e);
      return null;
    }
  }
  
  private parseTitleAndAuthor(filename: string): { title: string, author: string | null } {
    // Remove the file extension
    const basename = filename.replace(/\.(md|markdown|txt)$/i, '');
    
    // Get the format from settings
    const format = this.plugin.settings.filenameFormat || '{{title}} by {{author}}';
    
    // Escape special regex characters and replace placeholders with capture groups
    const pattern = format
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // Escape special regex chars
      .replace(/\\{\\{title\\}\\}/g, '(.+)')
      .replace(/\\{\\{author\\}\\}/g, '(.+)');
      
    const regex = new RegExp(`^${pattern}$`);
    const match = basename.match(regex);
    
    if (match) {
      // Find the indices of the placeholders in the format
      const titleIndex = format.indexOf('{{title}}');
      const authorIndex = format.indexOf('{{author}}');
      
      // The first group is the full match, so we start from index 1
      if (titleIndex >= 0 && authorIndex >= 0) {
        // Both title and author are present
        return {
          title: titleIndex < authorIndex ? match[1] : match[2],
          author: titleIndex < authorIndex ? match[2] : match[1]
        };
      } else if (titleIndex >= 0) {
        // Only title is present
        return { title: match[1], author: null };
      } else if (authorIndex >= 0) {
        // Only author is present (unlikely, but handle it)
        return { title: match[1], author: null };
      }
    }
    
    // Fallback: return the filename as title if parsing fails
    return { title: basename, author: null };
  }
  
  private extractHighlights(content: string, filePath: string, frontmatter: any): BookHighlight[] {
    console.log(`Processing file: ${filePath}`);
    console.log('Frontmatter:', frontmatter);
    
    // Extract filename from path
    const filename = filePath.split('/').pop() || '';
    const { title: filenameTitle, author: filenameAuthor } = this.parseTitleAndAuthor(filename);
    
    const highlights: BookHighlight[] = [];
    
    // Log the first 500 characters of content to see what we're working with
    console.log('Content preview (first 500 chars):', content.substring(0, 500) + '...');
    
    // Look for any callout pattern [!...] and capture everything until the next callout or end of content
    const calloutRegex = /> \[!([^\]]+)\]([\s\S]*?)(?=\n\n|\n> \[!|$)/g;
    
    let match;
    
    while ((match = calloutRegex.exec(content)) !== null) {
      const calloutType = match[1] || '';
      let calloutContent = match[2] || '';
      
      // Clean up the content
      calloutContent = calloutContent
        .replace(/^\n> /, '')  // Remove leading newline and blockquote
        .replace(/\n> /g, '\n')  // Remove blockquote markers from subsequent lines
        .trim();
      
      // Try to extract metadata if it follows a common pattern
      let date = '';
      let page = '';
      let location = '';
      let text = calloutContent;
      let comment = '';
      
      // Check for common metadata patterns
      const metadataPatterns = [
        { regex: /Highlighted: ([^\n]+)/, target: 'date' },
        { regex: /Page(?: Number)?: (\d+)/, target: 'page' },
        { regex: /Location: (\d+)/, target: 'location' },
        { regex: /My Comments:([\s\S]*?)(?=\n\w+:|$)/, target: 'comment' }
      ];
      
      // Extract metadata if present
      for (const { regex, target } of metadataPatterns) {
        const match = calloutContent.match(regex);
        if (match) {
          if (target === 'comment') {
            comment = match[1]?.trim() || '';
            // Remove the comment from the main text
            text = text.replace(regex, '').trim();
          } else {
            const value = match[1]?.trim() || '';
            if (target === 'date') date = value;
            else if (target === 'page') page = value;
            else if (target === 'location') location = value;
            // Remove this metadata from the main text
            text = text.replace(regex, '').trim();
          }
        }
      }
      
      // Clean up the text
      text = text
        .replace(/^Link: /, '')  // Remove 'Link: ' prefix if present
        .replace(/\s*\^ref-\d+$/, '')  // Remove reference numbers at the end (e.g., '^ref-12345')
        .trim();
        
      if (text) {
        // Use title from frontmatter, then from filename, then fallback to 'Unknown Book'
        const bookTitle = frontmatter.title || filenameTitle || 'Unknown Book';
        // Use author from frontmatter, then from filename, then null
        const author = frontmatter.author || filenameAuthor || null;
        
        const highlight: BookHighlight = {
          bookTitle: bookTitle,
          author: author,
          date: date,
          page: page,
          location: location,
          text: text,
          comment: comment,
          sourceFile: filePath
        };
        
        console.log('Found highlight:', { 
          calloutType,
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''), 
          page, 
          location,
          hasComment: !!comment
        });
        
        highlights.push(highlight);
      }
    }
    
    if (highlights.length === 0) {
      console.log('No highlights found in the file');
    }
    
    return highlights;
  }
  
  private extractHighlightsFromText(
    content: string, 
    filePath: string, 
    frontmatter: any, 
    patterns?: RegExp[]
  ): BookHighlight[] {
    // This is a fallback method that's not currently used
    return [];
  }
  
  private getRandomHighlights(): BookHighlight[] {
    if (this.highlights.length === 0) return [];
    
    const count = Math.min(
      this.plugin.settings.randomHighlightsCount,
      this.highlights.length
    );
    
    // Create a copy of highlights to avoid modifying the original array
    const shuffled = [...this.highlights].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  private displayHighlights() {
    const container = this.contentEl.querySelector('.book-highlights-container');
    if (!container) return;
    
    container.empty();
    
    const randomHighlights = this.getRandomHighlights();
    
    if (randomHighlights.length === 0) {
      container.createEl('p', { 
        text: 'No highlights found. Add some book highlights to your notes!',
        cls: 'no-highlights'
      });
      return;
    }
    
    randomHighlights.forEach(highlight => {
      const card = container.createEl('div', { cls: 'book-highlight-card' });
      
      // Add book title as a clickable link
      if (this.plugin.settings.showBookTitle) {
        const titleContainer = card.createEl('h4', { cls: 'book-title-container' });
        
        // Create a link to the source file
        const link = titleContainer.createEl('a', { 
          text: highlight.bookTitle,
          cls: 'book-title-link',
          href: '#'
        });
        
        // Add click handler to open the source file
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const file = this.app.vault.getAbstractFileByPath(highlight.sourceFile);
          if (file) {
            const leaf = this.app.workspace.getLeaf();
            this.app.workspace.setActiveLeaf(leaf, { focus: true });
            this.app.workspace.openLinkText(file.path, '', true);
          }
        });
        
        // Add author if enabled
        if (this.plugin.settings.showAuthor && highlight.author) {
          titleContainer.createEl('span', {
            text: ` by ${highlight.author}`,
            cls: 'book-author'
          });
        }
      }
      
      // Add highlight text
      const textEl = card.createEl('div', { 
        text: highlight.text,
        cls: 'highlight-text'
      });
      
      // Add comment if enabled and exists
      if (this.plugin.settings.showComments && highlight.comment) {
        card.createEl('div', {
          text: `Note: ${highlight.comment}`,
          cls: 'highlight-comment'
        });
      }
      
      // Add metadata if enabled
      if (this.plugin.settings.showMetadata) {
        const metaEl = card.createEl('div', { cls: 'highlight-meta' });
        
        if (highlight.page) {
          metaEl.createEl('span', { text: `Page ${highlight.page}` });
        }
        
        if (highlight.location) {
          if (highlight.page) metaEl.createEl('span', { text: ' • ' });
          metaEl.createEl('span', { text: `Location ${highlight.location}` });
        }
        
        if (highlight.date) {
          if (highlight.page || highlight.location) metaEl.createEl('span', { text: ' • ' });
          metaEl.createEl('span', { text: highlight.date });
        }
      }
    });
  }
  
  onClose() {
    // Clean up interval when view is closed
    if (this.refreshInterval) {
      window.clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.contentEl.empty();
    return super.onClose();
  }
}
