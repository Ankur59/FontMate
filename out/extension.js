"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
function activate(context) {
    let disposable = vscode.commands.registerCommand("googleFontInstaller.installFont", async () => {
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
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Installing ${fontName} Font`,
                cancellable: false,
            }, async (progress) => {
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
            });
            vscode.window.showInformationMessage(`Font ${fontName} installed successfully in system and VS Code!`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to install font: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    });
    context.subscriptions.push(disposable);
}
async function fetchGoogleFont(fontName) {
    const apiUrl = `https://fonts.googleapis.com/css?family=${encodeURIComponent(fontName)}`;
    try {
        const response = await axios_1.default.get(apiUrl, {
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
    }
    catch (error) {
        throw new Error(`Failed to fetch font: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
async function installFont(fontName, fontUrl) {
    // Determine font installation directory based on OS
    let fontDir;
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
    const response = await (0, axios_1.default)({
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
async function updateVSCodeSettings(fontName, fontFilename) {
    const config = vscode.workspace.getConfiguration();
    // Only wrap font names with spaces in quotes
    const vsCodeFontName = fontName.includes(" ") ? `"${fontName}"` : fontName;
    try {
        await config.update("editor.fontFamily", `${vsCodeFontName}, ${config.get("editor.fontFamily", "Consolas, 'Courier New', monospace")}`, vscode.ConfigurationTarget.Global);
        await config.update("terminal.integrated.fontFamily", `${vsCodeFontName}, ${config.get("terminal.integrated.fontFamily", "monospace")}`, vscode.ConfigurationTarget.Global);
    }
    catch (error) {
        throw new Error(`Failed to update VS Code settings: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
//# sourceMappingURL=extension.js.map