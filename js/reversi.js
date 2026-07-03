/**
 * ==========================================
 * NEON REVERSI - Game Logic
 * ==========================================
 */

const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;

class Board {
    constructor() {
        // 8x8の盤面を初期化 (0: 空き)
        this.grid = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
        
        // 初期配置
        this.grid[3][3] = WHITE;
        this.grid[3][4] = BLACK;
        this.grid[4][3] = BLACK;
        this.grid[4][4] = WHITE;

        // 8方向のベクトル定義 [dy, dx]
        this.directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
    }

    /**
     * 盤面の状態をディープコピーする
     * @returns {Board} 複製されたBoardインスタンス
     */
    clone() {
        const newBoard = new Board();
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                newBoard.grid[y][x] = this.grid[y][x];
            }
        }
        return newBoard;
    }

    /**
     * 指定座標が盤面内にあるか判定
     */
    isOnBoard(x, y) {
        return x >= 0 && x < 8 && y >= 0 && y < 8;
    }

    /**
     * 指定座標の石を取得
     */
    getPiece(x, y) {
        if (!this.isOnBoard(x, y)) return null;
        return this.grid[y][x];
    }

    /**
     * 指定座標に石を置けるか（合法手か）チェック
     * @param {number} x X座標
     * @param {number} y Y座標
     * @param {number} color 置く石の色 (BLACK or WHITE)
     * @returns {boolean} 置ける場合はtrue
     */
    isValidMove(x, y, color) {
        // すでに石がある場合は置けない
        if (this.grid[y][x] !== EMPTY) {
            return false;
        }

        const opponent = -color;

        // 8方向走査して、挟める石があるか確認
        for (const [dy, dx] of this.directions) {
            let cy = y + dy;
            let cx = x + dx;
            let hasOpponentBetween = false;

            // 相手の石が続く限り進む
            while (this.isOnBoard(cx, cy) && this.grid[cy][cx] === opponent) {
                cy += dy;
                cx += dx;
                hasOpponentBetween = true;
            }

            // 相手の石の先に自分の石があれば、その方向に挟める
            if (hasOpponentBetween && this.isOnBoard(cx, cy) && this.grid[cy][cx] === color) {
                return true;
            }
        }

        return false;
    }

    /**
     * 指定した色のプレイヤーが打てるすべての合法手を取得
     * @param {number} color プレイヤーの色
     * @returns {Array<{x: number, y: number}>} 合法手の座標配列
     */
    getValidMoves(color) {
        const moves = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.isValidMove(x, y, color)) {
                    moves.push({ x, y });
                }
            }
        }
        return moves;
    }

    /**
     * 合法手が存在するか判定
     */
    hasValidMove(color) {
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.isValidMove(x, y, color)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 石を置いて、挟まれた石を反転させる
     * @param {number} x X座標
     * @param {number} y Y座標
     * @param {number} color 置く石の色
     * @returns {Array<{x: number, y: number}>} 反転した石の座標配列（UIアニメーション等で使用）
     */
    makeMove(x, y, color) {
        if (!this.isValidMove(x, y, color)) {
            throw new Error(`Invalid move at (${x}, ${y}) for color ${color}`);
        }

        const flipped = [];
        const opponent = -color;
        this.grid[y][x] = color;

        for (const [dy, dx] of this.directions) {
            let cy = y + dy;
            let cx = x + dx;
            const tempFlipped = [];

            while (this.isOnBoard(cx, cy) && this.grid[cy][cx] === opponent) {
                tempFlipped.push({ x: cx, y: cy });
                cy += dy;
                cx += dx;
            }

            if (tempFlipped.length > 0 && this.isOnBoard(cx, cy) && this.grid[cy][cx] === color) {
                // 実際に反転させる
                for (const pos of tempFlipped) {
                    this.grid[pos.y][pos.x] = color;
                    flipped.push(pos);
                }
            }
        }

        return flipped;
    }

    /**
     * ゲーム終了判定
     * 両者ともに置ける場所がなくなればゲーム終了
     */
    isGameOver() {
        return !this.hasValidMove(BLACK) && !this.hasValidMove(WHITE);
    }

    /**
     * 石の数を集計
     */
    getScores() {
        let black = 0;
        let white = 0;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.grid[y][x] === BLACK) black++;
                else if (this.grid[y][x] === WHITE) white++;
            }
        }
        return { black, white };
    }

    /**
     * 空きマスの数を取得
     */
    getEmptyCount() {
        let count = 0;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.grid[y][x] === EMPTY) count++;
            }
        }
        return count;
    }

    /**
     * 盤面を配列として復元するためのデシリアライズ用静的メソッド
     * Web Workerとのデータのやり取りで使用
     * @param {Array<Array<number>>} gridGrid 8x8の数値配列
     * @returns {Board} Boardインスタンス
     */
    static fromGrid(gridGrid) {
        const board = new Board();
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                board.grid[y][x] = gridGrid[y][x];
            }
        }
        return board;
    }
}

// エクスポート対応
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Board, EMPTY, BLACK, WHITE };
} else if (typeof window !== 'undefined') {
    window.Board = Board;
    window.EMPTY = EMPTY;
    window.BLACK = BLACK;
    window.WHITE = WHITE;
} else if (typeof self !== 'undefined') {
    // Web Worker用
    self.Board = Board;
    self.EMPTY = EMPTY;
    self.BLACK = BLACK;
    self.WHITE = WHITE;
}
