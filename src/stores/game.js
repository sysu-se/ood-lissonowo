import { writable } from 'svelte/store';
import { createSudoku, createGame, solveSudoku } from '../domain';
import { generateSudoku } from '@sudoku/sudoku';
import { decodeSencode } from '@sudoku/sencode';
import { difficulty } from '@sudoku/stores/difficulty';
import { cursor } from '@sudoku/stores/cursor';
import { timer } from '@sudoku/stores/timer';
import { hints } from '@sudoku/stores/hints';
import { gamePaused } from '@sudoku/stores/game';
import { hintCounts } from './hintCounts';

/**
 * 创建游戏 store 适配器
 *
 * 职责：
 * - 持有 Game / Sudoku 领域对象
 * - 对外暴露 Svelte 可消费的响应式状态（grid, originalGrid, invalidCells, won 等）
 * - 对外暴露 UI 可调用的方法（guess, undo, redo, startNewGame, startCustomGame）
 * - 对外暴露提示方法（getCandidates, findHint）
 * - 对外暴露探索模式方法（startExplore, submitExplore, abandonExplore, backtrackExplore）
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
    canRedo: false,
    isExploring: false,
    canBacktrack: false,
    exploreFailedStates: [],
    notes: {}
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
      canRedo: game.canRedo(),
      isExploring: game.isExploring(),
      canBacktrack: game.canBacktrackExplore(),
      exploreFailedStates: game.isExploring() ? game.getExploreFailedStates() : [],
      notes: game.getAllNotes()
    });
  }

  /**
   * 统一初始化流程：生成网格 -> 创建领域对象 -> 重置状态
   * @param {number[][]} puzzle - 9x9 数独题面
   */
  function initGame(puzzle) {
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
    hintCounts.reset();
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
    hintCounts.reset();
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
    },

    // ── 三级提示功能 ──

    /**
     * 第一级：候选数提示
     * 计算用户选中格子的所有候选数，并返回
     * @param {number} row
     * @param {number} col
     * @returns {number[]} 候选数数组
     */
    hintLevel1(row, col) {
      if (!game) return null;
      const sudoku = game.getSudoku();
      if (sudoku.isGiven(row, col) || sudoku.getGrid()[row][col] !== 0) return null;
      const candidates = sudoku.getCandidates(row, col);
      if (candidates.length === 0) return null;
      hintCounts.useLevel1();
      game.setNotes(row, col, candidates);
      updateStore();
      return candidates;
    },

    /**
     * 第二级：跳转到候选数最少的格子
     * 找到当前盘面候选数最少的空格，返回其坐标
     * @returns {{ row: number, col: number, candidates: number[] } | null}
     */
    hintLevel2() {
      if (!game) return null;
      const sudoku = game.getSudoku();
      const hint = sudoku.findHint();
      if (!hint) return null;
      hintCounts.useLevel2();
      return { row: hint.row, col: hint.col, candidates: hint.candidates };
    },

    /**
     * 第三级：直接给出答案
     * 填入用户选中格子的正确答案
     * @param {number} row
     * @param {number} col
     * @returns {number|null} 填入的值，失败返回 null
     */
    hintLevel3(row, col) {
      if (!game) return null;
      const sudoku = game.getSudoku();
      if (sudoku.isGiven(row, col) || sudoku.getGrid()[row][col] !== 0) return null;
      const value = sudoku.getCorrectValue(row, col);
      if (!value) return null;
      hintCounts.useLevel3();
      game.clearNotes(row, col);
      game.guess({ row, col, value });
      updateStore();
      return value;
    },

    // ── Notes / 候选数操作 ──

    setNotes(row, col, candidates) {
      if (!game) return;
      game.setNotes(row, col, candidates);
      updateStore();
    },

    clearNotes(row, col) {
      if (!game) return;
      game.clearNotes(row, col);
      updateStore();
    },

    // ── 探索模式 ──

    startExplore() {
      if (!game) return;
      game.startExplore();
      updateStore();
    },

    submitExplore() {
      if (!game) return;
      game.submitExplore();
      updateStore();
    },

    abandonExplore() {
      if (!game) return;
      game.abandonExplore();
      updateStore();
    },

    backtrackExplore() {
      if (!game) return;
      game.backtrackExplore();
      updateStore();
    }
  };
}

// 默认 store 实例（单例）
export const gameStore = createGameStore();
