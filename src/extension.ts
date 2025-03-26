import * as vscode from "vscode";
import axios from "axios";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "googleFontInstaller.installFont",
    async () => {
      // Prompt user for font name
      const fontName = await vscode.window.showInputBox({
        prompt: "Enter the Google Font name to install",
        placeHolder: "e.g., Roboto, Open Sans",
      });

      if (!fontName) {
        vscode.window.showErrorMessage("No font name provided");
        return;
      }

      try {
        // Show progress notification
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Installing ${fontName} Font`,
            cancellable: false,
          },
          async (progress) => {
            progress.report({ increment: 10, message: "Fetching font..." });

            // Fetch font from Google Fonts API
            const fontUrl = await fetchGoogleFont(fontName);

            progress.report({ increment: 40, message: "Downloading font..." });

            // Download and install the font
            const fontFilename = await installFont(fontName, fontUrl);

            progress.report({
              increment: 30,
              message: "Updating VS Code settings...",
            });

            // Update VS Code settings with the new font
            await updateVSCodeSettings(fontName, fontFilename);

            progress.report({
              increment: 20,
              message: "Font installed successfully!",
            });
          }
        );

        vscode.window.showInformationMessage(
          `Font ${fontName} installed successfully in system and VS Code!`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to install font: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

async function fetchGoogleFont(fontName: string): Promise<string> {
  const apiUrl = `https://fonts.googleapis.com/css?family=${encodeURIComponent(
    fontName
  )}`;

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    // Extract font URL from CSS
    const fontUrlMatch = response.data.match(/url\((.+?)\)/);
    if (!fontUrlMatch) {
      throw new Error("Font URL not found");
    }

    return fontUrlMatch[1].replace(/['"]/g, "");
  } catch (error) {
    throw new Error(
      `Failed to fetch font: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function installFont(fontName: string, fontUrl: string): Promise<string> {
  // Determine font installation directory based on OS
  let fontDir: string;
  switch (os.platform()) {
    case "win32":
      fontDir = path.join(process.env.WINDIR || "C:\\Windows", "Fonts");
      break;
    case "darwin":
      fontDir = path.join(os.homedir(), "Library", "Fonts");
      break;
    case "linux":
      fontDir = path.join(os.homedir(), ".fonts");
      break;
    default:
      throw new Error("Unsupported operating system");
  }

  // Create font filename
  const fontFilename = `${fontName.replace(/\s+/g, "")}.ttf`;
  const fontPath = path.join(fontDir, fontFilename);

  // Download font
  const response = await axios({
    method: "get",
    url: fontUrl,
    responseType: "arraybuffer",
  });

  // Ensure font directory exists
  await fs.ensureDir(fontDir);

  // Write font file
  await fs.writeFile(fontPath, response.data);

  return fontFilename;
}

async function updateVSCodeSettings(fontName: string, fontFilename: string) {
  const config = vscode.workspace.getConfiguration();

  // Only wrap font names with spaces in quotes
  const vsCodeFontName = fontName.includes(" ") ? `"${fontName}"` : fontName;

  try {
    await config.update(
      "editor.fontFamily",
      `${vsCodeFontName}, ${config.get(
        "editor.fontFamily",
        "Consolas, 'Courier New', monospace"
      )}`,
      vscode.ConfigurationTarget.Global
    );

    await config.update(
      "terminal.integrated.fontFamily",
      `${vsCodeFontName}, ${config.get(
        "terminal.integrated.fontFamily",
        "monospace"
      )}`,
      vscode.ConfigurationTarget.Global
    );
  } catch (error) {
    throw new Error(
      `Failed to update VS Code settings: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
