// Google Sheets API configuration
const API_KEY = 'AIzaSyDUHlJD57gRFnV0-HdMhGGBsNEyLhwUJUA'; // You'll replace this with your actual API key
const SHEET_ID = '1OiEgX6igFaUvieh3sR3tn2TjjfOhzeeYdTAX_H4McrU'; // Replace with your Google Sheet ID
const RANGE = 'A:D'; // The range we'll use in our sheet

// Game state variables
let gameId = '';
let calledNumbers = [];
let bingoVerification = null;

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const gameScreen = document.getElementById('gameScreen');
const bingoScreen = document.getElementById('bingoScreen');

const newGameBtn = document.getElementById('newGameBtn');
const gameIdInput = document.getElementById('gameIdInput');
const continueGameBtn = document.getElementById('continueGameBtn');
const currentGameId = document.getElementById('currentGameId');
const copyGameIdBtn = document.getElementById('copyGameId');
const numberCount = document.getElementById('numberCount');
const calledNumbersDisplay = document.getElementById('calledNumbersDisplay');
const callNumberBtn = document.getElementById('callNumberBtn');
const bingoBtn = document.getElementById('bingoBtn');
const restartBtn = document.getElementById('restartBtn');
const messageBox = document.getElementById('messageBox');
const winningNumbersInput = document.getElementById('winningNumbers');
const verifyBingoBtn = document.getElementById('verifyBingoBtn');
const backToGameBtn = document.getElementById('backToGameBtn');
const bingoResult = document.getElementById('bingoResult');

// Initialize Google Sheets API
function initGoogleSheetsApi() {
    gapi.load('client', () => {
        gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        }).then(() => {
            console.log('Google Sheets API initialized');
        }).catch(error => {
            console.error('Error initializing Google Sheets API:', error);
            showMessage('Error connecting to database. Using local storage instead.', 'error');
        });
    });
}

