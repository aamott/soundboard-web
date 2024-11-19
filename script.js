// Constants
const GRID_SIZE = 16;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const BUTTON_COLORS = {
    'Green': '#4CAF50',
    'Blue': '#2196F3',
    'Purple': '#9C27B0',
    'Orange': '#FF9800',
    'Cyan': '#00BCD4',
    'Indigo': '#3F51B5',
    'Pink': '#FF4081',
    'Teal': '#009688'
};

// DOM Elements
const soundboard = document.getElementById('soundboard');
const recordBtn = document.getElementById('record-btn');
const editBtn = document.getElementById('edit-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const contextMenu = document.getElementById('context-menu');

// State Management
let isRecording = false;
let isEditMode = false;
let mediaRecorder = null;
let audioChunks = [];
let selectedButton = null;
let draggedButton = null;

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
        button.style.top = Math.floor(Math.random() * (GRID_SIZE - 2)) * gridCellHeight + 'px';
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
        <li data-action="color">Change Color</li>
        <li data-action="delete" style="background-color: #ffebee; color: #d32f2f;">Delete</li>
    </ul>
`;

function createColorPicker() {
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

    const title = document.createElement('h3');
    title.textContent = 'Choose Color';
    title.style.marginTop = '0';
    modal.appendChild(title);

    // Default colors
    const colorGrid = document.createElement('div');
    colorGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 15px;
    `;

    Object.entries(BUTTON_COLORS).forEach(([name, color]) => {
        const colorButton = document.createElement('button');
        colorButton.style.cssText = `
            width: 50px;
            height: 50px;
            border-radius: 8px;
            border: 2px solid ${color};
            background-color: ${color};
            cursor: pointer;
            transition: transform 0.2s;
        `;
        colorButton.title = name;
        
        colorButton.addEventListener('click', () => {
            selectedButton.dataset.color = color;
            selectedButton.style.backgroundColor = color;
            saveSession();
            document.body.removeChild(modal);
        });

        colorButton.addEventListener('mouseover', () => {
            colorButton.style.transform = 'scale(1.1)';
        });

        colorButton.addEventListener('mouseout', () => {
            colorButton.style.transform = 'scale(1)';
        });

        colorGrid.appendChild(colorButton);
    });

    modal.appendChild(colorGrid);

    // Custom color picker
    const customColorContainer = document.createElement('div');
    customColorContainer.style.cssText = `
        border-top: 1px solid #eee;
        padding-top: 15px;
        text-align: center;
    `;

    const customColorInput = document.createElement('input');
    customColorInput.type = 'color';
    customColorInput.style.cssText = `
        width: 100px;
        height: 40px;
        padding: 0;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;

    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply Custom Color';
    applyButton.style.cssText = `
        margin-left: 10px;
        padding: 8px 16px;
        background: #007BFF;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `;

    applyButton.addEventListener('click', () => {
        selectedButton.dataset.color = customColorInput.value;
        selectedButton.style.backgroundColor = customColorInput.value;
        saveSession();
        document.body.removeChild(modal);
    });

    customColorContainer.appendChild(customColorInput);
    customColorContainer.appendChild(applyButton);
    modal.appendChild(customColorContainer);

    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
    `;
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    modal.appendChild(closeButton);

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
            modal.innerHTML = '<p>Press any key for shortcut...</p>';
            document.body.appendChild(modal);
            
            const keyHandler = (event) => {
                event.preventDefault();
                // Exclude some system keys
                if (['Escape', 'Tab', 'CapsLock', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
                    return;
                }
                
                // Remove old shortcut if it exists
                const oldShortcut = selectedButton.querySelector('.shortcut')?.textContent;
                if (oldShortcut) {
                    removeKeyboardShortcut(selectedButton, oldShortcut);
                }
                
                addKeyboardShortcut(selectedButton, event.key);
                updateButtonContent(selectedButton, event.key);
                saveSession();
                document.removeEventListener('keydown', keyHandler);
                document.body.removeChild(modal);
            };
            document.addEventListener('keydown', keyHandler);
            break;
            
        case 'color':
            hideContextMenu();
            const colorPicker = createColorPicker();
            document.body.appendChild(colorPicker);
            break;
            
        case 'delete':
            if (confirm('Delete this sound button?')) {
                // Remove keyboard shortcut if it exists
                const shortcut = selectedButton.querySelector('.shortcut')?.textContent;
                if (shortcut) {
                    removeKeyboardShortcut(selectedButton, shortcut);
                }
                selectedButton.remove();
                saveSession();
            }
            hideContextMenu();
            break;
    }
});

// Add keyboard shortcut functionality
function addKeyboardShortcut(button, key) {
    const handler = (event) => {
        if (event.key === key && !isRecording && event.target.tagName !== 'INPUT') {
            playAudio(button.dataset.audioData);
        }
    };
    button.dataset.shortcutHandler = handler;
    document.addEventListener('keydown', handler);
}

function removeKeyboardShortcut(button, key) {
    const handler = button.dataset.shortcutHandler;
    if (handler) {
        document.removeEventListener('keydown', handler);
        delete button.dataset.shortcutHandler;
    }
}

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
loadSession();
setInterval(saveSession, AUTO_SAVE_INTERVAL);
