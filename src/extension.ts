import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

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

        const config = vscode.workspace.getConfiguration("imageDescriptor");
        const provider = config.get<string>("provider");

        if (!provider) {
          throw new Error(
            "Provider not configured. Please choose your preferred provider in the extension settings.",
          );
        }

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
}

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

function extractSrcAttribute(imgElement: string): string | null {
  const srcMatch = imgElement.match(/src\s*=\s*["']([^"']+)["']/i);
  return srcMatch ? srcMatch[1] : null;
}

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

async function generateAltText(
  imageData: string,
  provider: string,
): Promise<string> {
  // Using the user's chosen provider API for image analysis
  const config = vscode.workspace.getConfiguration("imageDescriptor");
  const apiKey = config.get<string>("apiKey");
  const baseEndPoints: Record<string, string> = {
    openai: "https://api.openai.com/v1/chat/completions",
    mistral: "https://api.mistral.ai/v1/chat/completions",
  };
  const models: Record<string, string> = {
    openai: "gpt-4o-mini",
    mistral: "mistral-small-latest",
  };

  if (!apiKey) {
    throw new Error(
      "API key not configured. Please set imageDescriptor.providerApiKey in the extension settings.",
    );
  }

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

  try {
    const response = await fetch(baseEndPoints[provider], {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: models[provider],
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please provide accessible alternative text for this image that would be appropriate for an HTML alt attribute.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData,
                },
              },
            ],
          },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `${provider} API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    const altText = data.choices[0].message.content.trim();
    return altText;
  } catch (error) {
    console.error(`${provider} API error:`, error);
    throw new Error(
      `Failed to generate alt text: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

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
