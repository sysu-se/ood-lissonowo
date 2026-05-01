/**
 * Game 领域对象
 * 表示一局游戏会话，管理历史记录与 Undo/Redo，以及探索模式
 *
 * 职责边界：
 * - 持有当前 Sudoku 对象
 * - 管理历史快照（Sudoku 深拷贝）
 * - 提供 undo() / redo()
 * - 提供 canUndo() / canRedo()
 * - 提供探索模式：startExplore / submitExplore / abandonExplore / backtrackExplore
 * - 作为 UI 层与领域层之间的主要接口
 *
 * 历史策略：快照式（每次 guess 克隆当前 Sudoku 存入 history）
 * 理由：9x9 网格仅 81 个数字，快照代价极小；逻辑简单，状态可靠
 *
 * 探索模式：
 * - 探索期间所有 guess 操作在独立历史中进行
 * - 提交后将探索历史合并入主历史
 * - 放弃或回溯则丢弃探索历史
 * - 冲突路径会被记录，用于"失败记忆"提示
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

  // 探索模式状态，null = 未在探索
  // { rootIndex, exploreHistory: Sudoku[], failedHashes: Set<string> }
  let exploreState = null;

  function getSudoku() {
    return currentSudoku.clone();
  }

  // ── Notes / 候选数（Game 级别闭包状态，不参与历史） ──
  // key 格式统一为 "col,row"，与 UI 渲染层一致
  const _notes = {}; // { "col,row": Set<number> }

  function setNotes(row, col, candidates) {
    const key = `${col},${row}`;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      delete _notes[key];
    } else {
      _notes[key] = new Set(candidates);
    }
  }

  function clearNotes(row, col) {
    delete _notes[`${col},${row}`];
  }

  function getAllNotes() {
    const result = {};
    for (const key of Object.keys(_notes)) {
      result[key] = [..._notes[key]].sort();
    }
    return result;
  }

  // ── 探索模式 ──

  function isExploring() {
    return exploreState !== null;
  }

  /**
   * 进入探索模式
   * 保存当前 history 位置作为分支点
   */
  function startExplore() {
    if (isExploring()) throw new Error('Already in explore mode');
    exploreState = {
      rootIndex: historyIndex,
      exploreHistory: [],
      exploreHistoryIndex: -1,
      failedHashes: new Set()
    };
  }

  /**
   * 回溯到探索起点（清除所有探索步）
   */
  function backtrackExplore() {
    if (!isExploring()) throw new Error('Not in explore mode');
    const rootSudoku = history[exploreState.rootIndex];
    currentSudoku = rootSudoku.clone();
    exploreState.exploreHistory = [];
    exploreState.exploreHistoryIndex = -1;
  }

  /**
   * 提交探索结果：将探索历史合并入主历史
   */
  function submitExplore() {
    if (!isExploring()) throw new Error('Not in explore mode');

    const commitCount = exploreState.exploreHistoryIndex + 1;
    if (commitCount > 0) {
      // 裁剪主历史到分支点
      history.splice(exploreState.rootIndex + 1);
      // 将探索历史中的有效步（当前 index 之前）推入主历史
      for (let i = 0; i < commitCount; i++) {
        history.push(exploreState.exploreHistory[i]);
      }
      historyIndex = history.length - 1;
      currentSudoku = history[historyIndex];
    }

    exploreState = null;
  }

  /**
   * 放弃探索：丢弃所有探索步，回到分支点状态
   */
  function abandonExplore() {
    if (!isExploring()) throw new Error('Not in explore mode');

    if (exploreState.rootIndex >= 0 && exploreState.rootIndex < history.length) {
      currentSudoku = history[exploreState.rootIndex].clone();
    }
    exploreState = null;
  }

  /**
   * 获取已记录的失败盘面哈希列表
   * @returns {string[]}
   */
  function getExploreFailedStates() {
    if (!isExploring()) return [];
    return [...exploreState.failedHashes];
  }

  /**
   * 检查指定哈希是否已被标记为失败
   * @param {string} hash
   * @returns {boolean}
   */
  function isFailedState(hash) {
    if (!isExploring()) return false;
    return exploreState.failedHashes.has(hash);
  }

  /**
   * 探索模式下是否已产生探索步（可回溯）
   * @returns {boolean}
   */
  function canBacktrackExplore() {
    return isExploring() && exploreState.exploreHistoryIndex > -1;
  }

  // ── 核心操作 ──

  /**
   * 进行猜测并记录历史
   * 探索模式下写入探索历史，否则写入主历史
   * @param {Object} move - { row, col, value }
   */
  function guess(move) {
    if (isExploring()) {
      // 探索模式：克隆当前盘面并应用
      const newSudoku = currentSudoku.clone();
      newSudoku.guess(move);
      currentSudoku = newSudoku;

      // 裁剪 redo 历史（undo 后新操作），推入并推进 index
      exploreState.exploreHistory.splice(exploreState.exploreHistoryIndex + 1);
      exploreState.exploreHistory.push(currentSudoku);
      exploreState.exploreHistoryIndex++;

      // 填入数字时清除该格的 notes
      if (move.value !== 0) {
        clearNotes(move.row, move.col);
      }

      // 若产生冲突，记录失败状态
      if (currentSudoku.getConflicts().length > 0) {
        exploreState.failedHashes.add(currentSudoku.getGridHash());
      }
    } else {
      // 正常模式
      history.splice(historyIndex + 1);

      currentSudoku = currentSudoku.clone();
      currentSudoku.guess(move);

      // 填入数字时清除该格的 notes
      if (move.value !== 0) {
        clearNotes(move.row, move.col);
      }

      history.push(currentSudoku);
      historyIndex++;
    }
  }

  /**
   * 撤销最近一次操作
   * 探索模式下在探索历史内回退，正常模式下在主历史内回退
   */
  function undo() {
    if (isExploring()) {
      if (!canUndo()) return;
      exploreState.exploreHistoryIndex--;
      if (exploreState.exploreHistoryIndex >= 0) {
        currentSudoku = exploreState.exploreHistory[exploreState.exploreHistoryIndex];
      } else {
        currentSudoku = history[exploreState.rootIndex].clone();
      }
      return;
    }
    if (canUndo()) {
      historyIndex--;
      currentSudoku = history[historyIndex];
    }
  }

  /**
   * 重做被撤销的操作
   * 探索模式下在探索历史内前进，正常模式下在主历史内前进
   */
  function redo() {
    if (isExploring()) {
      if (!canRedo()) return;
      exploreState.exploreHistoryIndex++;
      currentSudoku = exploreState.exploreHistory[exploreState.exploreHistoryIndex];
      return;
    }
    if (canRedo()) {
      historyIndex++;
      currentSudoku = history[historyIndex];
    }
  }

  function canUndo() {
    if (isExploring()) return exploreState.exploreHistoryIndex > -1;
    return historyIndex > 0;
  }

  function canRedo() {
    if (isExploring()) return exploreState.exploreHistoryIndex < exploreState.exploreHistory.length - 1;
    return historyIndex < history.length - 1;
  }

  /**
   * 序列化为 JSON
   * 仅序列化主历史，探索模式状态不参与持久化
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
    isExploring,
    startExplore,
    backtrackExplore,
    submitExplore,
    abandonExplore,
    getExploreFailedStates,
    isFailedState,
    canBacktrackExplore,
    setNotes,
    clearNotes,
    getAllNotes,
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
