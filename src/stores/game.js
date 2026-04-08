import { writable } from 'svelte/store';
import { createSudoku, createGame } from '../domain';
import { grid as originalGrid } from '@sudoku/stores/grid';

/**
 * 创建游戏store
 * @param {number[][]} initialGrid - 初始数独网格
 * @returns {Object} 游戏store
 */
export function createGameStore(initialGrid) {
  // 创建初始Sudoku和Game
  let game = createGame({ sudoku: createSudoku(initialGrid) });

  // 存储初始网格，用于判断哪些是原始数字
  let originalGridValues = initialGrid.map(row => [...row]);

  // 创建writable store来存储响应式状态
  const { subscribe, set, update } = writable({
    grid: game.getSudoku().getGrid(),
    originalGrid: originalGridValues,
    invalidCells: [],
    won: game.getSudoku().isComplete(),
    canUndo: game.canUndo(),
    canRedo: game.canRedo()
  });

  // 更新store状态
  function updateStore() {
    const sudoku = game.getSudoku();
    const grid = sudoku.getGrid();
    
    // 计算无效单元格
    const invalidCells = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] !== 0) {
          // 临时设置该单元格为0，检查其他单元格是否有效
          const tempValue = grid[row][col];
          grid[row][col] = 0;
          const tempSudoku = createSudoku(grid);
          tempSudoku.guess({ row, col, value: tempValue });
          if (!tempSudoku.isValid()) {
            invalidCells.push({ row, col });
          }
          grid[row][col] = tempValue;
        }
      }
    }

    set({
      grid: sudoku.getGrid(),
      originalGrid: originalGridValues,
      invalidCells,
      won: sudoku.isComplete(),
      canUndo: game.canUndo(),
      canRedo: game.canRedo()
    });
  }

  // 暴露给UI的方法
  const methods = {
    /**
     * 进行猜测
     * @param {Object} move - 移动对象 {row, col, value}
     */
    guess(move) {
      game.guess(move);
      updateStore();
    },

    /**
     * 撤销操作
     */
    undo() {
      game.undo();
      updateStore();
    },

    /**
     * 重做操作
     */
    redo() {
      game.redo();
      updateStore();
    },

    /**
     * 检查是否可以撤销
     * @returns {boolean} 是否可以撤销
     */
    canUndo() {
      return game.canUndo();
    },

    /**
     * 检查是否可以重做
     * @returns {boolean} 是否可以重做
     */
    canRedo() {
      return game.canRedo();
    },

    /**
     * 设置初始网格
     * @param {number[][]} newGrid - 新的初始网格
     */
    setInitialGrid(newGrid) {
      // 更新原始网格值
      originalGridValues = newGrid.map(row => [...row]);
      
      // 创建新的Sudoku和Game
      game = createGame({ sudoku: createSudoku(newGrid) });
      
      updateStore();
    }
  };

  return {
    subscribe,
    ...methods
  };
}

// 导出默认store实例（使用空网格作为初始值）
const emptyGrid = Array(9).fill().map(() => Array(9).fill(0));
export const gameStore = createGameStore(emptyGrid);

// 订阅原始grid store，当它变化时更新gameStore
originalGrid.subscribe(newGrid => {
  gameStore.setInitialGrid(newGrid);
});