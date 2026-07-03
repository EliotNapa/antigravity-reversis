/**
 * ==========================================
 * NEON REVERSI - UI & Application Controller
 * ==========================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const boardEl = document.getElementById('board');
    const cpuLevelSelect = document.getElementById('cpu-level');
    const selectBlackBtn = document.getElementById('select-black');
    const selectWhiteBtn = document.getElementById('select-white');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const muteBtn = document.getElementById('mute-btn');
    const turnIndicator = document.getElementById('turn-indicator');
    
    const blackCard = document.getElementById('black-card');
    const whiteCard = document.getElementById('white-card');
    const blackScoreEl = document.getElementById('black-score');
    const whiteScoreEl = document.getElementById('white-score');
    const blackTypeEl = document.getElementById('black-type');
    const whiteTypeEl = document.getElementById('white-type');
    const cpuLoader = document.getElementById('cpu-loader');
    const cpuThinkingDepthEl = document.getElementById('cpu-thinking-depth');

    const resultModal = document.getElementById('result-modal');
    const modalContent = resultModal.querySelector('.modal-content');
    const resultTitle = document.getElementById('result-title');
    const finalBlackScore = document.getElementById('final-black-score');
    const finalWhiteScore = document.getElementById('final-white-score');
    const resultMessage = document.getElementById('result-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // --- State Variables ---
    let board = null;
    let userColor = BLACK; // デフォルト先手 (黒: 1)
    let cpuColor = WHITE;  // デフォルト後手 (白: -1)
    let currentTurn = BLACK;
    let isGameActive = false;
    let isCpuThinking = false;
    let cpuWorker = null;
    let lastMove = null; // {x, y}

    // --- Star Points (Othello Grid helper points) ---
    const starPoints = [
        {y: 2, x: 2}, {y: 2, x: 6},
        {y: 6, x: 2}, {y: 6, x: 6}
    ];

    // --- Initialize ---
    setupEventListeners();
    renderEmptyBoard();
    initWorker();

    // --- Worker Initialization ---
    function initWorker() {
        if (cpuWorker) {
            cpuWorker.terminate();
        }
        cpuWorker = new Worker('js/cpu-worker.js');
        cpuWorker.onmessage = handleWorkerMessage;
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Player Color Selection
        selectBlackBtn.addEventListener('click', () => {
            if (isGameActive) return;
            userColor = BLACK;
            cpuColor = WHITE;
            selectBlackBtn.classList.add('active');
            selectWhiteBtn.classList.remove('active');
            updatePlayerTypesDisplay();
        });

        selectWhiteBtn.addEventListener('click', () => {
            if (isGameActive) return;
            userColor = WHITE;
            cpuColor = BLACK;
            selectWhiteBtn.classList.add('active');
            selectBlackBtn.classList.remove('active');
            updatePlayerTypesDisplay();
        });

        // Game Controls
        startBtn.addEventListener('click', startGame);
        resetBtn.addEventListener('click', resetGame);
        modalCloseBtn.addEventListener('click', () => {
            resultModal.style.display = 'none';
            resetGame();
        });

        // Sound Mute Toggle
        muteBtn.addEventListener('click', () => {
            const isMuted = soundManager.toggleMute();
            if (isMuted) {
                muteBtn.classList.add('muted');
                muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> 音声オフ';
            } else {
                muteBtn.classList.remove('muted');
                muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> 音声オン';
            }
        });
    }

    // --- Update UI Player Types ---
    function updatePlayerTypesDisplay() {
        if (userColor === BLACK) {
            blackTypeEl.textContent = '人間';
            whiteTypeEl.textContent = 'CPU';
        } else {
            blackTypeEl.textContent = 'CPU';
            whiteTypeEl.textContent = '人間';
        }
    }

    // --- Render Empty Grid (Initial State) ---
    function renderEmptyBoard() {
        boardEl.innerHTML = '';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                // 星打ち（ヘルパー点）の配置
                if (starPoints.some(pt => pt.x === x && pt.y === y)) {
                    cell.classList.add('star-point');
                }

                boardEl.appendChild(cell);
            }
        }
    }

    // --- Start Game ---
    function startGame() {
        // Web Audio Contextの有効化
        soundManager.initContext();
        
        board = new Board();
        currentTurn = BLACK;
        isGameActive = true;
        lastMove = null;

        // UIコントロールの無効化/有効化
        cpuLevelSelect.disabled = true;
        selectBlackBtn.disabled = true;
        selectWhiteBtn.disabled = true;
        startBtn.disabled = true;
        resetBtn.disabled = false;

        updateUI();
        nextTurn();
    }

    // --- Reset Game ---
    function resetGame() {
        isGameActive = false;
        isCpuThinking = false;
        board = null;
        lastMove = null;
        cpuLoader.style.display = 'none';

        // UIコントロールの復帰
        cpuLevelSelect.disabled = false;
        selectBlackBtn.disabled = false;
        selectWhiteBtn.disabled = false;
        startBtn.disabled = false;
        resetBtn.disabled = true;

        turnIndicator.textContent = 'ゲームを開始してください';
        blackScoreEl.textContent = '2';
        whiteScoreEl.textContent = '2';

        blackCard.classList.remove('active-turn');
        whiteCard.classList.remove('active-turn');

        renderEmptyBoard();
        // 初期状態の石を描画
        drawStonesInitial();
        initWorker(); // 念のためWorkerも再初期化
    }

    // --- Draw Stones Initial (before game starts) ---
    function drawStonesInitial() {
        const initialStones = [
            {y: 3, x: 3, color: WHITE},
            {y: 3, x: 4, color: BLACK},
            {y: 4, x: 3, color: BLACK},
            {y: 4, x: 4, color: WHITE}
        ];

        initialStones.forEach(st => {
            const cell = boardEl.querySelector(`[data-x="${st.x}"][data-y="${st.y}"]`);
            if (cell) {
                const stone = createStoneDOM(st.color);
                cell.appendChild(stone);
            }
        });
    }

    // 初期状態でも石を表示しておく
    drawStonesInitial();

    // --- Next Turn Control ---
    function nextTurn() {
        if (!isGameActive) return;

        // 合法手のハイライトをクリア
        clearValidMovesHighlight();

        // 勝敗判定
        if (board.isGameOver()) {
            endGame();
            return;
        }

        // 手番側の合法手があるかチェック
        if (!board.hasValidMove(currentTurn)) {
            // パス
            soundManager.playPass();
            const passerName = currentTurn === BLACK ? '黒 (先手)' : '白 (後手)';
            turnIndicator.textContent = `${passerName} がパスしました`;
            
            // 手番を即時に変更
            currentTurn = -currentTurn;
            
            setTimeout(() => {
                nextTurn();
            }, 1200);
            return;
        }

        // アクティブな手番カードのハイライト
        if (currentTurn === BLACK) {
            blackCard.classList.add('active-turn');
            whiteCard.classList.remove('active-turn');
            turnIndicator.textContent = userColor === BLACK ? 'あなたの番です (黒)' : 'CPUの番です (黒)';
        } else {
            whiteCard.classList.add('active-turn');
            blackCard.classList.remove('active-turn');
            turnIndicator.textContent = userColor === WHITE ? 'あなたの番です (白)' : 'CPUの番です (白)';
        }

        // CPUかプレイヤーかの処理分岐
        if (currentTurn === cpuColor) {
            // CPUのターン
            isCpuThinking = true;
            cpuLoader.style.display = 'flex';
            
            const level = parseInt(cpuLevelSelect.value);
            // レベルごとの深さ表記をインジケータに表示
            let depthText = '';
            if (level === 2) depthText = '(直近手)';
            if (level === 3) depthText = '(3手読み)';
            if (level === 4) depthText = '(5手読み)';
            if (level === 5) {
                depthText = board.getEmptyCount() <= 10 ? `(終盤完全読 ${board.getEmptyCount()}手)` : '(6手読み)';
            }
            cpuThinkingDepthEl.textContent = depthText;

            // Workerへ計算依頼
            cpuWorker.postMessage({
                boardGrid: board.grid,
                level: level,
                cpuColor: cpuColor
            });
        } else {
            // プレイヤーのターン
            isCpuThinking = false;
            cpuLoader.style.display = 'none';
            highlightValidMoves();
        }
    }

    // --- Worker Response Handler ---
    function handleWorkerMessage(e) {
        if (!isGameActive || currentTurn !== cpuColor) return;
        
        const { move } = e.data;
        isCpuThinking = false;
        cpuLoader.style.display = 'none';

        if (move) {
            executeMove(move.x, move.y);
        } else {
            // 安全策のパス（ロジック上はnextTurnで処理されるため、基本ここには来ない）
            currentTurn = -currentTurn;
            nextTurn();
        }
    }

    // --- Execute Move ---
    function executeMove(x, y) {
        lastMove = { x, y };
        
        // 石の配置と反転処理を実行
        const flipped = board.makeMove(x, y, currentTurn);
        
        // 効果音
        soundManager.playPlaceStone();
        
        // UI描画
        updateUI();
        
        // 新規石と反転石のアニメーションをトリガー
        animateStones(x, y, flipped);

        // 手番切り替え
        currentTurn = -currentTurn;

        // アニメーション完了（約0.6秒）の時間を置いて次のターンへ
        setTimeout(() => {
            nextTurn();
        }, 700);
    }

    // --- Cell Click Handler (Player input) ---
    boardEl.addEventListener('click', (e) => {
        if (!isGameActive || isCpuThinking || currentTurn === cpuColor) return;

        const cell = e.target.closest('.cell');
        if (!cell) return;

        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);

        if (board.isValidMove(x, y, currentTurn)) {
            executeMove(x, y);
        }
    });

    // --- Create Stone DOM Element ---
    function createStoneDOM(color, isNew = false) {
        const stone = document.createElement('div');
        stone.className = `stone ${color === BLACK ? 'black-up' : 'white-up'}`;
        
        if (isNew) {
            stone.classList.add('spawn');
            // CSS変数に回転方向を指定
            stone.style.setProperty('--target-rotation', color === BLACK ? '0deg' : '180deg');
        }

        const front = document.createElement('div');
        front.className = 'stone-face black-face';
        
        const back = document.createElement('div');
        back.className = 'stone-face white-face';
        
        stone.appendChild(front);
        stone.appendChild(back);
        
        return stone;
    }

    // --- Render Stones based on board state ---
    function updateUI() {
        const scores = board.getScores();
        blackScoreEl.textContent = scores.black;
        whiteScoreEl.textContent = scores.white;

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const cell = boardEl.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                const piece = board.grid[y][x];

                // 最後に置いた手のハイライト
                if (lastMove && lastMove.x === x && lastMove.y === y) {
                    cell.classList.add('last-move');
                } else {
                    cell.classList.remove('last-move');
                }

                const existingStone = cell.querySelector('.stone');

                if (piece === EMPTY) {
                    if (existingStone) existingStone.remove();
                } else {
                    if (!existingStone) {
                        // 新しく石を置く（アニメーションはanimateStones側でリセットするが、ここでも生成可能）
                        const stone = createStoneDOM(piece, true);
                        cell.appendChild(stone);
                    }
                }
            }
        }
    }

    // --- Wave Animation for Flipping Stones ---
    function animateStones(placedX, placedY, flippedPositions) {
        // 新しく置かれた石のDOMアニメーションを確実に走らせる
        const placedCell = boardEl.querySelector(`[data-x="${placedX}"][data-y="${placedY}"]`);
        const placedStone = placedCell.querySelector('.stone');
        if (placedStone) {
            placedStone.classList.add('spawn');
        }

        // 反転する石たちに対してディレイをかけた3D回転を適用
        flippedPositions.forEach(pos => {
            const cell = boardEl.querySelector(`[data-x="${pos.x}"][data-y="${pos.y}"]`);
            const stone = cell.querySelector('.stone');
            if (stone) {
                // 置いた場所からのマンハッタン距離を計算
                const dist = Math.abs(pos.x - placedX) + Math.abs(pos.y - placedY);
                
                // 波のように順番にひっくり返す演出のためのディレイ設定
                stone.style.transitionDelay = `${dist * 0.08}s`;
                
                // クラスを入れ替えることでCSS transitionによるY軸回転を誘発
                if (currentTurn === BLACK) {
                    stone.classList.remove('white-up');
                    stone.classList.add('black-up');
                } else {
                    stone.classList.remove('black-up');
                    stone.classList.add('white-up');
                }
                
                // トランジション終了後にディレイプロパティをリセット
                stone.addEventListener('transitionend', () => {
                    stone.style.transitionDelay = '0s';
                }, { once: true });
            }
        });
    }

    // --- Valid Moves Highlighting ---
    function highlightValidMoves() {
        const moves = board.getValidMoves(currentTurn);
        moves.forEach(move => {
            const cell = boardEl.querySelector(`[data-x="${move.x}"][data-y="${move.y}"]`);
            if (cell) {
                cell.classList.add('valid-move');
            }
        });
    }

    function clearValidMovesHighlight() {
        const cells = boardEl.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('valid-move');
        });
    }

    // --- End Game ---
    function endGame() {
        isGameActive = false;
        
        const scores = board.getScores();
        finalBlackScore.textContent = scores.black;
        finalWhiteScore.textContent = scores.white;

        // 勝敗メッセージ判定
        let winnerMsg = '';
        let modalClass = 'win';

        if (scores.black === scores.white) {
            winnerMsg = '引き分けです';
            modalClass = 'draw';
            soundManager.playDraw();
        } else {
            const winnerColor = scores.black > scores.white ? BLACK : WHITE;
            
            if (winnerColor === userColor) {
                winnerMsg = 'あなたの勝利です！';
                modalClass = 'win';
                soundManager.playWin();
            } else {
                winnerMsg = 'CPUの勝利です...';
                modalClass = 'lose';
                soundManager.playLose();
            }
        }

        resultMessage.textContent = winnerMsg;
        
        // モーダルのスタイル設定
        modalContent.className = `modal-content glass-panel ${modalClass}`;
        resultTitle.textContent = 'ゲーム終了';
        
        setTimeout(() => {
            resultModal.style.display = 'flex';
        }, 800);
    }
});
