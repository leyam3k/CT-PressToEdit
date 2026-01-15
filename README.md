# CT-PressToEdit

A SillyTavern/CozyTavern extension that provides an easy and accessible way to edit messages by long-pressing (desktop) or double-tapping (mobile).

## Features

- **Desktop**: Long-press on any message text to enter edit mode
- **Mobile**: Double-tap on any message text to enter edit mode (preserves long-press for text selection)
- **Configurable timing**: Adjust long-press duration or double-tap speed to your preference
- **Smart detection**: Automatically detects device type and applies appropriate interaction method
- **Non-intrusive**: Cancels edit trigger if you start scrolling, dragging, or selecting text

## Installation

### Using SillyTavern's Extension Installer

1. Open SillyTavern
2. Go to **Extensions** panel
3. Click **Install Extension**
4. Enter the repository URL: `https://github.com/leyam3k/CT-PressToEdit`
5. Click **Save**

### Manual Installation

1. Navigate to your SillyTavern installation folder
2. Go to `public/scripts/extensions/third-party/`
3. Clone or download this repository into that folder
4. Restart SillyTavern

## Usage

Once installed, the extension works automatically:

- **On Desktop (mouse/trackpad)**: Press and hold on a message's text for the configured duration (default: 300ms) to enter edit mode
- **On Mobile (touch)**: Double-tap on a message's text to enter edit mode

### Settings

Find the settings panel under **Extensions** → **CT-PressToEdit**:

- **Enable quick message editing**: Toggle the extension on/off
- **Press duration** (Desktop): How long to hold before triggering edit (200-1500ms)
- **Double-tap speed** (Mobile): Maximum time between taps (150-500ms)

## Prerequisites

- SillyTavern version 1.12.0 or higher

## License

AGPL-3.0
