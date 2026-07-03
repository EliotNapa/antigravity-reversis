/**
 * ==========================================
 * NEON REVERSI - CPU AI (Web Worker)
 * ==========================================
 */

// reversi.js をインポートして Board クラスを使用できるようにする
importScripts('reversi.js');

const EVAL_TABLE = [
    [120, -20,  20,   5,   5,  20, -20, 120],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [ 20,  -5,  15,   3,   3,  15,  -5,  20],
    [  5,  -5,   3,   3,   3,   3,  -5,   5],
    [  5,  -5,   3,   3,   3,   3,  -5,   5],
    [ 20,  -5,  15,   3,   3,  15,  -5,  20],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [120, -20,  20,   5,   5,  20, -20, 120]
];

// 最小思考ウェイト (ms) - CPUが考えているように見せるための演出
const MIN_THINKING_TIME = 400;

self.onmessage = function (e) {
    const { boardGrid, level, cpuColor } = e.data;
    
    // 盤面を復元
    const board = Board.fromGrid(boardGrid);
    const validMoves = board.getValidMoves(cpuColor);
    
    if (validMoves.length === 0) {
        self.postMessage({ move: null });
        return;
    }

    const startTime = Date.now();
    let bestMove = null;

    // レベルに応じた探索アルゴリズムの実行
    if (level === 1) {
        // レベル1: 完全ランダム
        bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    } 
    else if (level === 2) {
        // レベル2: 深さ1 (即時評価値最大化)
        let maxScore = -Infinity;
        const candidates = [];
        
        for (const move of validMoves) {
            const nextBoard = board.clone();
            nextBoard.makeMove(move.x, move.y, cpuColor);
            const score = evaluateBoard(nextBoard, cpuColor);
            
            if (score > maxScore) {
                maxScore = score;
                candidates.length = 0; // 配列クリア
                candidates.push(move);
            } else if (score === maxScore) {
                candidates.push(move);
            }
        }
        // 同値の場合はランダムに選択
        bestMove = candidates[Math.floor(Math.random() * candidates.length)];
    } 
    else {
        // レベル3〜5: Alpha-Beta探索
        let depth = 1;
        let isEndgame = false;
        const emptyCount = board.getEmptyCount();

        if (level === 3) {
            depth = 3;
        } else if (level === 4) {
            depth = 5;
        } else if (level === 5) {
            // レベル5は終盤（空きマス10個以下）なら完全読み切り
            if (emptyCount <= 10) {
                depth = emptyCount;
                isEndgame = true;
            } else {
                depth = 6; // 中盤は深さ6（実用速度と強さのベストバランス）
            }
        }

        const result = alphaBeta(board, depth, -Infinity, Infinity, true, cpuColor, cpuColor, isEndgame);
        bestMove = result.move || validMoves[0];
    }

    // 思考時間の調整（早すぎた場合はウェイトを入れる）
    const elapsed = Date.now() - startTime;
    const remainingDelay = Math.max(0, MIN_THINKING_TIME - elapsed);

    setTimeout(() => {
        self.postMessage({ 
            move: bestMove, 
            elapsedTime: Date.now() - startTime 
        });
    }, remainingDelay);
};

/**
 * 盤面の静的・動的評価関数 (レベル2〜5の通常用)
 * @param {Board} board 盤面
 * @param {number} color 評価対象のプレイヤーの色
 */
