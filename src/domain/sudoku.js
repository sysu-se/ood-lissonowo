/**
 * Sudoku 领域对象
 * 表示当前数独局面，管理 grid 数据、局面校验与外表化
 *
 * 职责边界：
 * - 持有 9x9 网格数据（闭包内私有）
 * - 提供 guess() 进行数字填充
 * - 提供 isValidMove() / isComplete() / getConflicts() 局面校验
 * - 提供 clone() 深拷贝
 * - 提供 toJSON() / toString() 外表化
 */

const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

/**
 * 校验输入是否为合法的 9x9 网格
 */
function isValidGrid(input) {
  if (!Array.isArray(input) || input.length !== SUDOKU_SIZE) return false;
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    if (!Array.isArray(input[r]) || input[r].length !== SUDOKU_SIZE) return false;
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      if (!Number.isInteger(input[r][c]) || input[r][c] < 0 || input[r][c] > 9) {
        return false;
      }
    }
  }
  return true;
}

/**
 * 创建 Sudoku 对象
 * @param {number[][]} input - 9x9 数独网格（0 表示空格）
 * @param {number[][]} [originalGrid] - 原始题面网格（用于标记题面数字，不传则 input 即为题面）
 * @returns {Sudoku} Sudoku 对象
 */
export function createSudoku(input, originalGrid) {
  if (!isValidGrid(input)) {
    throw new Error('Invalid sudoku grid: must be a 9x9 array of integers 0-9');
  }

  // 深拷贝输入，避免外部引用
  const grid = input.map(row => [...row]);

  // 题面数字：标记哪些格子是初始给定的（不可修改）
  const givens = originalGrid
    ? originalGrid.map(row => [...row])
    : input.map(row => [...row]);

  // 验证 givens 合法性
  if (!isValidGrid(givens)) {
    throw new Error('Invalid originalGrid: must be a 9x9 array of integers 0-9');
  }

  /**
   * 获取当前网格的深拷贝
   * @returns {number[][]} 9x9 网格
   */
  function getGrid() {
    return grid.map(row => [...row]);
  }

  /**
   * 获取原始题面网格的深拷贝
   * @returns {number[][]} 9x9 网格
   */
  function getOriginalGrid() {
    return givens.map(row => [...row]);
  }

  /**
   * 检查指定位置是否为题面数字（不可修改）
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  function isGiven(row, col) {
    return givens[row][col] !== 0;
  }

  /**
   * 在指定位置填入数字
   * @param {Object} move - { row, col, value }
   */
  function guess(move) {
    const { row, col, value } = move;

    if (row < 0 || row >= SUDOKU_SIZE || col < 0 || col >= SUDOKU_SIZE) {
      throw new Error(`Invalid position: row=${row}, col=${col}`);
    }
    if (!Number.isInteger(value) || value < 0 || value > 9) {
      throw new Error(`Invalid value: ${value}. Must be 0-9.`);
    }
    if (isGiven(row, col)) {
      throw new Error(`Cannot modify given cell at row=${row}, col=${col}`);
    }

    grid[row][col] = value;
  }

  /**
   * 检查在某位置放置某值是否违反数独规则
   * @param {Object} move - { row, col, value }
   * @returns {boolean} 是否合法
   */
  function isValidMove(move) {
    const { row, col, value } = move;

    if (value === 0) return true; // 清空格子总是合法
    if (value < 1 || value > 9) return false;
    if (row < 0 || row >= SUDOKU_SIZE || col < 0 || col >= SUDOKU_SIZE) return false;

    // 检查行
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      if (c !== col && grid[row][c] === value) return false;
    }

    // 检查列
    for (let r = 0; r < SUDOKU_SIZE; r++) {
      if (r !== row && grid[r][col] === value) return false;
    }

    // 检查 3x3 宫
    const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
    const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
    for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
      for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
        if ((r !== row || c !== col) && grid[r][c] === value) return false;
      }
    }

    return true;
  }

  /**
   * 判断数独是否已完成（所有格子已填）
   * @returns {boolean}
   */
  function isComplete() {
    for (let r = 0; r < SUDOKU_SIZE; r++) {
      for (let c = 0; c < SUDOKU_SIZE; c++) {
        if (grid[r][c] === 0) return false;
      }
    }
    return true;
  }

  /**
   * 获取所有冲突格子的坐标
   * @returns {Array<{row: number, col: number}>}
   */
  function getConflicts() {
    const conflictSet = new Set();

    for (let row = 0; row < SUDOKU_SIZE; row++) {
      for (let col = 0; col < SUDOKU_SIZE; col++) {
        const val = grid[row][col];
        if (val === 0) continue;

        let hasConflict = false;

        // 检查行
        for (let c = 0; c < SUDOKU_SIZE && !hasConflict; c++) {
          if (c !== col && grid[row][c] === val) hasConflict = true;
        }

        // 检查列
        for (let r = 0; r < SUDOKU_SIZE && !hasConflict; r++) {
          if (r !== row && grid[r][col] === val) hasConflict = true;
        }

        // 检查宫
        const br = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const bc = Math.floor(col / BOX_SIZE) * BOX_SIZE;
        for (let r = br; r < br + BOX_SIZE && !hasConflict; r++) {
          for (let c = bc; c < bc + BOX_SIZE && !hasConflict; c++) {
            if ((r !== row || c !== col) && grid[r][c] === val) hasConflict = true;
          }
        }

        if (hasConflict) conflictSet.add(`${row},${col}`);
      }
    }

    return [...conflictSet].map(key => {
      const [r, c] = key.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  /**
   * 深拷贝当前 Sudoku（保留题面信息）
   * @returns {Sudoku} 新的独立 Sudoku 对象
   */
  function clone() {
    return createSudoku(grid, givens);
  }

  /**
   * 序列化为 JSON（返回纯数据）
   * @returns {Object} { grid, originalGrid }
   */
  function toJSON() {
    return {
      grid: getGrid(),
      originalGrid: getOriginalGrid()
    };
  }

  /**
   * 外表化：带边框的易读格式
   * @returns {string}
   */
  function toString() {
    let result = '';
    for (let r = 0; r < SUDOKU_SIZE; r++) {
      if (r % BOX_SIZE === 0 && r !== 0) {
        result += '──────┼───────┼──────\n';
      }
      for (let c = 0; c < SUDOKU_SIZE; c++) {
        if (c % BOX_SIZE === 0 && c !== 0) {
          result += '│ ';
        }
        result += (grid[r][c] === 0 ? '.' : grid[r][c]) + ' ';
      }
      result += '\n';
    }
    return result.trimEnd();
  }

  return {
    getGrid,
    getOriginalGrid,
    isGiven,
    guess,
    isValidMove,
    isComplete,
    getConflicts,
    clone,
    toJSON,
    toString
  };
}

/**
 * 从 JSON 创建 Sudoku 对象
 * @param {Object|number[][]} json - 网格数据或 { grid, originalGrid } 对象
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  if (Array.isArray(json)) {
    // 兼容旧格式：纯数组
    return createSudoku(json);
  }
  return createSudoku(json.grid, json.originalGrid);
}
