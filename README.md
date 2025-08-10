# Image Descriptor

A VSCode and friends extension that suggests accessible alternative text for images using AI or translates existing alt text to English.

## Features

- **AI-Powered Alternative Text Suggestion**: Suggest accessible alternative text for images using AI vision models
- **Alternative Text Translation**: Write alt text in your native language, then translate it to English without leaving your IDE; preserves cultural context and nuance as much as possible.
- **Multi-Provider Support**: Choose between OpenAI (GPT-4o-mini) and Mistral AI (mistral-small-latest)
- **Right-click context menu integration** for HTML files
- **Supports both absolute URLs and relative file paths**
- **Automatically converts local images to base64** for AI processing
- **Follows web accessibility best practices** for alt text suggestion

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

**Each user must provide their own API key for their chosen provider.**

1. Get an API key from your chosen provider (OpenAI or Mistral AI)
2. In VSCode/Cursor, open the extension page
3. Click on the settings (gear) icon to open the extension settings
4. Choose your preferred provider from the dropdown:
   - **OpenAI**: Uses GPT-4o-mini model
   - **Mistral AI**: Uses mistral-small-latest model
5. Enter your chosen provider API key in the `imageDescriptor.apiKey` field
   - Or add to your `settings.json`:
     ```json
     {
       "imageDescriptor.provider": "openai",
       "imageDescriptor.apiKey": "your-api-key-here"
     }
     ```

> Note: You can also search for `@ext:schalkneethling.image-descriptor` in VSCode's settings. Also, PLEASE be very careful not to accidentally leak your API key. Ensure that none of the configuration end up in your `.vscode` setting files as it then may get checked into source control.

## Usage

### Suggesting Alternative Text

1. Open an HTML file containing an `<img>` element
2. Place your cursor inside the `alt=""` attribute
3. Right-click to open the context menu
4. Select **Image Descriptor: Suggest alternative text**
5. The extension will:
   - Extract the image source from the `src` attribute
   - Process the image (URL or local file)
   - Suggest accessible alternative text using AI
   - Insert the suggested text into the `alt` attribute
   - Edit as needed

### Translating Alternative Text to English

This feature is designed for those who would feel more comfortable describing alternative text in their native/first language. If this is you, first write the alt text in your preferred language, then translate it to English.

1. Open an HTML file containing an `<img>` element
2. Write your alternative text inside the `alt=""` attribute
3. Right-click to open the context menu
4. Select **Image Descriptor: Translate to English**
5. The extension will:
   - Extract the existing alt text
   - Translate it to English while preserving cultural context and nuance (as much as possible)
   - Replace the original alt text with the English translation

## How it Works

- **Absolute URLs**: Uses the URL directly
- **Relative paths**: Converts local images to base64 data URLs
- **File support**: PNG, JPEG, GIF, WebP, SVG
- **AI Integration**: Uses vision models for image analysis and language models for translation
- **Accessibility**: Follows WCAG guidelines for concise, descriptive alternative text
- **Translation**: Preserves cultural context, idioms, and nuances during translation

## Troubleshooting

1. **"No img element found"**: Make sure your cursor is inside an `<img>` tag
2. **"No src attribute found"**: Ensure the image has a `src` attribute
3. **"No alt text found"**: Make sure the img element has existing alt text for translation
4. **API key errors**: Verify your API key is correctly configured and you have credits
5. **Provider errors**: Ensure you've selected a valid provider in settings
6. **File not found**: Check that relative paths are correct relative to the HTML file
7. **Model errors**: Make sure your API key has access to the selected model

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
