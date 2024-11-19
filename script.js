// Constants
const GRID_SIZE = 4;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Default button colors that can be customized
let BUTTON_COLORS = {
    'Green': '#4CAF50',
    'Blue': '#2196F3',
    'Purple': '#9C27B0',
    'Orange': '#FF9800',
    'Cyan': '#00BCD4',
    'Indigo': '#3F51B5',
    'Pink': '#FF4081',
    'Teal': '#009688'
};

// Load custom colors from localStorage
function loadCustomColors() {
    const savedColors = localStorage.getItem('customButtonColors');
    if (savedColors) {
        BUTTON_COLORS = JSON.parse(savedColors);
    }
}

// Save custom colors to localStorage
function saveCustomColors() {
    localStorage.setItem('customButtonColors', JSON.stringify(BUTTON_COLORS));
}

// Theme Management
const defaultTheme = {
    backgroundColor: '#ffffff',
    buttonColor: '#4CAF50',
    textColor: '#ffffff'
};

let currentTheme = { ...defaultTheme };

// Load theme from localStorage
function loadTheme() {
    const savedTheme = localStorage.getItem('soundboardTheme');
    if (savedTheme) {
        currentTheme = JSON.parse(savedTheme);
        applyTheme(currentTheme);
    }
}

// Apply theme to the UI
function applyTheme(theme) {
    document.body.style.backgroundColor = theme.backgroundColor;
    document.documentElement.style.setProperty('--primary', theme.buttonColor);
    document.documentElement.style.setProperty('--text', theme.textColor);
    
    // Update color buttons
    document.querySelectorAll('.color-select').forEach(button => {
        const type = button.dataset.colorType;
        switch(type) {
            case 'background':
                button.style.backgroundColor = theme.backgroundColor;
                break;
            case 'button':
                button.style.backgroundColor = theme.buttonColor;
                break;
            case 'text':
                button.style.backgroundColor = theme.textColor;
                break;
        }
    });

    // Save theme to localStorage
    localStorage.setItem('soundboardTheme', JSON.stringify(theme));
}

// DOM Elements
const soundboard = document.getElementById('soundboard');
const recordBtn = document.getElementById('record-btn');
const editBtn = document.getElementById('edit-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const contextMenu = document.getElementById('context-menu');
const settingsBtn = document.getElementById('settings-btn');
const settingsDropdown = document.getElementById('settings-dropdown');

// State Management
let isRecording = false;
let isEditMode = false;
let mediaRecorder = null;
let audioChunks = [];
let selectedButton = null;
let draggedButton = null;
let isSettingsOpen = false;

// Audio Recording
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const base64Data = await blobToBase64(audioBlob);
            createButton(base64Data);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        isRecording = true;
        recordBtn.textContent = 'Stop Recording';
        recordBtn.classList.add('recording');
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Unable to access microphone. Please check permissions.');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.textContent = 'Record Sound';
        recordBtn.classList.remove('recording');
    }
}

// Button Management
function createButton(audioData, shortcutKey = '', name = 'Sound', position = null, color = null) {
    const button = document.createElement('button');
    button.className = 'button';
    button.dataset.audioData = audioData;
    button.dataset.name = name;
    button.dataset.color = color || Object.values(BUTTON_COLORS)[Math.floor(Math.random() * Object.values(BUTTON_COLORS).length)];
    button.style.backgroundColor = button.dataset.color;

    updateButtonContent(button, shortcutKey);
    
    // Handle both click and drag in a single mousedown event
    button.addEventListener('mousedown', (e) => {
        if (isEditMode && e.button === 0) {
            e.preventDefault();
            draggedButton = button;
            button.classList.add('dragging');
            
            const rect = button.getBoundingClientRect();
            button.dataset.offsetX = e.clientX - rect.left;
            button.dataset.offsetY = e.clientY - rect.top;
        } else if (!isEditMode && e.button === 0) {
            playAudio(button.dataset.audioData);
        }
    });

    // Context menu
    button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!isEditMode) {
            selectedButton = button;
            showContextMenu(e.pageX, e.pageY);
        }
    });

    // Position button
    if (position) {
        button.style.left = position.left;
        button.style.top = position.top;
    } else {
        const rect = soundboard.getBoundingClientRect();
        const gridCellWidth = rect.width / GRID_SIZE;
        const gridCellHeight = rect.height / GRID_SIZE;
        
        button.style.left = Math.floor(Math.random() * (GRID_SIZE - 2)) * gridCellWidth + 'px';
        button.style.top = Math.floor(Math.random() * 2) * gridCellHeight + 'px';
    }

    soundboard.appendChild(button);
    if (shortcutKey) addKeyboardShortcut(button, shortcutKey);
    saveSession();
    return button;
}