// Generate a random game ID
function generateGameId() {
    const adjectives = ['happy', 'lucky', 'silly', 'fancy', 'wild', 'brave', 'calm', 'eager', 'foxy', 'gold'];
    const nouns = ['panda', 'tiger', 'eagle', 'rabbit', 'wolf', 'turtle', 'dolphin', 'falcon', 'bear', 'lion'];
    const randomNum = Math.floor(Math.random() * 10000);
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj}${noun}${randomNum}`;
}

// Switch between game screens
function showScreen(screen) {
    welcomeScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    bingoScreen.classList.add('hidden');
    
    screen.classList.remove('hidden');
}

// Show message in the message box
function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.classList.remove('hidden');
    
    // Clear message after 5 seconds
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 5000);
}

// Update called numbers display
function updateCalledNumbersDisplay() {
    calledNumbersDisplay.innerHTML = '';
    numberCount.textContent = calledNumbers.length;
    
    if (calledNumbers.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No numbers called yet';
        emptyMessage.style.fontStyle = 'italic';
        emptyMessage.style.color = '#757575';
        calledNumbersDisplay.appendChild(emptyMessage);
        return;
    }
    
    calledNumbers.forEach(number => {
        const numberBadge = document.createElement('span');
        numberBadge.classList.add('number-badge');
        numberBadge.textContent = number;
        calledNumbersDisplay.appendChild(numberBadge);
    });
}

// Call a new bingo number
function callNumber() {
    // Get all possible numbers grouped by column
    const columns = {
        'B': Array.from({length: 15}, (_, i) => i + 1),
        'I': Array.from({length: 15}, (_, i) => i + 16),
        'N': Array.from({length: 15}, (_, i) => i + 31),
        'G': Array.from({length: 15}, (_, i) => i + 46),
        'O': Array.from({length: 15}, (_, i) => i + 61)
    };
    
    // Filter out already called numbers
    const remainingNumbers = {};
    Object.keys(columns).forEach(letter => {
        remainingNumbers[letter] = columns[letter].filter(num => {
            const formattedNumber = `${letter}-${num}`;
            return !calledNumbers.includes(formattedNumber);
        });
    });
    
    // Check if there are remaining numbers to call
    const remainingLetters = Object.keys(remainingNumbers).filter(letter => remainingNumbers[letter].length > 0);
    
    if (remainingLetters.length === 0) {
        showMessage("All numbers have been called! The game is complete.");
        return;
    }
    
    // Select a random letter and then a random number from that letter
    const randomLetter = remainingLetters[Math.floor(Math.random() * remainingLetters.length)];
    const randomNumberIndex = Math.floor(Math.random() * remainingNumbers[randomLetter].length);
    const randomNumber = remainingNumbers[randomLetter][randomNumberIndex];
    
    const newCalledNumber = `${randomLetter}-${randomNumber}`;
    calledNumbers.push(newCalledNumber);
    
    updateCalledNumbersDisplay();
    showMessage(`Called: ${newCalledNumber}`);
    
    // Save game state
    saveGameState();
}

// Save game state to Google Sheets
function saveGameState() {
    // Format called numbers as a comma-separated string
    const calledNumbersStr = calledNumbers.join(',');
    const now = new Date().toISOString();
    
    // For this demo, we'll also save to localStorage as a fallback
    localStorage.setItem(`bingo_${gameId}`, calledNumbersStr);
    
    // Check if Google API is available
    if (typeof gapi !== 'undefined' && gapi.client) {
        // First check if the game already exists in the sheet
        gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: RANGE,
        }).then(response => {
            const rows = response.result.values || [];
            const gameIndex = rows.findIndex(row => row[0] === gameId);
            
            if (gameIndex > 0) {
                // Update existing row
                gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: SHEET_ID,
                    range: `A${gameIndex + 1}:D${gameIndex + 1}`,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [[gameId, calledNumbersStr, rows[gameIndex][2], now]]
                    }
                }).then(() => {
                    console.log('Game updated in Google Sheets');
                }).catch(error => {
                    console.error('Error updating game:', error);
                });
            } else {
                // Append new row
                gapi.client.sheets.spreadsheets.values.append({
                    spreadsheetId: SHEET_ID,
                    range: RANGE,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [[gameId, calledNumbersStr, now, now]]
                    }
                }).then(() => {
                    console.log('Game saved to Google Sheets');
                }).catch(error => {
                    console.error('Error saving game:', error);
                });
            }
        }).catch(error => {
            console.error('Error fetching sheet data:', error);
        });
    }
}

// Load game state from Google Sheets or localStorage
function loadGameState(id) {
    // Try localStorage first as fallback
    const localData = localStorage.getItem(`bingo_${id}`);
    
    if (typeof gapi !== 'undefined' && gapi.client) {
        gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: RANGE,
        }).then(response => {
            const rows = response.result.values || [];
            const gameRow = rows.find(row => row[0] === id);
            
            if (gameRow) {
                gameId = id;
                calledNumbers = gameRow[1].split(',').filter(n => n); // Filter out empty strings
                
                currentGameId.textContent = gameId;
                updateCalledNumbersDisplay();
                showScreen(gameScreen);
                showMessage(`Welcome back to game ${gameId}! ${calledNumbers.length} numbers have been called.`);
            } else if (localData) {
                // Fall back to local storage
                gameId = id;
                calledNumbers = localData.split(',').filter(n => n);
                
                currentGameId.textContent = gameId;
                updateCalledNumbersDisplay();
                showScreen(gameScreen);
                showMessage(`Game loaded from local storage. ${calledNumbers.length} numbers have been called.`);
            } else {
                showMessage(`Game ID ${id} not found. Check if the ID is correct.`, 'error');
            }
        }).catch(error => {
            console.error('Error loading game:', error);
            
            // Fall back to local storage
            if (localData) {
                gameId = id;
                calledNumbers = localData.split(',').filter(n => n);
                
                currentGameId.textContent = gameId;
                updateCalledNumbersDisplay();
                showScreen(gameScreen);
                showMessage(`Game loaded from local storage. ${calledNumbers.length} numbers have been called.`);
            } else {
                showMessage(`Could not load game. Check your connection or game ID.`, 'error');
            }
        });
    } else if (localData) {
        // Google API not available, use localStorage
        gameId = id;
        calledNumbers = localData.split(',').filter(n => n);
        
        currentGameId.textContent = gameId;
        updateCalledNumbersDisplay();
        showScreen(gameScreen);
        showMessage(`Game loaded from local storage. ${calledNumbers.length} numbers have been called.`);
    } else {
        showMessage(`Game ID ${id} not found.`, 'error');
    }
}

// Start a new game
function startNewGame() {
    gameId = generateGameId();
    calledNumbers = [];
    
    currentGameId.textContent = gameId;
    updateCalledNumbersDisplay();
    showScreen(gameScreen);
    showMessage(`Welcome to a new Bingo game! Your Game ID is: ${gameId}`);
    
    // Save initial game state
    saveGameState();
}

// Verify a bingo claim
function verifyBingo() {
    const winningNumbersText = winningNumbersInput.value.trim();
    
    if (!winningNumbersText) {
        showMessage("Please enter your winning numbers.", 'error');
        return;
    }
    
    const claimedNumbers = winningNumbersText.split(',').map(n => n.trim());
    
    // Check if all claimed numbers are in the called numbers
    const allNumbersCalled = claimedNumbers.every(num => calledNumbers.includes(num));
    const hasValidFormat = claimedNumbers.every(num => {
        const parts = num.split('-');
        return parts.length === 2 && ['B', 'I', 'N', 'G', 'O'].includes(parts[0]);
    });
    
    bingoResult.innerHTML = '';
    if (!hasValidFormat) {
        const message = document.createElement('div');
        message.textContent = "Please enter numbers in the correct format (e.g., B-4, I-17, N-33).";
        bingoResult.appendChild(message);
        bingoResult.classList.remove('success');
        bingoResult.classList.add('error');
    } else if (allNumbersCalled) {
        const message = document.createElement('div');
        message.textContent = "Congratulations! Your Bingo is valid! 🎉";
        bingoResult.appendChild(message);
        bingoResult.classList.remove('error');
        bingoResult.classList.add('success');
    } else {
        const message = document.createElement('div');
        message.textContent = "Sorry, your Bingo is not valid. Some numbers haven't been called yet.";
        bingoResult.appendChild(message);
        bingoResult.classList.remove('success');
        bingoResult.classList.add('error');
    }
    
    bingoResult.classList.remove('hidden');
}

// Copy Game ID to clipboard
function copyGameIdToClipboard() {
    navigator.clipboard.writeText(gameId).then(() => {
        showMessage("Game ID copied to clipboard!");
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showMessage("Failed to copy Game ID", 'error');
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Google Sheets API
    if (typeof gapi !== 'undefined') {
        initGoogleSheetsApi();
    }
    
    // Welcome Screen Buttons
    newGameBtn.addEventListener('click', startNewGame);
    
    continueGameBtn.addEventListener('click', () => {
        const inputId = gameIdInput.value.trim();
        if (inputId) {
            loadGameState(inputId);
        } else {
            showMessage("Please enter a Game ID.", 'error');
        }
    });
    
    // Game Screen Buttons
    copyGameIdBtn.addEventListener('click', copyGameIdToClipboard);
    
    callNumberBtn.addEventListener('click', callNumber);
    
    bingoBtn.addEventListener('click', () => {
        showScreen(bingoScreen);
        bingoResult.classList.add('hidden');
        winningNumbersInput.value = '';
    });
    
    restartBtn.addEventListener('click', startNewGame);
    
    // Bingo Screen Buttons
    verifyBingoBtn.addEventListener('click', verifyBingo);
    
    backToGameBtn.addEventListener('click', () => {
        showScreen(gameScreen);
    });
});