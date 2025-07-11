# Image Descriptor

A VSCode/Cursor extension that generates accessible alternative text for images using AI (OpenAI GPT-4o).

## Features

- Right-click context menu integration for HTML files
- Supports both absolute URLs and relative file paths
- Automatically converts local images to base64 for AI processing
- Uses OpenAI's GPT-4o model for accurate image descriptions
- Follows web accessibility best practices for alt text generation

## Installation

### From the VSCode Marketplace
1. Open VSCode or Cursor
2. Go to the Extensions panel (Cmd/Ctrl + Shift + X)
3. Search for **Image Descriptor**
4. Click **Install**

### Manual Installation (Advanced)
If you want to install from a `.vsix` file:
1. Download the latest `.vsix` file
2. In VSCode/Cursor, run:
   ```bash
   code --install-extension image-descriptor-<version>.vsix
   ```

## Configuration

**Each user must provide their own OpenAI API key.**

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. In VSCode/Cursor, go to Settings (Cmd/Ctrl + ,)
3. Search for "Image Descriptor"
4. Enter your OpenAI API key in the `imageDescriptor.openaiApiKey` field
   - Or add to your `settings.json`:
     ```json
     "imageDescriptor.openaiApiKey": "your-openai-api-key-here"
     ```

## Usage

1. Open an HTML file containing an `<img>` element
2. Place your cursor inside the `alt=""` attribute (or where you want to add it)
3. Right-click to open the context menu
4. Select **Image Descriptor: Suggest alternative text**
5. The extension will:
   - Extract the image source from the `src` attribute
   - Process the image (URL or local file)
   - Generate accessible alt text using AI
   - Insert the generated text into the `alt` attribute

## How it Works

- **Absolute URLs**: Uses the URL directly
- **Relative paths**: Converts local images to base64 data URLs
- **File support**: PNG, JPEG, GIF, WebP, SVG
- **AI Integration**: Uses OpenAI's GPT-4o model (vision + text)
- **Accessibility**: Follows best practices for concise, descriptive alt text

## Troubleshooting

1. **"No img element found"**: Make sure your cursor is inside an `<img>` tag
2. **"No src attribute found"**: Ensure the image has a `src` attribute
3. **API key errors**: Verify your OpenAI API key is correctly configured and you have credits
4. **File not found**: Check that relative paths are correct relative to the HTML file
5. **Model errors**: Make sure you are using the correct model name (`gpt-4o`) and your API key has access

### Debug Mode
To enable debug logging:
1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type "Developer: Toggle Developer Tools"
3. Check the Console tab for detailed logs

## Development (for advanced users)

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Press `F5` in VSCode to launch the Extension Development Host

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this project.

## License

MIT License 