function updateButtonContent(button, shortcutKey = '') {
    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = button.dataset.name;
    
    button.innerHTML = '';
    button.appendChild(nameSpan);
    
    if (shortcutKey) {
        const shortcutSpan = document.createElement('span');
        shortcutSpan.className = 'shortcut';
        shortcutSpan.textContent = shortcutKey;
        button.appendChild(shortcutSpan);
    }
}

// Drag and Drop
document.addEventListener('mousemove', (e) => {
    if (!draggedButton) return;
    
    e.preventDefault();
    
    const rect = soundboard.getBoundingClientRect();
    const gridCellWidth = rect.width / GRID_SIZE;
    const gridCellHeight = rect.height / GRID_SIZE;
    
    // Calculate position relative to soundboard
    let left = e.clientX - rect.left - parseFloat(draggedButton.dataset.offsetX);
    let top = e.clientY - rect.top - parseFloat(draggedButton.dataset.offsetY);
    
    // Snap to grid
    left = Math.round(left / gridCellWidth) * gridCellWidth;
    top = Math.round(top / gridCellHeight) * gridCellHeight;
    
    // Keep within bounds
    left = Math.max(0, Math.min(left, rect.width - draggedButton.offsetWidth));
    top = Math.max(0, Math.min(top, rect.height - draggedButton.offsetHeight));
    
    draggedButton.style.left = `${left}px`;
    draggedButton.style.top = `${top}px`;
});

document.addEventListener('mouseup', () => {
    if (!draggedButton) return;
    
    draggedButton.classList.remove('dragging');
    saveSession();
    draggedButton = null;
});

document.addEventListener('selectstart', (e) => {
    if (draggedButton) {
        e.preventDefault();
    }
});

// Context Menu Functions
function showContextMenu(x, y) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';

    // Ensure menu stays within viewport
    const rect = contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
        contextMenu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > viewportHeight) {
        contextMenu.style.top = (y - rect.height) + 'px';
    }
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
}

// Hide context menu when clicking outside
document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
        hideContextMenu();
    }
});

// Add event listener to prevent default context menu on soundboard
soundboard.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Context Menu
contextMenu.innerHTML = `
    <ul>
        <li data-action="rename">Rename</li>
        <li data-action="record">Record Again</li>
        <li data-action="shortcut">Set Shortcut</li>
        <li data-action="remove-shortcut">Remove Shortcut</li>
        <li data-action="color">Change Color</li>
        <li data-action="delete" style="background-color: #ffebee; color: #d32f2f;">Delete</li>
    </ul>
`;

