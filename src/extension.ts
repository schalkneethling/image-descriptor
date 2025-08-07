import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Gets the active text editor, throwing an error if none exists.
 * This ensures commands fail fast with clear error messages rather than
 * silently failing when no editor is available.
 */
function getActiveEditor(): vscode.TextEditor {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error("No active editor found");
  }
  return editor;
}

/**
 * Retrieves the configured API key for the selected provider.
 * Throws an error if not configured to prevent silent failures during API calls.
 */
function getApiKey(): string {
  const config = vscode.workspace.getConfiguration("imageDescriptor");
  const apiKey = config.get<string>("apiKey");
  if (!apiKey) {
    throw new Error("API key not configured. Please set imageDescriptor.apiKey in the extension settings.");
  }
  return apiKey;
}

/**
 * Returns provider-specific API endpoints.
 * Centralized to ensure consistency across the extension and ease of adding new providers.
 */
function getBaseEndPoints(): Record<string, string> {
  return {
    openai: "https://api.openai.com/v1/chat/completions",
    mistral: "https://api.mistral.ai/v1/chat/completions",
  };
}

/**
 * Returns provider-specific model names.
 * Centralized to ensure consistency and ease of model updates across providers.
 */
function getModels(): Record<string, string> {
  return {
    openai: "gpt-4o-mini",
    mistral: "mistral-small-latest",
  };
}

/**
 * Retrieves the configured AI provider, throwing an error if not set.
 * This ensures the extension fails fast with clear guidance rather than
 * attempting to use an undefined provider.
 */
function getProvider(): string {
  const config = vscode.workspace.getConfiguration("imageDescriptor");
  const provider = config.get<string>("provider");
  if (!provider) {
    throw new Error(
      "Provider not configured. Please choose your preferred provider in the extension settings.",
    );
  }
  return provider;
}

/**
 * Makes API calls to AI providers with proper error handling.
 * Wraps fetch calls to provide consistent error messages and handle
 * network failures gracefully.
 */
