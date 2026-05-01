/**
 * 领域对象模块索引
 * 导出所有必要的函数以符合统一评分接口
 */

import { createSudoku, createSudokuFromJSON } from './sudoku.js';
import { createGame, createGameFromJSON } from './game.js';

export {
  createSudoku,
  createSudokuFromJSON,
  createGame,
  createGameFromJSON
};