function createColorPicker(currentColor, onColorSelect) {
    const modal = document.createElement('div');
    modal.className = 'color-picker-modal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        min-width: 300px;
    `;

    const content = document.createElement('div');
    content.innerHTML = `
        <h2 style="margin: 0 0 16px 0; color: #333; font-size: 1.2rem;">Color Palette</h2>
        <div class="predefined-colors" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            ${Object.entries(BUTTON_COLORS).map(([name, color]) => `
                <div class="color-option-container" style="display: flex; align-items: center; gap: 4px;">
                    <button class="color-option" style="
                        background-color: ${color};
                        width: 32px;
                        height: 32px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    " data-color="${color}">
                    </button>
                    <button class="edit-color-btn" style="
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 1.2rem;
                        padding: 4px;
                    " data-color-name="${name}">✏️</button>
                </div>
            `).join('')}
        </div>
        <div class="custom-color" style="margin-top: 16px;">
            <input type="color" value="${currentColor}" style="width: 100%;">
            <label style="display: block; margin-top: 8px; color: #666;">Custom Color</label>
        </div>
    `;

    modal.appendChild(content);

    // Convert RGB to Hex color
    function rgbToHex(color) {
        // If already hex, return as is
        if (color.startsWith('#')) {
            return color;
        }
        
        // Extract RGB values
        const rgb = color.match(/\d+/g);
        if (!rgb || rgb.length !== 3) {
            return color;
        }
        
        // Convert to hex
        const hex = rgb.map(x => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        });
        
        return '#' + hex.join('');
    }

    // Event Handlers
    content.querySelectorAll('.color-option').forEach(button => {
        button.addEventListener('click', () => {
            const color = rgbToHex(button.dataset.color);
            onColorSelect(color);
            document.body.removeChild(modal);
        });
    });

    // Edit button handlers
    content.querySelectorAll('.edit-color-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const colorName = button.dataset.colorName;
            const input = document.createElement('input');
            input.type = 'color';
            input.value = rgbToHex(BUTTON_COLORS[colorName]);
            
            input.addEventListener('change', (e) => {
                const newColor = e.target.value;
                BUTTON_COLORS[colorName] = newColor;
                saveCustomColors();
                
                // Update the color button
                const colorBtn = button.previousElementSibling;
                colorBtn.style.backgroundColor = newColor;
                colorBtn.dataset.color = newColor;
            });
            
            input.click();
        });
    });

    content.querySelector('input[type="color"]').addEventListener('change', (e) => {
        onColorSelect(e.target.value);
        document.body.removeChild(modal);
    });

    // Close when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    return modal;
}

contextMenu.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action || !selectedButton) return;
    
    switch (action) {
        case 'rename':
            const newName = prompt('Enter new name:', selectedButton.dataset.name);
            if (newName) {
                selectedButton.dataset.name = newName;
                updateButtonContent(selectedButton, selectedButton.querySelector('.shortcut')?.textContent);
                saveSession();
            }
            hideContextMenu();
            break;
            
        case 'record':
            if (!isRecording) {
                const buttonToUpdate = selectedButton;
                hideContextMenu();
                startRecording().then(() => {
                    mediaRecorder.onstop = async () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        const base64Data = await blobToBase64(audioBlob);
                        buttonToUpdate.dataset.audioData = base64Data;
                        saveSession();
                    };
                });
            }
            break;
            
        case 'shortcut':
            hideContextMenu();
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
                text-align: center;
            `;
            
            modal.innerHTML = `
                <p style="margin-top: 0;">Press any key for shortcut...</p>
                <p style="font-size: 0.9em; color: #666;">Press Escape to cancel</p>
                <button id="cancelShortcut" style="
                    margin-top: 15px;
                    padding: 8px 16px;
                    background: #f5f5f5;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    color: #666;
                ">Cancel</button>
            `;
            
            document.body.appendChild(modal);
            
            // Add click handler for cancel button
            const cancelButton = modal.querySelector('#cancelShortcut');
            cancelButton.addEventListener('click', () => {
                document.removeEventListener('keydown', keyHandler);
                document.body.removeChild(modal);
            });
            
            const keyHandler = (event) => {
                // Allow escape to cancel
                if (event.key === 'Escape') {
                    document.removeEventListener('keydown', keyHandler);
                    document.body.removeChild(modal);
                    return;
                }
                
                event.preventDefault();
                // Exclude some system keys
                if (['Tab', 'CapsLock', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
                    return;
                }
                
                // Remove old shortcut
                removeKeyboardShortcut(selectedButton);
                
                // Add new shortcut
                addKeyboardShortcut(selectedButton, event.key);
                updateButtonContent(selectedButton, event.key);
                saveSession();
                document.removeEventListener('keydown', keyHandler);
                document.body.removeChild(modal);
            };
            document.addEventListener('keydown', keyHandler);
            break;
            
        case 'remove-shortcut':
            hideContextMenu();
            removeKeyboardShortcut(selectedButton);
            updateButtonContent(selectedButton, '');
            saveSession();
            break;
            
        case 'color':
            hideContextMenu();
            const colorPicker = createColorPicker(selectedButton.dataset.color, (color) => {
                selectedButton.dataset.color = color;
                selectedButton.style.backgroundColor = color;
                saveSession();
            });
            document.body.appendChild(colorPicker);
            break;
            
        case 'delete':
            if (confirm('Delete this sound button?')) {
                // Remove keyboard shortcut if it exists
                removeKeyboardShortcut(selectedButton);
                selectedButton.remove();
                saveSession();
            }
            hideContextMenu();
            break;
    }
});

