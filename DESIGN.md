# 数独游戏领域对象设计与接入方案

## 核心问题回答

### 1. Svelte 的响应式机制如何与领域对象协作？
通过 **Store Adapter 模式**协作：
- `gameStore`（Svelte `writable` store）持有 `Game` / `Sudoku` 领域对象，作为唯一桥梁
- 领域对象是纯 JavaScript 闭包，不依赖 Svelte 运行时
- 每次领域对象状态变化后，store 调用 `set()` 推送新的状态快照
- 组件通过 `$gameStore` 自动订阅，Svelte 在 store 值变化时触发重新渲染

### 2. View 层如何消费 Sudoku / Game？
- View 层**不直接消费** `Sudoku` 或 `Game`，而是消费 `gameStore`
- `gameStore` 暴露响应式状态（grid, originalGrid, invalidCells, won 等）
- View 层通过调用 `gameStore.guess()`、`gameStore.undo()` 等方法间接操作领域对象
- 领域对象始终是单一真源（single source of truth），store 是它的响应式投影

---

## A. 领域对象如何被消费

### 1. View 层直接消费的是什么？
View 层直接消费的是 **`gameStore`**（位于 `src/stores/game.js`），这是一个 Svelte `writable` store 适配器。

- 不是 `Game` 本身——View 层从不直接调用 `game.undo()` 
- 不是 `Sudoku` 本身——View 层从不直接调用 `sudoku.guess()`
- 所有交互都通过 `gameStore` 暴露的接口进行

### 2. View 层拿到的数据是什么？

| 状态 | 类型 | 说明 |
|------|------|------|
| `grid` | `number[][]` | 当前盘面（9x9） |
| `originalGrid` | `number[][]` | 原始题面（用于区分题面数字与用户输入） |
| `invalidCells` | `{row,col}[]` | 违反数独规则的格子坐标 |
| `won` | `boolean` | 是否已通关 |
| `canUndo` | `boolean` | 是否可撤销 |
| `canRedo` | `boolean` | 是否可重做 |

### 3. 用户操作如何进入领域对象？

流程如下：

```
用户点击数字 5
  → Keyboard.svelte 调用 gameStore.guess({ row, col, value: 5 })
    → gameStore 调用 game.guess(move)
      → Game 克隆当前 Sudoku，在新副本上执行 sudoku.guess(move)
        → Sudoku 校验：坐标范围、值域、是否为题面数字
        → Sudoku 修改内部 grid
      → Game 将新 Sudoku 存入历史
    → gameStore 调用 updateStore()
      → 读取 sudoku.getGrid(), sudoku.getOriginalGrid(), sudoku.getConflicts()
      → 调用 store.set() 推送新状态
  → Svelte 检测到 store 变化，重新渲染 Board
```

Undo/Redo 类似：`gameStore.undo()` → `game.undo()` → `updateStore()`

### 4. 领域对象变化后，Svelte 为什么会更新？

关键机制是 **store.set() 触发订阅回调**：

1. `gameStore` 内部使用 Svelte 的 `writable()` 创建 store
2. 每次领域对象操作完成后，`updateStore()` 从领域对象读取最新状态，调用 `set(newState)` 
3. `set()` 会通知所有订阅者（即使用了 `$gameStore` 的组件）
4. Svelte 的 `$store` 语法在组件销毁时会自动取消订阅

伪代码：
```js
const { subscribe, set } = writable(initialState);

function guess(move) {
  game.guess(move);          // 修改领域对象
  updateStore();             // 读取新状态 → set()
}

function updateStore() {
  set({
    grid: game.getSudoku().getGrid(),
    invalidCells: game.getSudoku().getConflicts(),
    won: game.getSudoku().isComplete() && ...,
    ...
  });
}
```

---

## B. 响应式机制说明

### 1. 依赖的 Svelte 机制

本次方案依赖以下 Svelte 3 机制：

- **`writable` store** — `gameStore` 的基础，提供 `subscribe` / `set` / `update`
- **`$store` 自动订阅** — 组件中通过 `$gameStore` 自动订阅和取消订阅
- **赋值检测** — Svelte 通过 `set()` 的赋值操作检测变化，而非深度监听对象内部

我们没有使用 `$:` 响应式语句来驱动状态同步，因为 store 的 `set()` 是显式的、可预测的推送方式，更适合适配器场景。

### 2. 哪些数据是响应式暴露给 UI 的？

