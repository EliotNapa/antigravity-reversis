/**
 * ==========================================
 * NEON REVERSI - Node.js Logic Verification
 * ==========================================
 */

const { Board, BLACK, WHITE, EMPTY } = require('../js/reversi.js');

function assert(condition, message) {
    if (!condition) {
        console.error(`[FAIL] ${message}`);
        process.exit(1);
    } else {
        console.log(`[PASS] ${message}`);
    }
}

console.log("=== Reversi Logic Test Start ===");

// 1. 初期化テスト
const board = new Board();
assert(board.grid[3][3] === WHITE, "Initial (3,3) should be WHITE");
assert(board.grid[3][4] === BLACK, "Initial (3,4) should be BLACK");
assert(board.grid[4][3] === BLACK, "Initial (4,3) should be BLACK");
assert(board.grid[4][4] === WHITE, "Initial (4,4) should be WHITE");

const scores = board.getScores();
assert(scores.black === 2 && scores.white === 2, `Initial scores should be 2:2, got ${scores.black}:${scores.white}`);
assert(board.getEmptyCount() === 60, `Initial empty count should be 60, got ${board.getEmptyCount()}`);

// 2. 合法手テスト
const validBlackMoves = board.getValidMoves(BLACK);
console.log("Valid moves for BLACK:", validBlackMoves);
// 黒の初期合法手は、(2,3), (3,2), (4,5), (5,4)
assert(validBlackMoves.length === 4, `BLACK should have 4 valid moves, got ${validBlackMoves.length}`);
assert(validBlackMoves.some(m => m.x === 2 && m.y === 3), "BLACK should be able to play at (2,3)");
assert(validBlackMoves.some(m => m.x === 3 && m.y === 2), "BLACK should be able to play at (3,2)");
assert(validBlackMoves.some(m => m.x === 4 && m.y === 5), "BLACK should be able to play at (4,5)");
assert(validBlackMoves.some(m => m.x === 5 && m.y === 4), "BLACK should be able to play at (5,4)");

// 違法手テスト
assert(!board.isValidMove(0, 0, BLACK), "BLACK should NOT be able to play at (0,0)");
assert(!board.isValidMove(3, 3, BLACK), "BLACK should NOT be able to play at (3,3) - already occupied");

// 3. 着手・反転テスト
// (2,3)に黒を置く
const flipped = board.makeMove(2, 3, BLACK);
console.log("Flipped stones:", flipped);
assert(board.grid[3][2] === BLACK, "(3,2) should now be BLACK");
assert(board.grid[2][3] === EMPTY, "(2,3) should remain EMPTY");
assert(board.grid[3][3] === BLACK, "(3,3) should be flipped to BLACK");
assert(flipped.length === 1 && flipped[0].x === 3 && flipped[0].y === 3, "Only (3,3) should be flipped");

const scores2 = board.getScores();
assert(scores2.black === 4 && scores2.white === 1, `After move, score should be Black 4 : White 1, got ${scores2.black}:${scores2.white}`);
assert(board.getEmptyCount() === 59, `Empty count should decrease to 59, got ${board.getEmptyCount()}`);

// 4. クローン（複製）テスト
const clonedBoard = board.clone();
assert(clonedBoard.grid[3][3] === BLACK, "Cloned board (3,3) should be BLACK");
clonedBoard.makeMove(2, 2, WHITE); // 白の手番で(2,2)に打つ (合法なはず: (2,3)の黒を挟める)
assert(clonedBoard.grid[2][2] === WHITE, "Cloned board (2,2) should now be WHITE");
assert(board.grid[2][2] === EMPTY, "Original board should not be modified by clone's move");

console.log("=== All Logic Tests Passed Successfully! ===");