// Add keyboard shortcut functionality
function addKeyboardShortcut(button, key) {
    // Remove old shortcut if it exists
    if (button.keyHandler) {
        document.removeEventListener('keydown', button.keyHandler);
    }
    
    const handler = (event) => {
        if (event.key === key && !isRecording && event.target.tagName !== 'INPUT') {
            playAudio(button.dataset.audioData);
        }
    };
    
    // Store the handler function on the button element
    button.keyHandler = handler;
    document.addEventListener('keydown', handler);
}

function removeKeyboardShortcut(button) {
    if (button.keyHandler) {
        document.removeEventListener('keydown', button.keyHandler);
        button.keyHandler = null;
    }
}

// Settings Management
settingsBtn.addEventListener('click', () => {
    isSettingsOpen = !isSettingsOpen;
    settingsDropdown.style.display = isSettingsOpen ? 'block' : 'none';
});

// Close settings when clicking outside
document.addEventListener('click', (e) => {
    if (!settingsBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
        isSettingsOpen = false;
        settingsDropdown.style.display = 'none';
    }
});

// Color Selection
document.querySelectorAll('.color-select').forEach(button => {
    button.addEventListener('click', () => {
        const type = button.dataset.colorType;
        const currentColor = button.style.backgroundColor || defaultTheme[`${type}Color`];
        
        const colorPicker = createColorPicker(currentColor, (color) => {
            currentTheme[`${type}Color`] = color;
            applyTheme(currentTheme);
        });
        
        document.body.appendChild(colorPicker);
    });
});

// Theme Import/Export
document.getElementById('export-theme-btn').addEventListener('click', () => {
    const themeString = JSON.stringify(currentTheme);
    const blob = new Blob([themeString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soundboard-theme.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('import-theme-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const theme = JSON.parse(event.target.result);
                currentTheme = theme;
                applyTheme(theme);
            } catch (error) {
                alert('Invalid theme file');
            }
        };
        
        reader.readAsText(file);
    });
    
    input.click();
});

// Session Management
function saveSession() {
    const buttons = Array.from(soundboard.getElementsByClassName('button')).map(button => ({
        name: button.dataset.name,
        shortcut: button.querySelector('.shortcut')?.textContent || '',
        position: {
            left: button.style.left,
            top: button.style.top
        },
        audio: button.dataset.audioData,
        color: button.dataset.color
    }));
    
    localStorage.setItem('soundboardSession', JSON.stringify({ buttons }));
}

function loadSession() {
    const session = JSON.parse(localStorage.getItem('soundboardSession'));
    if (!session) return;
    
    const buttons = soundboard.getElementsByClassName('button');
    while (buttons.length > 0) {
        buttons[0].remove();
    }
    
    session.buttons.forEach(buttonData => {
        createButton(
            buttonData.audio,
            buttonData.shortcut,
            buttonData.name,
            buttonData.position,
            buttonData.color
        );
    });
}

// Utility Functions
async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function base64ToBlob(base64Data) {
    const response = await fetch(base64Data);
    return response.blob();
}

async function playAudio(base64Data) {
    try {
        const audioBlob = await base64ToBlob(base64Data);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
    } catch (err) {
        console.error('Error playing audio:', err);
    }
}

// Event Listeners
recordBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

editBtn.addEventListener('click', () => {
    isEditMode = !isEditMode;
    soundboard.classList.toggle('edit-mode');
    editBtn.textContent = isEditMode ? 'Save Layout' : 'Edit Mode';
});

exportBtn.addEventListener('click', () => {
    const session = localStorage.getItem('soundboardSession');
    const blob = new Blob([session], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'soundboard-session.soundboard';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.soundboard';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            localStorage.setItem('soundboardSession', event.target.result);
            loadSession();
        };
        
        reader.readAsText(file);
    };
    
    input.click();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSession();
    loadTheme();
    loadCustomColors();
});

setInterval(saveSession, AUTO_SAVE_INTERVAL);