function evaluateBoard(board, color) {
    let score = 0;
    const opponent = -color;
    
    // 1. 静的評価テーブルによる評価
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const piece = board.grid[y][x];
            if (piece === color) {
                score += EVAL_TABLE[y][x];
            } else if (piece === opponent) {
                score -= EVAL_TABLE[y][x];
            }
        }
    }
    
    // 2. 着手可能数 (Mobility) の考慮
    // 自分の打てる場所が多いほど有利、相手が打てる場所が少ないほど有利
    const myMoves = board.getValidMoves(color).length;
    const oppMoves = board.getValidMoves(opponent).length;
    score += (myMoves - oppMoves) * 15;

    // 3. 確定石（四隅が取られている場合、隣の評価値を改善）
    // 例えば (0,0) を自分が取っているなら、(0,1), (1,0), (1,1) は相手に角を取られる危険がないため、マイナス評価を緩和
    const corners = [
        { cy: 0, cx: 0, adj: [{y:0, x:1}, {y:1, x:0}, {y:1, x:1}] },
        { cy: 0, cx: 7, adj: [{y:0, x:6}, {y:1, x:7}, {y:1, x:6}] },
        { cy: 7, cx: 0, adj: [{y:7, x:1}, {y:6, x:0}, {y:6, x:1}] },
        { cy: 7, cx: 7, adj: [{y:7, x:6}, {y:6, x:7}, {y:6, x:6}] }
    ];

    for (const corner of corners) {
        const owner = board.grid[corner.cy][corner.cx];
        if (owner !== EMPTY) {
            for (const cell of corner.adj) {
                const adjPiece = board.grid[cell.y][cell.x];
                if (adjPiece === owner) {
                    // 角と同じ色の石がある場合、ペナルティを打ち消してボーナスを与える
                    score += (owner === color ? 40 : -40);
                }
            }
        }
    }
    
    return score;
}

/**
 * 終盤完全読み切り用の評価関数 (純粋な石の枚数差)
 */
function evaluateEndgame(board, color) {
    const scores = board.getScores();
    const myCount = color === BLACK ? scores.black : scores.white;
    const oppCount = color === BLACK ? scores.white : scores.black;
    
    // 勝利時は非常に高いスコア、敗北時は非常に低いスコアを割り当てる
    if (board.isGameOver()) {
        if (myCount > oppCount) return 10000 + myCount;
        if (myCount < oppCount) return -10000 - oppCount;
        return 0; // 引き分け
    }
    
    return myCount - oppCount;
}

/**
 * Alpha-Beta枝刈り探索
 */
function alphaBeta(board, depth, alpha, beta, isMaximizing, color, originalColor, isEndgame) {
    // 終了条件
    if (depth === 0 || board.isGameOver()) {
        const score = isEndgame 
            ? evaluateEndgame(board, originalColor) 
            : evaluateBoard(board, originalColor);
        return { score: score, move: null };
    }

    const currentTurnColor = isMaximizing ? originalColor : -originalColor;
    const moves = board.getValidMoves(currentTurnColor);

    if (moves.length === 0) {
        // パス: 手番をパスして深さを1つ減らして探索続行
        return alphaBeta(board, depth - 1, alpha, beta, !isMaximizing, color, originalColor, isEndgame);
    }

    // 探索順序の最適化 (静的評価が高い手を優先的に探索して枝刈り効率を向上)
    moves.sort((a, b) => {
        const valA = EVAL_TABLE[a.y][a.x];
        const valB = EVAL_TABLE[b.y][b.x];
        return isMaximizing ? (valB - valA) : (valA - valB);
    });

    let bestMove = null;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const nextBoard = board.clone();
            nextBoard.makeMove(move.x, move.y, currentTurnColor);
            
            const evaluation = alphaBeta(nextBoard, depth - 1, alpha, beta, false, color, originalColor, isEndgame).score;
            
            if (evaluation > maxEval) {
                maxEval = evaluation;
                bestMove = move;
            }
            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) {
                break; // β枝刈り
            }
        }
        return { score: maxEval, move: bestMove };
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const nextBoard = board.clone();
            nextBoard.makeMove(move.x, move.y, currentTurnColor);
            
            const evaluation = alphaBeta(nextBoard, depth - 1, alpha, beta, true, color, originalColor, isEndgame).score;
            
            if (evaluation < minEval) {
                minEval = evaluation;
                bestMove = move;
            }
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) {
                break; // α枝刈り
            }
        }
        return { score: minEval, move: bestMove };
    }
}
