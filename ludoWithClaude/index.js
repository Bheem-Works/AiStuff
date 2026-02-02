// Game State
const gameState = {
    currentPlayer: 0, // 0 = red, 1 = blue
    players: ['red', 'blue'],
    diceValue: null,
    canRoll: true,
    tokens: {
        red: [
            { position: -1, inHome: true, finished: false },
            { position: -1, inHome: true, finished: false },
            { position: -1, inHome: true, finished: false },
            { position: -1, inHome: true, finished: false }
        ],
        blue: [
            { position: -1, inHome: true, finished: false },
            { position: -1, inHome: true, finished: false },
            { position: -1, inHome: true, finished: false },
            { position: -1, inHome: true, finished: false }
        ]
    },
    consecutiveSixes: 0
};

// Game Constants
const TOTAL_CELLS = 52;
const HOME_STRETCH_LENGTH = 5;
const START_POSITIONS = { red: 0, blue: 26 };
const HOME_STRETCH_ENTRY = { red: 50, blue: 24 };
const SAFE_POSITIONS = [0, 7, 13, 19, 26, 33, 39, 45];

// Initialize game
function initGame() {
    createTokens();
    updateTurnIndicator();
    showMessage('Red player, roll the dice to start!');
}

// Create token elements
function createTokens() {
    const colors = ['red', 'blue'];
    
    colors.forEach(color => {
        const homeContainer = document.getElementById(`${color}Home`);
        const spots = homeContainer.querySelectorAll('.home-spot');
        
        spots.forEach((spot, index) => {
            const token = document.createElement('div');
            token.className = `token ${color}`;
            token.dataset.color = color;
            token.dataset.index = index;
            token.addEventListener('click', () => handleTokenClick(color, index));
            spot.appendChild(token);
        });
    });
}

// Roll Dice
function rollDice() {
    if (!gameState.canRoll) {
        showMessage('Please move a token first!');
        return;
    }

    const dice = document.getElementById('dice');
    const diceButton = document.getElementById('diceButton');
    
    diceButton.disabled = true;
    dice.classList.add('rolling');

    // Simulate rolling animation
    let rollCount = 0;
    const rollInterval = setInterval(() => {
        const tempValue = Math.floor(Math.random() * 6) + 1;
        document.querySelector('.dice-face').textContent = tempValue;
        rollCount++;

        if (rollCount >= 10) {
            clearInterval(rollInterval);
            finishRoll();
        }
    }, 50);
}

function finishRoll() {
    const dice = document.getElementById('dice');
    gameState.diceValue = Math.floor(Math.random() * 6) + 1;
    
    document.querySelector('.dice-face').textContent = gameState.diceValue;
    document.getElementById('diceResult').textContent = `You rolled: ${gameState.diceValue}`;
    
    setTimeout(() => {
        dice.classList.remove('rolling');
        document.getElementById('diceButton').disabled = false;
        gameState.canRoll = false;
        handleDiceResult();
    }, 200);
}

// Handle dice result
function handleDiceResult() {
    const currentColor = gameState.players[gameState.currentPlayer];
    const movableTokens = getMovableTokens(currentColor);

    if (movableTokens.length === 0) {
        showMessage(`No valid moves! ${currentColor === 'red' ? 'Blue' : 'Red'}'s turn.`);
        document.getElementById('skipButton').disabled = false;
        
        // Auto-skip after 2 seconds
        setTimeout(() => {
            if (!gameState.canRoll) {
                skipTurn();
            }
        }, 2000);
    } else {
        highlightMovableTokens(movableTokens);
        showMessage(`Select a token to move ${gameState.diceValue} steps`);
    }
}

// Get movable tokens
function getMovableTokens(color) {
    const movable = [];
    const tokens = gameState.tokens[color];

    tokens.forEach((token, index) => {
        if (token.finished) return;

        // Can only exit home with a 6
        if (token.inHome && gameState.diceValue === 6) {
            movable.push(index);
        } else if (!token.inHome) {
            // Check if token can move without exceeding finish
            const newPosition = calculateNewPosition(color, token.position, gameState.diceValue);
            if (newPosition !== null) {
                movable.push(index);
            }
        }
    });

    return movable;
}

