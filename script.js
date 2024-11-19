// Constants
const GRID_SIZE = 16;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const VALID_SHORTCUTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// DOM Elements
const soundboard = document.getElementById('soundboard');
const recordBtn = document.getElementById('record-btn');
const editBtn = document.getElementById('edit-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const contextMenu = document.querySelector('.context-menu');

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
function createButton(audioData, shortcutKey = '', name = 'Sound', position = null) {
    const button = document.createElement('button');
    button.className = 'button';
    button.dataset.audioData = audioData;
    button.dataset.name = name;

    updateButtonContent(button, shortcutKey);
    
    // Handle both click and drag in a single mousedown event
    button.addEventListener('mousedown', (e) => {
        if (isEditMode && e.button === 0) {
            e.preventDefault(); // Prevent text selection
            draggedButton = button;
            button.classList.add('dragging');
            
            // Calculate offset
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
        if (isEditMode) return;
        
        selectedButton = button;
        showContextMenu(e.pageX, e.pageY);
    });

    // Position button
    if (position) {
        // Use saved position
        button.style.left = position.left;
        button.style.top = position.top;
    } else {
        // Generate random position for new buttons
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

// Context Menu
function showContextMenu(x, y) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
    selectedButton = null;
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
        audio: button.dataset.audioData
    }));
    
    localStorage.setItem('soundboardSession', JSON.stringify({ buttons }));
}

function loadSession() {
    const session = JSON.parse(localStorage.getItem('soundboardSession'));
    if (!session) return;
    
    // Clear existing buttons
    const buttons = soundboard.getElementsByClassName('button');
    while (buttons.length > 0) {
        buttons[0].remove();
    }
    
    // Create new buttons
    session.buttons.forEach(buttonData => {
        createButton(
            buttonData.audio,
            buttonData.shortcut,
            buttonData.name,
            buttonData.position
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
                const buttonToUpdate = selectedButton; // Store reference to the button
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
            const key = prompt('Enter number (1-9) for keyboard shortcut:');
            if (key && VALID_SHORTCUTS.includes(key)) {
                addKeyboardShortcut(selectedButton, key);
                updateButtonContent(selectedButton, key);
                saveSession();
            }
            hideContextMenu();
            break;
            
        case 'delete':
            if (confirm('Delete this sound button?')) {
                selectedButton.remove();
                saveSession();
            }
            hideContextMenu();
            break;
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
        hideContextMenu();
    }
});

// Add keyboard shortcut functionality
function addKeyboardShortcut(button, key) {
    document.addEventListener('keydown', (event) => {
        if (event.key === key && !isRecording && event.target.tagName !== 'INPUT') {
            playAudio(button.dataset.audioData);
        }
    });
}

// Initialize
loadSession();
setInterval(saveSession, AUTO_SAVE_INTERVAL);
