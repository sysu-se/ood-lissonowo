import { writable } from 'svelte/store';
import { createSudoku, createGame } from '../domain';
import { generateSudoku } from '@sudoku/sudoku';
import { decodeSencode } from '@sudoku/sencode';
import { difficulty } from '@sudoku/stores/difficulty';
import { cursor } from '@sudoku/stores/cursor';
import { timer } from '@sudoku/stores/timer';
import { hints } from '@sudoku/stores/hints';
import { gamePaused } from '@sudoku/stores/game';

/**
 * 创建游戏 store 适配器
 *
 * 职责：
 * - 持有 Game / Sudoku 领域对象
 * - 对外暴露 Svelte 可消费的响应式状态（grid, originalGrid, invalidCells, won 等）
 * - 对外暴露 UI 可调用的方法（guess, undo, redo, startNewGame, startCustomGame）
 *
 * 领域对象是单一真源（single source of truth），store 是响应式投影。
 */
export function createGameStore() {
  let game = null;

  const { subscribe, set } = writable({
    grid: [],
    originalGrid: [],
    invalidCells: [],
    won: false,
    canUndo: false,
    canRedo: false
  });

  /**
   * 从当前 Game 对象刷新 store 状态
   */
  function updateStore() {
    if (!game) return;

    const sudoku = game.getSudoku();
    const grid = sudoku.getGrid();

    set({
      grid,
      originalGrid: sudoku.getOriginalGrid(),
      invalidCells: sudoku.getConflicts(),
      won: sudoku.isComplete() && sudoku.getConflicts().length === 0,
      canUndo: game.canUndo(),
      canRedo: game.canRedo()
    });
  }

  /**
   * 统一初始化流程：生成网格 -> 创建领域对象 -> 重置状态
   * @param {number[][]} puzzle - 9x9 数独题面
   */
  function initGame(puzzle) {
    // 题面即 originalGrid（不可修改的给定数字）
    const sudoku = createSudoku(puzzle, puzzle);
    game = createGame({ sudoku });

    updateStore();
  }

  /**
   * 开始新游戏（生成随机题面）
   * @param {string} diff - 难度
   */
  function startNewGame(diff) {
    const puzzle = generateSudoku(diff);

    difficulty.set(diff);
    cursor.reset();
    timer.reset();
    hints.reset();
    gamePaused.set(false);
    location.hash = '';

    initGame(puzzle);
  }

  /**
   * 开始自定义游戏（从 sencode 解码）
   * @param {string} sencode
   */
  function startCustomGame(sencode) {
    const puzzle = decodeSencode(sencode);

    difficulty.setCustom();
    cursor.reset();
    timer.reset();
    hints.reset();
    gamePaused.set(false);

    initGame(puzzle);
  }

  return {
    subscribe,

    startNewGame,
    startCustomGame,

    /** @param {{ row: number, col: number, value: number }} move */
    guess(move) {
      if (!game) return;
      game.guess(move);
      updateStore();
    },

    undo() {
      if (!game) return;
      game.undo();
      updateStore();
    },

    redo() {
      if (!game) return;
      game.redo();
      updateStore();
    }
  };
}

// 默认 store 实例（单例）
export const gameStore = createGameStore();