// Highlight movable tokens
function highlightMovableTokens(tokenIndices) {
    // Remove all previous highlights
    document.querySelectorAll('.token').forEach(t => t.classList.remove('movable'));

    const currentColor = gameState.players[gameState.currentPlayer];
    tokenIndices.forEach(index => {
        const tokenElement = document.querySelector(`.token.${currentColor}[data-index="${index}"]`);
        if (tokenElement) {
            tokenElement.classList.add('movable');
        }
    });
}

// Handle token click
function handleTokenClick(color, index) {
    if (gameState.canRoll) {
        showMessage('Roll the dice first!');
        return;
    }

    const currentColor = gameState.players[gameState.currentPlayer];
    if (color !== currentColor) {
        showMessage("It's not your turn!");
        return;
    }

    const movableTokens = getMovableTokens(color);
    if (!movableTokens.includes(index)) {
        showMessage('This token cannot move!');
        return;
    }

    moveToken(color, index);
}

// Move token
function moveToken(color, index) {
    const token = gameState.tokens[color][index];
    const tokenElement = document.querySelector(`.token.${color}[data-index="${index}"]`);

    // Remove highlights
    document.querySelectorAll('.token').forEach(t => t.classList.remove('movable'));

    if (token.inHome) {
        // Move out of home
        token.inHome = false;
        token.position = START_POSITIONS[color];
        showMessage(`${color} token ${index + 1} entered the board!`);
    } else {
        // Move on board
        const newPosition = calculateNewPosition(color, token.position, gameState.diceValue);
        if (newPosition === 'finished') {
            token.finished = true;
            tokenElement.style.display = 'none';
            showMessage(`${color} token ${index + 1} reached home!`);
        } else {
            token.position = newPosition;
        }
    }

    // Animate movement
    tokenElement.classList.add('moving');
    setTimeout(() => {
        tokenElement.classList.remove('moving');
        updateTokenPosition(color, index);
        
        // Check for capture
        if (!token.finished && !token.inHome) {
            checkCapture(color, token.position);
        }

        // Check for win
        if (checkWin(color)) {
            showWinner(color);
            return;
        }

        // Handle next turn
        if (gameState.diceValue === 6) {
            gameState.consecutiveSixes++;
            if (gameState.consecutiveSixes >= 3) {
                showMessage('Three 6s in a row! Turn skipped.');
                gameState.consecutiveSixes = 0;
                setTimeout(nextTurn, 1500);
            } else {
                showMessage('You got a 6! Roll again!');
                gameState.canRoll = true;
            }
        } else {
            gameState.consecutiveSixes = 0;
            nextTurn();
        }
    }, 500);
}

// Calculate new position
function calculateNewPosition(color, currentPosition, steps) {
    // Check if entering home stretch
    const homeEntry = HOME_STRETCH_ENTRY[color];
    let newPosition = (currentPosition + steps) % TOTAL_CELLS;

    // Handle home stretch entry
    if (currentPosition < homeEntry && (currentPosition + steps) >= homeEntry) {
        const stepsIntoStretch = (currentPosition + steps) - homeEntry;
        if (stepsIntoStretch <= HOME_STRETCH_LENGTH) {
            return `${color[0].toUpperCase()}${stepsIntoStretch}`;
        } else if (stepsIntoStretch === HOME_STRETCH_LENGTH + 1) {
            return 'finished';
        } else {
            return null; // Can't move - would overshoot
        }
    }

    // Already in home stretch
    if (typeof currentPosition === 'string' && currentPosition.includes(color[0].toUpperCase())) {
        const currentStep = parseInt(currentPosition.substring(1));
        const newStep = currentStep + steps;
        
        if (newStep <= HOME_STRETCH_LENGTH) {
            return `${color[0].toUpperCase()}${newStep}`;
        } else if (newStep === HOME_STRETCH_LENGTH + 1) {
            return 'finished';
        } else {
            return null; // Can't move - would overshoot
        }
    }

    return newPosition;
}

