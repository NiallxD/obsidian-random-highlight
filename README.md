# Random Highlights for Obsidian

![GitHub release (latest by date)](https://img.shields.io/github/v/release/NiallxD/obsidian-random-highlight)
![GitHub](https://img.shields.io/github/license/NiallxD/obsidian-random-highlight)

A plugin for [Obsidian](https://obsidian.md) that surfaces random highlights from your notes, perfect for rediscovering your saved book highlights and notes.

## Features

- Displays random highlights from your vault
- Clickable book titles that link to the source note
- Customizable display options (show/hide book title, author, comments, and metadata)
- Auto-refresh highlights at a configurable interval
- Filter highlights by frontmatter properties
- Responsive design that works in both desktop and mobile (with some limitations)

## Installation

### From Obsidian

1. Open Obsidian
2. Go to Settings → Community plugins
3. Enable "Community plugins" if not already enabled
4. Click "Browse" and search for "Random Highlights"
5. Click "Install" and then "Enable"

### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/NiallxD/obsidian-random-highlight/releases)
2. Extract the contents of the zip file to your vault's plugins folder: `.obsidian/plugins/obsidian-random-highlight`
3. Enable the plugin in Obsidian's settings

## Usage

1. Click the book icon in the left sidebar to open the Random Highlights view
2. Use the settings to customize which highlights are shown and how they're displayed
3. Click the refresh button to load new random highlights
4. Click on any book title to jump to the source note

## Configuration

Access the plugin settings in Obsidian's settings panel under "Random Highlights".

### Display Options
- **Show book title**: Toggle display of book titles
- **Show author**: Toggle display of book authors
- **Show comments**: Toggle display of your personal notes on highlights
- **Show metadata**: Toggle display of highlight metadata (page, location, date)
- **Max highlights to show**: Limit the number of highlights displayed at once
- **Random highlights count**: Number of random highlights to show when refreshing

### Auto-refresh
- **Auto-refresh**: Enable/disable automatic refreshing of highlights
- **Refresh interval (seconds)**: How often to show new random highlights (0 to disable auto-refresh)

### Note Filtering
- **Filter property**: Frontmatter property to filter by (e.g., 'tags')
- **Filter value**: Value to filter the property by (e.g., 'book')

## Development

### Prerequisites
- Node.js 16 or later
- npm or yarn

### Setup
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. In Obsidian, enable the plugin in the community plugins settings

### Building for production
Run `npm run build` to compile the plugin for production.

The compiled files will be in the root of the repository:
- `main.js` - The compiled plugin code
- `styles.css` - The compiled styles
- `manifest.json` - The plugin manifest

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please [open an issue](https://github.com/NiallxD/obsidian-random-highlight/issues) on GitHub.
  - `npm install -g eslint`
- To use eslint to analyze this project use this command:
  - `eslint main.ts`
  - eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder:
  - `eslint ./src/`

## Funding URL

You can include funding URLs where people who use your plugin can financially support it.

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See https://github.com/obsidianmd/obsidian-api