| 数据 | 来源 | 用途 |
|------|------|------|
| `grid` | `Sudoku.getGrid()` | Board 渲染盘面 |
| `originalGrid` | `Sudoku.getOriginalGrid()` | 区分题面数字（蓝色）与用户输入（黑色） |
| `invalidCells` | `Sudoku.getConflicts()` | 标记冲突格子（红色高亮） |
| `won` | `isComplete() && 无冲突` | 触发通关弹窗 |
| `canUndo`/`canRedo` | `Game.canUndo()/canRedo()` | 控制 Undo/Redo 按钮的 disabled 状态 |

### 3. 哪些状态留在领域对象内部？

- **完整的历史快照数组** — `Game` 内部维护的 `history` 数组，UI 不需要直接访问
- **历史索引** — `historyIndex` 仅在 `Game` 内部使用
- **每个 Sudoku 的内部 grid 和 givens** — 封装在闭包中，外部只能通过方法访问

### 4. 如果直接 mutate 内部对象，会出现什么问题？

直接修改领域对象内部状态会破坏响应式更新：

- **Svelte 无法检测到变化** — 因为 `writable` store 的值引用没有变，`set()` 从未被调用
- **UI 不刷新** — 例如直接调用 `sudoku.guess(move)` 而不经过 store，grid 确实变了，但 Svelte 不知道要重新渲染
- **历史记录混乱** — 绕过 `Game.guess()` 直接修改盘面会导致 Undo/Redo 状态不一致

我们的方案通过 `updateStore()` 确保每次领域对象变化后都调用 `set()`，从而保证 UI 同步。

---

## C. 改进说明

### 1. 相比 HW1（本轮作业的起点）改进了什么？

| 改进点 | HW1 | 本轮 |
|--------|-----|------|
| **题面保护** | Sudoku 不区分题面数字与用户输入，玩家可修改原始题目数字 | Sudoku 增加 `originalGrid`（givens），`guess()` 会阻止修改题面数字 |
| **单一真源** | `gameStore` 被动订阅旧 `grid` store，开局和胜利走旧路径，形成双真源 | `gameStore` 提供 `startNewGame()`/`startCustomGame()`，成为唯一入口 |
| **冲突检测** | Store 中用错误的算法遍历每个非空格，调用不存在的 `isValid()` 方法，导致全盘标红 | 直接使用 `Sudoku.getConflicts()`，逐格独立检测冲突 |
| **接入范围** | 只有输入和撤销重做通过领域对象，开局和胜利走旧逻辑 | 完整覆盖：开局 → 渲染 → 输入 → 撤销/重做 → 胜利检测 |
| **Game 封装** | `getSudoku()` 返回可变引用，外部可绕过 guess 直接修改 | `getSudoku()` 返回 `clone()`，防止外部篡改 |
| **启动流程** | Welcome.svelte 调用旧 `@sudoku/game` 模块，写入旧 `grid` store，再由订阅同步到 `gameStore` | Welcome.svelte 直接调用 `gameStore.startNewGame()`，避免中间步骤 |

### 2. 为什么 HW1 的接入不足以支撑真实游戏？

HW1 存在两个核心问题：

1. **双真源冲突**：游戏状态同时存在于旧 store 体系和领域对象中，开局和胜利检测走旧路径，领域对象只是"局部替换"，不是真正的单一真源。这导致：
   - 开局时领域对象被旧数据覆盖
   - 胜利检测绕过了领域对象，仍依赖旧 derived store

2. **领域对象职责不足**：`Sudoku` 没有保护题面数字的概念，玩家可以修改原始题目，这违反了数独游戏的核心规则。领域对象连基本的游戏规则都无法保障，说明"领域"还没有真正建立。

### 3. 新设计的 trade-off

- **性能 vs 正确性**：每次 `updateStore()` 调用 `getConflicts()` 遍历所有 81 格，时间复杂度 O(81²) 最坏情况。对 9x9 数独可以忽略不计，但如果未来扩展更大棋盘需要优化增量计算。
- **封装 vs 调试便利性**：领域对象状态完全封装在闭包中，console.log 无法直接查看内部状态。但这也阻止了外部意外篡改。
- **Store 快照大小**：每次 store 更新都传递完整 grid/ originalGrid/invalidCells 数组，而非只传递增量。9x9 网格数据量极小，这是合理简化。
- **与旧系统的兼容**：保留了 `@sudoku/game` 模块的 pause/resume 等生命周期函数，避免全量重构。这意味着新旧两套导入路径并存，但数据流不再交叉。