// Update token position on board
function updateTokenPosition(color, index) {
    const token = gameState.tokens[color][index];
    const tokenElement = document.querySelector(`.token.${color}[data-index="${index}"]`);

    if (token.finished) {
        tokenElement.style.display = 'none';
        return;
    }

    if (token.inHome) {
        // Token is in home area
        const homeSpot = document.querySelector(`.home-spot[data-color="${color}"][data-index="${index}"]`);
        if (homeSpot && !homeSpot.contains(tokenElement)) {
            homeSpot.appendChild(tokenElement);
        }
    } else {
        // Token is on the board
        let targetCell;
        
        if (typeof token.position === 'string') {
            // In home stretch
            targetCell = document.querySelector(`.cell[data-pos="${token.position}"]`);
        } else {
            // On main path
            targetCell = document.querySelector(`.cell[data-pos="${token.position}"]`);
        }

        if (targetCell) {
            targetCell.appendChild(tokenElement);
        }
    }
}

// Check for capture
function checkCapture(color, position) {
    // Don't capture on safe spots
    if (SAFE_POSITIONS.includes(position)) {
        return;
    }

    const opponentColor = color === 'red' ? 'blue' : 'red';
    const opponentTokens = gameState.tokens[opponentColor];

    opponentTokens.forEach((oppToken, index) => {
        if (!oppToken.inHome && !oppToken.finished && oppToken.position === position) {
            // Capture!
            oppToken.inHome = true;
            oppToken.position = -1;
            updateTokenPosition(opponentColor, index);
            showMessage(`${color} captured ${opponentColor}'s token!`);
        }
    });
}

// Check win condition
function checkWin(color) {
    return gameState.tokens[color].every(token => token.finished);
}

// Show winner
function showWinner(color) {
    const modal = document.getElementById('winnerModal');
    const winnerText = document.getElementById('winnerText');
    
    winnerText.textContent = `🎉 ${color.toUpperCase()} WINS! 🎉`;
    winnerText.style.color = color === 'red' ? '#e74c3c' : '#3498db';
    modal.classList.add('show');
}

// Next turn
function nextTurn() {
    gameState.currentPlayer = (gameState.currentPlayer + 1) % 2;
    gameState.canRoll = true;
    gameState.diceValue = null;
    
    document.querySelector('.dice-face').textContent = '?';
    document.getElementById('diceResult').textContent = 'Click to Roll';
    document.getElementById('skipButton').disabled = true;
    
    updateTurnIndicator();
    
    const nextColor = gameState.players[gameState.currentPlayer];
    showMessage(`${nextColor.charAt(0).toUpperCase() + nextColor.slice(1)}'s turn! Roll the dice.`);
}

// Skip turn
function skipTurn() {
    nextTurn();
}

// Update turn indicator
function updateTurnIndicator() {
    const indicator = document.getElementById('turnIndicator');
    const currentColor = gameState.players[gameState.currentPlayer];
    
    indicator.textContent = `${currentColor.charAt(0).toUpperCase() + currentColor.slice(1)}'s Turn`;
    indicator.style.color = currentColor === 'red' ? '#e74c3c' : '#3498db';
}

// Show message
function showMessage(text) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = text;
}

// New game
function newGame() {
    // Reset game state
    gameState.currentPlayer = 0;
    gameState.diceValue = null;
    gameState.canRoll = true;
    gameState.consecutiveSixes = 0;

    // Reset tokens
    ['red', 'blue'].forEach(color => {
        gameState.tokens[color] = [
            { position: -1, inHome: true, finished: false },
            { position: -1, inHome: true, finished: false },
            { position: -1, inHome: true, finished: false },
            { position: -1, inHome: true, finished: false }
        ];
    });

    // Reset UI
    document.getElementById('winnerModal').classList.remove('show');
    document.querySelector('.dice-face').textContent = '?';
    document.getElementById('diceResult').textContent = 'Click to Roll';
    document.getElementById('skipButton').disabled = true;

    // Remove all tokens from board
    document.querySelectorAll('.cell .token').forEach(token => token.remove());

    // Recreate tokens in home
    document.querySelectorAll('.home-spot .token').forEach(token => token.remove());
    createTokens();

    updateTurnIndicator();
    showMessage('Red player, roll the dice to start!');
}

// Initialize game on load
window.addEventListener('DOMContentLoaded', initGame);