async function getTaskResponseFromModel(body: string, endPoint: string, apiKey: string): Promise<any> {
  try {
    const response = await fetch(endPoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });
  
    if (!response.ok) {
      throw new Error(`Failed to get task response from model: ${response.statusText}`);
    }
  
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Failed in getTaskResponseFromModel: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Show a notification that the extension is active
  vscode.window.showInformationMessage("Image Descriptor extension activated!");

  let disposable = vscode.commands.registerCommand(
    "image-descriptor.suggestAltText",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      const document = editor.document;
      const position = editor.selection.active;

      try {
        // Find the img element at the current position
        const imgElement = findImgElementAtPosition(document, position);
        if (!imgElement) {
          vscode.window.showErrorMessage(
            "No img element found at current position",
          );
          return;
        }

        const provider = getProvider();

        // Extract the src attribute
        const srcAttribute = extractSrcAttribute(imgElement);
        if (!srcAttribute) {
          vscode.window.showErrorMessage(
            "No src attribute found in img element",
          );
          return;
        }

        // Show progress
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Generating alt text with ${provider}...`,
            cancellable: false,
          },
          async (progress: vscode.Progress<{ increment: number }>) => {
            progress.report({ increment: 0 });

            // Prepare image data
            const imageData = await prepareImageData(
              srcAttribute,
              document.uri,
            );
            progress.report({ increment: 50 });

            // Generate alt text using AI
            const altText = await generateAltText(imageData, provider);
            progress.report({ increment: 100 });

            // Insert the alt text
            await insertAltText(editor, imgElement, altText);
          },
        );
      } catch (error) {
        console.error("Error generating alt text:", error);
        vscode.window.showErrorMessage(
          `Failed to generate alt text: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "image-descriptor.translateAltText",
      async () => {
        const editor = getActiveEditor();
        const document = editor.document;
        const position = editor.selection.active;

        try {
          const imgElement = findImgElementAtPosition(document, position);
          if (!imgElement) {
            vscode.window.showErrorMessage(
              "No img element found at current position",
            );
            return;
          }

          const provider = getProvider();

          const altText = extractAltText(imgElement);
          if (!altText) {
            vscode.window.showErrorMessage(
              "No alt text found for the img element",
            );
            return;
          }

          const translatedAltText = await translateAltText(altText, provider);
          if (!translatedAltText) {
            vscode.window.showErrorMessage(
              "Failed to translate alt text. Please try again.",
            );
            return;
          }

          await insertAltText(editor, imgElement, translatedAltText);
        } catch (error) {
          console.error("Error translating alt text:", error);
          vscode.window.showErrorMessage(
            `Failed to translate alt text: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    ),
  );
}

/**
 * Finds img elements at the current cursor position using regex.
 * Uses regex instead of a full HTML parser for performance and simplicity,
 * but this approach may not handle complex nested structures or malformed HTML.
 */
function findImgElementAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): string | null {
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Simple regex to find img tags
  const imgRegex = /<img[^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(text)) !== null) {
    const startOffset = match.index;
    const endOffset = startOffset + match[0].length;

    if (offset >= startOffset && offset <= endOffset) {
      return match[0];
    }
  }

  return null;
}

function extractAltText(imgElement: string): string | null {
  const altTextMatch = imgElement.match(/alt\s*=\s*["']([^"']*)["']/i);
  return altTextMatch ? altTextMatch[1] : null;
}

function extractSrcAttribute(imgElement: string): string | null {
  const srcMatch = imgElement.match(/src\s*=\s*["']([^"']+)["']/i);
  return srcMatch ? srcMatch[1] : null;
}

/**
 * Prepares image data for AI processing by handling both URLs and local files.
 * Converts local images to base64 data URLs because AI providers require
 * accessible image data, and local file paths aren't accessible to external APIs.
 */
async function prepareImageData(
  src: string,
  documentUri: vscode.Uri,
): Promise<string> {
  // Check if it's an absolute URL
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // Handle relative paths
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
  if (!workspaceFolder) {
    throw new Error("No workspace folder found");
  }

  let fullPath: string;
  if (src.startsWith("/")) {
    // Absolute path from workspace root
    fullPath = path.join(workspaceFolder.uri.fsPath, src);
  } else {
    // Relative path from current document
    const documentDir = path.dirname(documentUri.fsPath);
    fullPath = path.join(documentDir, src);
  }

  // Read file and convert to base64
  const imageBuffer = fs.readFileSync(fullPath);
  const base64 = imageBuffer.toString("base64");

  // Determine MIME type based on file extension
  const ext = path.extname(fullPath).toLowerCase();
  let mimeType = "image/jpeg"; // default
  if (ext === ".png") mimeType = "image/png";
  else if (ext === ".gif") mimeType = "image/gif";
  else if (ext === ".webp") mimeType = "image/webp";
  else if (ext === ".svg") mimeType = "image/svg+xml";

  return `data:${mimeType};base64,${base64}`;
}

/**
 * Translates alt text to English while preserving cultural context and nuance.
 * Uses a specialized prompt to ensure translations maintain the original
 * intent and accessibility value rather than just literal word-for-word translation.
 */
async function translateAltText(altText: string, provider: string): Promise<string> {
  const apiKey = getApiKey();
  const baseEndPoints = getBaseEndPoints();
  const models = getModels();

  const systemPrompt = `You are an expert in accessibility and inclusive communication. When given alternative text (alt text) 
  written in a language other than English, your task is to translate it into English while preserving the original nuance, intent,
  and context as much as possible. This includes emotional tone, cultural references, and subtle implications important to how the
  image would be perceived by someone relying on the alt text. Avoid literal word-for-word translations unless they best capture the
  meaning. Prioritize clarity, brevity, and the original author's intent. If the original alt text contains idioms, metaphors, or
  cultural expressions, adapt them to equivalent expressions in English that convey the same meaning. Do not include extraneous
  explanations or annotations—return only the translated English alt text, no additional formatting or quotes.`;

  const userPrompt = `Translate the following text into English: ${altText}`;

  const postBody = JSON.stringify({
    model: models[provider],
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    max_tokens: 150,
  });

  const response = await getTaskResponseFromModel(
    postBody,
    baseEndPoints[provider],
    apiKey,
  );

  return response.choices[0].message.content.trim();
}

/**
 * Generates accessible alt text for images using AI vision models.
 * Uses a specialized prompt focused on web accessibility best practices
 * to ensure generated alt text meets WCAG guidelines and provides
 * meaningful descriptions for screen readers.
 */
async function generateAltText(
  imageData: string,
  provider: string,
): Promise<string> {
  // Using the user's chosen provider API for image analysis
  const apiKey = getApiKey();
  const baseEndPoints = getBaseEndPoints();
  const models = getModels();

  const systemPrompt = `You are an expert in web accessibility and image description. Your task is to write concise, descriptive alternative text for images that will be used in HTML alt attributes.

Guidelines for writing effective alt text:
1. Be descriptive but concise (typically 1-2 sentences)
2. Focus on the content and purpose of the image
3. Avoid phrases like "image of" or "picture of" - be direct
4. If the image is decorative, use alt=""
5. For complex images, describe the key elements and their relationships
6. Consider the context where the image appears
7. Use present tense and active voice
8. Be specific about what's important in the image

Return only the alt text content, no additional formatting or quotes.`;

  const userPrompt = `Please provide accessible alternative text for this image that would be appropriate for an HTML alt attribute.`;

  const postBody = JSON.stringify({
    model: models[provider],
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: [
      {
        type: "text",
        text: userPrompt,
      },
      {
        type: "image_url",
        image_url: {
          url: imageData,
        },
      },
    ] }],
    max_tokens: 150,
  });

  const response = await getTaskResponseFromModel(
    postBody,
    baseEndPoints[provider],
    apiKey,
  );

  return response.choices[0].message.content.trim();
}

/**
 * Inserts or updates alt text in img elements, handling both new and existing alt attributes.
 * Uses regex replacement to maintain the original HTML structure while ensuring
 * proper attribute formatting and escaping.
 */
async function insertAltText(
  editor: vscode.TextEditor,
  imgElement: string,
  altText: string,
): Promise<void> {
  const document = editor.document;
  const text = document.getText();
  const imgIndex = text.indexOf(imgElement);

  if (imgIndex === -1) {
    throw new Error("Could not locate img element in document");
  }

  // Check if alt attribute already exists
  const altRegex = /alt\s*=\s*["'][^"']*["']/i;
  const hasAlt = altRegex.test(imgElement);

  let newImgElement: string;

  if (hasAlt) {
    // Replace existing alt attribute
    newImgElement = imgElement.replace(altRegex, `alt="${altText}"`);
  } else {
    // Add alt attribute before the closing >
    newImgElement = imgElement.replace(/>$/, ` alt="${altText}">`);
  }

  // Create the edit
  const startPos = document.positionAt(imgIndex);
  const endPos = document.positionAt(imgIndex + imgElement.length);
  const range = new vscode.Range(startPos, endPos);

  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, range, newImgElement);

  await vscode.workspace.applyEdit(edit);

  vscode.window.showInformationMessage(
    "Alt text generated and inserted successfully!",
  );
}

export function deactivate() {}