---

## 四、codex-review.md 中指出的问题及修正

### 问题 1：Svelte 主流程仍由旧状态体系驱动（core）
**修正**：
- 移除 `gameStore` 对旧 `grid` store 的订阅
- `gameStore` 新增 `startNewGame()` / `startCustomGame()` 作为唯一开局入口
- `App.svelte` 改为订阅 `gameStore` 而非旧的 `gameWon` derived store
- `Welcome.svelte` 和 `Dropdown.svelte` 改为调用 `gameStore` 方法

### 问题 2：领域模型无法区分题面数字与玩家输入（core）
**修正**：
- `createSudoku(input, originalGrid)` 新增 `originalGrid` 参数
- `guess()` 在修改题面数字时抛出错误
- `getOriginalGrid()` 暴露题面数据供 UI 渲染区分
- `clone()` 和 `toJSON()` 同步保留题面信息

### 问题 3：冲突检测算法会把整盘已填数字都标成错误（core）
**修正**：
- 移除 store 中错误的遍历和 `isValid()` 调用
- 直接使用 `Sudoku.getConflicts()` — 该方法对每一格独立检查行/列/宫冲突

### 问题 4：Game 泄漏可变内部状态（major）
**修正**：`Game.getSudoku()` 已返回 `clone()`，防止外部直接修改盘面。

### 问题 5：Store Adapter 只覆盖局部交互（major）
**修正**：`gameStore` 现在完整覆盖：开局、输入、撤销/重做、胜利检测。

### 问题 6：公开 API 的输入契约过于宽松（minor）
**修正**：`Sudoku.guess()` 增加值域校验（0-9）和题面数字保护。

---

## 五、架构概览

```
┌─────────────────────────────────────────────────┐
│                  View 层 (Svelte)                │
│  App.svelte  Board  Keyboard  Actions  Welcome   │
│         │  $gameStore.grid   │  gameStore.guess()│
└─────────┼─────────────────────┼───────────────────┘
          │                     │
          ▼                     ▼
┌──────────────────────────────────────────────────┐
│          Store Adapter (src/stores/game.js)       │
│  ┌────────────────────────────────────────────┐  │
│  │  gameStore (writable)                      │  │
│  │  - grid, originalGrid, invalidCells, won   │  │
│  │  - startNewGame, guess, undo, redo         │  │
│  └──────────────┬─────────────────────────────┘  │
└─────────────────┼────────────────────────────────┘
                  │  holds
                  ▼
┌──────────────────────────────────────────────────┐
│        领域层 (src/domain/)                       │
│  ┌──────────┐          ┌──────────────────────┐  │
│  │  Sudoku  │  cloned  │  Game                │  │
│  │  - grid  ├──────────►  - currentSudoku     │  │
│  │  - givens│  into    │  - history[]         │  │
│  │  - guess │  history │  - historyIndex       │  │
│  │  - getConflicts     │  - undo/redo          │  │
│  └──────────┘          └──────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 六、课堂讨论准备

### 1. View 层直接消费的是谁？
`gameStore` — 一个 Svelte `writable` store 适配器，不是 `Game` 也不是 `Sudoku`。

### 2. 为什么 UI 在领域对象变化后会刷新？
`gameStore` 在每次操作后调用 `set()` 推送新的状态对象。Svelte 的 store 订阅机制检测到值引用变化，通知所有使用了 `$gameStore` 的组件重新渲染。

### 3. 响应式边界在哪里？
边界在 `gameStore` 的 `updateStore()` 调用处。`updateStore()` 从领域对象读取数据并调用 `set()` 的瞬间，是响应式"激活"的时刻。在此之前（领域对象内部），一切都是普通 JS 赋值。

### 4. Sudoku / Game 哪些状态对 UI 可见，哪些不可见？
**可见**：grid、originalGrid（通过 getter），getConflicts()、isComplete() 的返回结果。
**不可见**：内部 grid 数组的引用、givens 数组的引用、history 数组、historyIndex。

### 5. 如果将来迁移到 Svelte 5，哪一层最稳定，哪一层最可能改动？
**最稳定**：领域层（`src/domain/`）。纯 JS 闭包，不依赖任何 Svelte 运行时。
**最可能改动**：Store Adapter（`src/stores/game.js`）。Svelte 5 的 runes 体系（`$state`、`$derived`等）可能替代 `writable` store。如果迁移，`createGameStore` 需要重写响应式部分，但接口签名可以保持不变。
