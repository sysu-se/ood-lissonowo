/**
 * Game 领域对象
 * 表示一局游戏，管理历史记录和Undo/Redo操作
 */
import { createSudoku } from './sudoku';

/**
 * 创建Game对象
 * @param {Object} options - 配置选项
 * @param {Sudoku} options.sudoku - Sudoku对象
 * @returns {Game} Game对象
 */
export function createGame({ sudoku }) {
  let currentSudoku = sudoku;
  const history = []; // 存储历史快照
  let historyIndex = -1; // 当前历史索引

  // 初始化时保存初始状态
  history.push(currentSudoku.clone());
  historyIndex = 0;

  /**
   * 获取当前Sudoku对象
   * @returns {Sudoku} 当前Sudoku对象
   */
  function getSudoku() {
    return currentSudoku;
  }

  /**
   * 进行猜测并记录历史
   * @param {Object} move - 移动对象 {row, col, value}
   */
  function guess(move) {
    // 保存当前状态到历史
    history.splice(historyIndex + 1); // 清除当前索引之后的历史
    currentSudoku = currentSudoku.clone(); // 创建当前状态的副本
    currentSudoku.guess(move); // 在副本上执行移动
    history.push(currentSudoku); // 保存新状态
    historyIndex++;
  }

  /**
   * 撤销操作
   */
  function undo() {
    if (canUndo()) {
      historyIndex--;
      currentSudoku = history[historyIndex];
    }
  }

  /**
   * 重做操作
   */
  function redo() {
    if (canRedo()) {
      historyIndex++;
      currentSudoku = history[historyIndex];
    }
  }

  /**
   * 检查是否可以撤销
   * @returns {boolean} 是否可以撤销
   */
  function canUndo() {
    return historyIndex > 0;
  }

  /**
   * 检查是否可以重做
   * @returns {boolean} 是否可以重做
   */
  function canRedo() {
    return historyIndex < history.length - 1;
  }

  /**
   * 转换为JSON
   * @returns {Object} Game对象的JSON表示
   */
  function toJSON() {
    return {
      currentSudoku: currentSudoku.toJSON(),
      history: history.map(sudoku => sudoku.toJSON()),
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
    toJSON,
    // 暴露内部属性，用于gameStore更新初始网格
    get currentSudoku() {
      return currentSudoku;
    },
    set currentSudoku(value) {
      currentSudoku = value;
    },
    get history() {
      return history;
    },
    get historyIndex() {
      return historyIndex;
    },
    set historyIndex(value) {
      historyIndex = value;
    }
  };
}

/**
 * 从JSON创建Game对象
 * @param {Object} json - Game对象的JSON表示
 * @returns {Game} Game对象
 */
export function createGameFromJSON(json) {
  const currentSudoku = createSudoku(json.currentSudoku);
  const game = createGame({ sudoku: currentSudoku });

  // 清空默认的历史记录（使用splice避免重新赋值只读属性）
  game.history.splice(0);
  game.historyIndex = -1;
  
  // 恢复历史记录
  json.history.forEach(sudokuJson => {
    game.history.push(createSudoku(sudokuJson));
  });
  
  // 恢复历史索引
  game.historyIndex = json.historyIndex;
  
  return game;
}