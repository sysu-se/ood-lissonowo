/**
 * 舞蹈链（Dancing Links + Algorithm X）数独求解器
 *
 * 精确覆盖建模：
 * 数独转化为 324 列的精确覆盖问题：
 *   - 列  0-80:   格约束（每格恰好一个数字）
 *   - 列 81-161:  行-数约束（每行每个数字恰好出现一次）
 *   - 列 162-242: 列-数约束（每列每个数字恰好出现一次）
 *   - 列 243-323: 宫-数约束（每宫每个数字恰好出现一次）
 *
 * 每行对应 (row, col, value) 的三元组，在 4 个约束列上各有一个 1。
 *
 * 搜索策略：MRV（Minimum Remaining Values），每次选择分支最少的列。
 *
 * 参考：Knuth, Donald E. "Dancing links." 2000.
 */

const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;
const COL_COUNT = 324; // 81 + 81 + 81 + 81

/**
 * 创建链表节点
 */
function createNode() {
  return { left: null, right: null, up: null, down: null, col: null, rowId: -1 };
}

/**
 * 使用 DLX 求解数独
 * @param {number[][]} grid - 9x9 数独网格（0 表示空格）
 * @returns {number[][]|null} 完整解，无解返回 null
 */
export function solveSudoku(grid) {
  // ── 1. 初始化链表根节点和列头 ──
  const root = createNode();
  root.left = root;
  root.right = root;

  const headers = [];
  for (let i = 0; i < COL_COUNT; i++) {
    const col = createNode();
    col.col = col;    // 列头 col 指向自身
    col.size = 0;
    col.name = i;
    col.up = col;
    col.down = col;

    // 将列头插入水平循环链表（root 右侧）
    col.left = root.left;
    col.right = root;
    root.left.right = col;
    root.left = col;

    headers.push(col);
  }

  // ── 2. 构建精确覆盖矩阵的行 ──
  // solutionRows: 题面已填数字（每个格子只有一行）
  // candidateRows: 空格候选（每个格子 9 行）
  const allRows = [];

  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      const val = grid[r][c];
      const boxIdx = Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE);

      if (val !== 0) {
        allRows.push({
          cols: [
            r * 9 + c,
            81 + r * 9 + (val - 1),
            162 + c * 9 + (val - 1),
            243 + boxIdx * 9 + (val - 1)
          ],
          rowId: r * 81 + c * 9 + (val - 1)
        });
      } else {
        for (let v = 1; v <= 9; v++) {
          allRows.push({
            cols: [
              r * 9 + c,
              81 + r * 9 + (v - 1),
              162 + c * 9 + (v - 1),
              243 + boxIdx * 9 + (v - 1)
            ],
            rowId: r * 81 + c * 9 + (v - 1)
          });
        }
      }
    }
  }

  // ── 3. 将所有行插入链表 ──
  for (const { cols, rowId } of allRows) {
    // 为该行的每个列创建节点
    const nodes = cols.map(ci => {
      const n = createNode();
      n.col = headers[ci];
      n.rowId = rowId;
      return n;
    });

    // 水平链接（循环链表）
    const len = nodes.length;
    for (let i = 0; i < len; i++) {
      nodes[i].left = nodes[(i + len - 1) % len];
      nodes[i].right = nodes[(i + 1) % len];
    }

    // 垂直插入到各列
    for (const n of nodes) {
      const col = n.col;
      n.down = col;
      n.up = col.up;
      col.up.down = n;
      col.up = n;
      col.size++;
    }
  }

  // ── 4. Algorithm X ──

  /**
   * 从矩阵中移除一列及其关联行
   */
  function cover(col) {
    col.right.left = col.left;
    col.left.right = col.right;
    for (let row = col.down; row !== col; row = row.down) {
      for (let node = row.right; node !== row; node = node.right) {
        node.down.up = node.up;
        node.up.down = node.down;
        node.col.size--;
      }
    }
  }

  /**
   * 恢复一列（与 cover 顺序相反）
   */
  function uncover(col) {
    for (let row = col.up; row !== col; row = row.up) {
      for (let node = row.left; node !== row; node = node.left) {
        node.col.size++;
        node.down.up = node;
        node.up.down = node;
      }
    }
    col.right.left = col;
    col.left.right = col;
  }

  const solutionRowIds = [];

  function search() {
    if (root.right === root) return true; // 所有列已覆盖，找到解

    // MRV：选择分支最少的列
    let minCol = root.right;
    for (let col = root.right; col !== root; col = col.right) {
      if (col.size < minCol.size) minCol = col;
    }

    if (minCol.size === 0) return false; // 当前列无可行行，回溯

    cover(minCol);

    for (let row = minCol.down; row !== minCol; row = row.down) {
      solutionRowIds.push(row.rowId);

      for (let node = row.right; node !== row; node = node.right) {
        cover(node.col);
      }

      if (search()) return true;

      for (let node = row.left; node !== row; node = node.left) {
        uncover(node.col);
      }

      solutionRowIds.pop();
    }

    uncover(minCol);
    return false;
  }

  const found = search();
  if (!found) return null;

  // ── 5. 将 rowId 解码为 9x9 网格 ──
  const result = Array.from({ length: SUDOKU_SIZE }, () => Array(SUDOKU_SIZE).fill(0));
  for (const id of solutionRowIds) {
    const r = Math.floor(id / 81);
    const c = Math.floor((id % 81) / 9);
    const v = (id % 9) + 1;
    result[r][c] = v;
  }

  return result;
}