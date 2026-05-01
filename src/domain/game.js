/**
 * Game 领域对象
 * 表示一局游戏会话，管理历史记录与 Undo/Redo
 *
 * 职责边界：
 * - 持有当前 Sudoku 对象
 * - 管理历史快照（Sudoku 深拷贝）
 * - 提供 undo() / redo()
 * - 提供 canUndo() / canRedo()
 * - 作为 UI 层与领域层之间的主要接口
 *
 * 历史策略：快照式（每次 guess 克隆当前 Sudoku 存入 history）
 * 理由：9x9 网格仅 81 个数字，快照代价极小；逻辑简单，状态可靠
 */

import { createSudoku, createSudokuFromJSON } from './sudoku.js';

/**
 * 内部工厂：用指定初始状态创建 Game
 * @param {Object} options
 * @param {Sudoku} options.sudoku - 当前 Sudoku 对象
 * @param {Sudoku[]} options.history - 历史记录 (Sudoku 对象数组)
 * @param {number} options.historyIndex - 当前历史位置
 * @returns {Game} Game 对象
 */
function createGameWithState({ sudoku, history, historyIndex }) {
  let currentSudoku = sudoku;

  function getSudoku() {
    // 返回克隆，防止调用方绕过 Game.guess() 直接修改盘面
    return currentSudoku.clone();
  }

  /**
   * 进行猜测并记录历史
   * @param {Object} move - { row, col, value }
   */
  function guess(move) {
    // 清除当前索引之后的 Redo 历史
    history.splice(historyIndex + 1);

    // 深拷贝当前状态，在新副本上执行移动
    currentSudoku = currentSudoku.clone();
    currentSudoku.guess(move);

    // 存入历史
    history.push(currentSudoku);
    historyIndex++;
  }

  /**
   * 撤销最近一次操作
   */
  function undo() {
    if (canUndo()) {
      historyIndex--;
      currentSudoku = history[historyIndex];
    }
  }

  /**
   * 重做被撤销的操作
   */
  function redo() {
    if (canRedo()) {
      historyIndex++;
      currentSudoku = history[historyIndex];
    }
  }

  /**
   * 检查是否可以撤销
   * @returns {boolean}
   */
  function canUndo() {
    return historyIndex > 0;
  }

  /**
   * 检查是否可以重做
   * @returns {boolean}
   */
  function canRedo() {
    return historyIndex < history.length - 1;
  }

  /**
   * 序列化为 JSON
   * 只序列化 history + historyIndex，不单独存 currentSudoku
   * 因为 currentSudoku === history[historyIndex]
   * @returns {Object}
   */
  function toJSON() {
    return {
      history: history.map(s => s.toJSON()),
      historyIndex
    };
  }

  return {
    getSudoku,
    guess,
    undo,
    redo,
    canUndo,
    canRedo,
    toJSON
  };
}

/**
 * 创建新游戏
 * @param {Object} options
 * @param {Sudoku} options.sudoku - Sudoku 对象
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  return createGameWithState({
    sudoku,
    history: [sudoku.clone()],
    historyIndex: 0
  });
}

/**
 * 从 JSON 恢复游戏（含完整历史记录）
 * @param {Object} json - Game.toJSON() 的输出
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  const history = json.history.map(sudokuJson => createSudokuFromJSON(sudokuJson));
  const historyIndex = json.historyIndex;
  const currentSudoku = history[historyIndex];

  return createGameWithState({
    sudoku: currentSudoku,
    history,
    historyIndex
  });
}
