/**
 * Sudoku 领域对象
 * 表示当前数独局面，管理grid数据和相关操作
 */

const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

/**
 * 创建Sudoku对象
 * @param {number[][]} input - 9x9的数独网格
 * @returns {Sudoku} Sudoku对象
 */
export function createSudoku(input) {
  // 深拷贝输入网格，避免外部引用
  const grid = input.map(row => [...row]);

  /**
   * 获取当前网格
   * @returns {number[][]} 9x9的数独网格
   */
  function getGrid() {
    // 返回网格的深拷贝，避免外部修改
    return grid.map(row => [...row]);
  }

  /**
   * 进行猜测
   * @param {Object} move - 移动对象 {row, col, value}
   */
  function guess(move) {
    const { row, col, value } = move;
    if (row >= 0 && row < SUDOKU_SIZE && col >= 0 && col < SUDOKU_SIZE) {
      grid[row][col] = value;
    }
  }

  /**
   * 克隆Sudoku对象
   * @returns {Sudoku} 新的Sudoku对象
   */
  function clone() {
    return createSudoku(getGrid());
  }

  /**
   * 转换为JSON
   * @returns {number[][]} 数独网格的JSON表示
   */
  function toJSON() {
    return getGrid();
  }

  /**
   * 转换为字符串
   * @returns {string} 数独网格的字符串表示
   */
  function toString() {
    return grid.map(row => row.join(' ')).join('\n');
  }

  /**
   * 检查数独是否有效
   * @returns {boolean} 是否有效
   */
  function isValid() {
    // 检查行
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      const seen = new Set();
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        const value = grid[row][col];
        if (value !== 0 && seen.has(value)) {
          return false;
        }
        seen.add(value);
      }
    }

    // 检查列
    for (let col = 0; col < SUDOKU_SIZE; col++) {
      const seen = new Set();
      for (let row = 0; row < SUDOKU_SIZE; row++) {
        const value = grid[row][col];
        if (value !== 0 && seen.has(value)) {
          return false;
        }
        seen.add(value);
      }
    }

    // 检查3x3宫格
    for (let boxRow = 0; boxRow < BOX_SIZE; boxRow++) {
      for (let boxCol = 0; boxCol < BOX_SIZE; boxCol++) {
        const seen = new Set();
        for (let row = boxRow * BOX_SIZE; row < (boxRow + 1) * BOX_SIZE; row++) {
          for (let col = boxCol * BOX_SIZE; col < (boxCol + 1) * BOX_SIZE; col++) {
            const value = grid[row][col];
            if (value !== 0 && seen.has(value)) {
              return false;
            }
            seen.add(value);
          }
        }
      }
    }

    return true;
  }

  /**
   * 检查数独是否完成
   * @returns {boolean} 是否完成
   */
  function isComplete() {
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        if (grid[row][col] === 0) {
          return false;
        }
      }
    }
    return isValid();
  }

  return {
    getGrid,
    guess,
    clone,
    toJSON,
    toString,
    isValid,
    isComplete
  };
}

/**
 * 从JSON创建Sudoku对象
 * @param {number[][]} json - 数独网格的JSON表示
 * @returns {Sudoku} Sudoku对象
 */
export function createSudokuFromJSON(json) {
  return createSudoku(json);
}