# BinSync

BinSync is a Premiere Pro extension for managing and syncing bins.

## Installation

### 1. Enable Player Debug Mode
Adobe CEP extensions that are not cryptographically signed must be enabled by setting the player debug mode. Run the following command in your terminal:

```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```
*(Note: Use `CSXS.11` for Premiere Pro 2024 and later. For older versions, you might need `CSXS.10` or lower.)*

### 2. Install the Extension
Clone this repository directly into the Adobe CEP extensions folder or create a symbolic link:

**MacOS:**
```bash
ln -s "/path/to/binsync" "$HOME/Library/Application Support/Adobe/CEP/extensions/com.example.binsync"
```

**Windows:**
```cmd
mklink /D "%APPDATA%\Adobe\CEP\extensions\com.example.binsync" "C:\path\to\binsync"
```

### 3. Restart Premiere Pro
Restart Adobe Premiere Pro. You can find the extension under **Window > Extensions > BinSync**.

## License
This project is licensed under the [GNU General Public License v3.0](LICENSE).
