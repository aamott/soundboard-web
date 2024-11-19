# Interactive Web Soundboard

A modern, browser-based soundboard application that allows users to record, organize, and play custom sound clips with keyboard shortcuts. Built with vanilla JavaScript and modern Web APIs, this application provides a seamless experience for creating and managing your personal soundboard.

## Features

### Audio Recording & Playback
- Record custom sound clips directly through your browser
- High-quality audio recording using Web Audio API
- Instant playback of recorded sounds
- Base64 encoding for efficient audio storage
- Automatic cleanup of audio resources

### Interactive Button Management
- Dynamic sound button creation
- Drag-and-drop button positioning
- 16x16 grid layout system
- Grid snapping for precise alignment
- Custom button naming
- Keyboard shortcuts (1-9) for quick access
- Right-click context menu with options:
  - Rename button
  - Re-record sound
  - Assign keyboard shortcut
  - Delete button

### Session Management
- Automatic saving every 30 seconds
- Local storage persistence
- Export session functionality
  - Save your entire soundboard setup
  - Includes all sounds, positions, and settings
- Import session capability
  - Restore previous configurations
  - Share soundboards with others

### Modern User Interface
- Clean, minimalist design
- Responsive layout for all screen sizes
- Visual feedback for interactions
- Edit mode with grid overlay
- Smooth animations and transitions
- Mobile-friendly controls
- Professional color scheme

### Technical Features
- No external dependencies
- Vanilla JavaScript implementation
- Modern browser APIs:
  - Web Audio API
  - MediaRecorder
  - LocalStorage
  - File API
- Efficient event handling
- Responsive drag and drop
- Error handling and recovery

## Browser Requirements
- Modern web browser with support for:
  - Web Audio API
  - MediaRecorder API
  - LocalStorage
  - File API
- Microphone access (for recording)

## Getting Started

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Allow microphone access when prompted
4. Click "Record Sound" to create your first sound button
5. Use "Edit Mode" to arrange your buttons
6. Assign keyboard shortcuts for quick access

## Usage Guide

### Recording Sounds
1. Click the "Record Sound" button
2. Speak or play your sound
3. Click "Stop Recording"
4. Your sound is now available as a button

### Managing Buttons
1. Click buttons to play sounds
2. Enter "Edit Mode" to drag buttons
3. Right-click buttons for more options:
   - Rename: Give your sound a custom name
   - Record Again: Replace the existing sound
   - Set Shortcut: Assign a number key (1-9)
   - Delete: Remove the button

### Saving & Loading
- Sessions auto-save every 30 seconds
- Click "Export Session" to save your setup
- Use "Import Session" to restore or share

## Security & Privacy
- All audio processing happens locally
- No server-side storage
- Microphone access required only during recording
- Data stored in browser's LocalStorage
- Session files are portable and self-contained

## Technical Implementation
- Auto-save Interval: 30 seconds
- Audio Format: WAV (base64 encoded)
- Storage: LocalStorage + File System

## Future Enhancements

### Upcoming Features
- [ ] Assign per-button colors (random color on create)
- [ ] Delete button highlighted red
- [ ] Keyboard shortcuts: listen for key presses when assigning shortcuts

### Looking Ahead
- [ ] Custom themes
- [ ] Multiple soundboard support
- [ ] Per-button Volume controls
- [ ] Audio visualization

## Contributing
Feel free to submit issues and enhancement requests!
