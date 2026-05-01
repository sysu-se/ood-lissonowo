# Homework 2 · 设计演进说明

---

## 基础篇：核心功能与必答问题

### 1. 你如何实现提示功能？

提示功能分为**三个独立等级**，每一级有各自的按钮、次数限制和失败反馈。

#### 第一级：候选数提示（10 次）

用户选中一个空格，点击"候选数"按钮后，系统计算该格当前合法的所有候选数字并填入 note 小格中显示。

底层调用链：
```
UI (Actions.svelte) → gameStore.hintLevel1(row, col) → Game.setNotes(row, col, candidates) → 写入 Game 闭包 _notes
                                                    → Sudoku.getCandidates(row, col)            → 遍历 1-9 逐一 isValidMove
```

约束：
- 用户必须先选中一个空格，否则 `alert('请先选择一个格子')`
- 选中的空格不能是题面数字或已填数字，否则 `alert('该格子无法获取候选数')`
- 次数用完则按钮置灰，不触发逻辑

#### 第二级：跳转到最佳格（5 次）

点击"最佳格"按钮后，系统扫描全盘，找到候选数最少的空格，将光标跳转到该位置。

底层调用链：
```
UI (Actions.svelte) → gameStore.hintLevel2() → Sudoku.findHint() → 扫描全盘返回 { row, col, candidates }
                     → cursor.set(col, row)                             → 光标跳转
```

`findHint()` 按优先级返回：
1. **naked-single**：只有唯一候选数的格子（返回时附带 `value`）
2. **easiest**：候选数最少的格子
3. 盘面已满时返回 `null`

#### 第三级：揭示答案（3 次）

用户选中一个空格，点击"答案"按钮后，系统读取预存的标准答案并直接填入。

底层调用链：
```
UI (Actions.svelte) → gameStore.hintLevel3(row, col) → Sudoku.getCorrectValue(row, col) → 读取 originalSolution
                                                     → Game.clearNotes(row, col)         → 清除该格 notes
                                                     → Game.guess({ row, col, value })   → 填入并记录历史
```

标准答案来自 `createSudoku` 构造时，由 DLX 求解器自动求解并缓存到 `originalSolution`。

#### 次数管理

三个等级的次数**独立计数**（10 / 5 / 3），存储于独立的 Svelte store `src/stores/hintCounts.js`，每次使用对应等级消耗 1 次。开始新游戏或自定义游戏时全部重置。

#### 按钮布局

```
  [候选数 10]  [最佳格 5]  [答案 3]
```

### 2. 你认为提示功能更属于 Sudoku 还是 Game？为什么？

**三个等级的核心计算逻辑属于 `Sudoku`，次数管理属于 Store 层，UI 交互属于组件层。** 这是一个"计算下沉、状态分层"的协作模型。

| 职责 | 归属 | 说明 |
|------|------|------|
| `getCandidates(row, col)` | Sudoku | 纯棋盘逻辑，只依赖 grid |
| `findHint()` | Sudoku | 扫描全盘返回最佳格，纯计算 |
| `getCorrectValue(row, col)` | Sudoku | 读取缓存的 standard answer |
| 次数计数与消耗 | `hintCounts` store | 会话维度，非棋盘属性 |
| 次数重置 | `gameStore` | 与游戏生命周期绑定 |
| 未选中格子弹窗 | `Actions.svelte` | UI 交互 |
| 失败反馈（格子无效等） | `Actions.svelte` | UI 交互 |

理由：
- `getCandidates` 和 `findHint` 只读取 `grid` 和 `givens`，不依赖历史、会话或 UI。它们是自然的棋盘查询，就像 `isValidMove` 一样。
- `getCorrectValue` 读取的是 `originalSolution`——这是 Sudoku 在构造时缓存的不变量，同样属于棋盘层面。
- 提示次数的管理涉及"一局游戏中还剩多少次"，这是游戏会话的概念，不是棋盘的概念。如果将来做持久化存档，提示次数应该跟随 Game 序列化，而非 Sudoku。

### 3. 你如何实现探索模式？

探索模式通过 **Game 内部的状态标记** 实现，核心是在闭包中维护一个 `exploreState` 对象：

```
Game 内部状态：
  NORMAL     → exploreState === null
  EXPLORING  → exploreState !== null
```

```js
exploreState = {
  rootIndex: number,         // 进入探索时的 historyIndex（分支点）
  exploreHistory: Sudoku[],  // 探索期间的盘面快照（独立于主历史）
  failedHashes: Set<string>  // 冲突盘面哈希（失败记忆）
}
```

#### 进入探索

`startExplore()` 保存当前的 `historyIndex` 作为分支点，创建空的 `exploreHistory` 和 `failedHashes` 集合。主历史和 `currentSudoku` 保持不变。

#### 探索期间

`guess(move)` 检测到 `isExploring()` 为 true，走探索分支：
1. `currentSudoku.clone()` → 创建新盘面
2. 应用 move → 写入新盘面
3. 推入 `exploreHistory`
4. 若有冲突 → 将 `getGridHash()` 加入 `failedHashes`

关键约束：
- **主历史保持只读**，不被探索操作修改
- **`undo()` / `redo()` 被禁用**（直接 return），防止探索操作与主历史交叉
- **成功记忆**：`failedHashes` 记录冲突路径，后续可通过 `isFailedState(hash)` 查询

#### 退出探索

三种退出方式：

| 操作 | 行为 | 主历史 | 探索历史 |
|------|------|--------|----------|
| **提交** (`submitExplore`) | 裁剪主历史到 rootIndex，批量追加探索历史 | 线性摊平 | 合并入主历史 |
| **放弃** (`abandonExplore`) | `currentSudoku` 恢复为 `history[rootIndex]` 的克隆 | 不变 | 丢弃 |
| **回溯** (`backtrackExplore`) | 回到分支点，保留 `failedHashes` | 不变 | 清空 |

提交时探索历史被**摊平为线性**追加到主历史末尾，不留分支痕迹。主历史仍然是纯粹的线性快照栈。

### 4. 主局面与探索局面的关系是什么？

**主局面与探索局面是分支-暂存关系：探索期间互不干扰，提交/放弃时统一处理。**

具体机制：

- **隔离**：探索期间所有的 `guess()` 都在独立于主历史的 `exploreHistory` 中进行。主历史中的 `historyIndex` 被冻结。
- **派生**：每次探索 guess 都从 `currentSudoku.clone()` 创建新盘面，逐步累积。这意味着探索路径上的每一步都是**全新副本**，不会污染主历史中的任何快照。
- **深拷贝**：采用"每次 guess 都 clone"的策略。9×9 网格仅 81 个数字，拷贝代价可忽略，但保证了绝对的引用隔离。
- **提交合并**：探索历史被摊平为线性序列，追加到主历史中（裁剪到分支点后）。合并后主历史维持纯线性结构。
- **放弃回滚**：直接丢弃探索历史，将 `currentSudoku` 恢复为分支点状态的克隆。

对比"共享对象"方案：如果探索和主局面共享同一个 grid 引用，放弃时需要"反向回滚"每一步——实现复杂且容易出错。深拷贝方案虽然每次都创建新对象，但语义清晰、回滚简单。

### 5. 你的 history 结构在本次作业中是否发生了变化？

**主历史结构没有变化**，依然是线性快照栈 + historyIndex。探索模式新增了一个**独立于主历史的探索历史**，提交后被摊平回主历史。

```
普通模式（HW1 延续）:
  history: [S0, S1, S2, S3] ← historyIndex = 3

进入探索（rootIndex = 3）:
  主历史:      [S0, S1, S2, S3] ← 冻结
  探索历史:    [E1, E2, E3]    ← 独立增长

提交后（摊平）:
  history: [S0, S1, S2, S3, E1, E2, E3] ← historyIndex = 6

放弃后:
  history: [S0, S1, S2, S3] ← historyIndex = 3（未变）
  currentSudoku = S3.clone()
```

这样设计的理由：
- 主历史保持纯粹的线性结构，Undo/Redo 行为完全不变
- 探索历史独立存在，支持在探索内回溯（backtrackExplore）
- 提交只是批量追加，不需要树状合并语义
- 不引入 DAG 或分支历史，保持简单

**序列化**：`Game.toJSON()` 仅序列化主历史，探索状态不参与持久化。存档/读档时总是回到未在探索中的正常状态。

### 6. Homework 1 中的哪些设计，在 Homework 2 中暴露出了局限？

**（a）history 没有预留"旁路"入口**

HW1 设计假设所有 `guess()` 都推入主历史。HW2 的探索模式需要一个"只读冻结主历史、写入旁路历史"的机制。这要求 Game 的 `guess()` 能感知当前模式并切换写入目标。HW1 的设计没有预留这种模式感知能力，需要在 HW2 中显式添加 `isExploring()` 分支。

**（b）Sudoku 缺乏候选数查询能力**

HW1 的 Sudoku 只提供了 `isValidMove()` 和 `getConflicts()`，但没有组合这两个能力来回答"哪些数是合法的"。`getCandidates()` 需要遍历 1-9 后调用 `isValidMove`，这是 HW1 未覆盖的查询场景。

**（c）求解器与领域对象分离**

HW1 中求解器存在于存储层（通过 `@mattflow/sudoku-solver` 外部包）。HW2 的"正确答案提示"需要一个从求解器到领域对象的通道——如何让 Sudoku 知道某个格子的正确答案？最初考虑过构造参数注入，但最终采用了更根本的方案：**将求解器移入领域层**，自行实现 DLX（Dancing Links + Algorithm X）求解器作为 `src/domain/solver.js`。`createSudoku` 在构造时自动调用求解器缓存答案到 `originalSolution`，`getCorrectValue(row, col)` 直接读取。

**（d）Notes 状态放错了位置**

HW2 最初将 notes 放在 Sudoku 闭包内，认为它与棋盘相关。但在实践中发现：Game 的 `guess()` 每次都通过 `currentSudoku.clone()` 创建新棋盘，而 `clone()` 不复制 notes（设计意图如此），导致**每次填数后所有格子的候选数全部丢失**——不仅仅是当前格。

修正方案：将 `_notes` 状态从 Sudoku 闭包移到 Game 闭包。Notes 是**会话级**临时 UI 状态（而非棋盘级数据），应归属 Game。同时将内部 key 格式统一为 `"col,row"`，与 UI 渲染层保持一致。

### 7. 如果重做一次 Homework 1，你会如何修改原设计？

**（a）在 Sudoku 中提前预留 `getCandidates()`**

`getCandidates` 是 `isValidMove` 的自然衍生——遍历 1-9 逐个调用 `isValidMove` 即可。在 HW1 中加入不到 10 行代码，但能让 HW2 的候选提示功能完全不需要改动 Sudoku 的公共接口。

**（b）在 Game 中引入更清晰的状态枚举**

```js
const GAME_MODE = { NORMAL: 'normal', EXPLORING: 'exploring' };
```

HW1 的 Game 只有隐式的正常状态。如果 HW1 中已有显式的 `mode` 字段，HW2 添加探索模式就只需：
1. 在枚举中加一个值
2. 扩展对应状态下的方法行为
3. `guess()` 中按 mode 分发到不同分支

**（c）在 Sudoku 内部集成求解器**

HW1 中求解器在存储层，领域对象与求解器完全隔离。如果 HW1 的 `createSudoku` 在构造时就自动求解并缓存答案，HW2 添加"正确答案提示"时不需要引入任何新依赖。这也是本次作业中实际采取的最终方案。

**（d）明确区分"棋盘级状态"与"会话级状态"**

最关键的设计教训来自 notes 的归属问题。如果 HW1 就明确：
- **棋盘级**（属于 Sudoku）：`grid`、`givens`、`originalSolution` —— 参与 clone / toJSON
- **会话级**（属于 Game）：`notes`、`history`、`historyIndex`、`exploreState` —— 不参与 clone / toJSON

那么 HW2 添加 notes 时就不会走弯路——把它放在 Game 闭包即可，不会出现任何关于 "clone 不复制 notes" 的争议。

这也揭示了一个核心设计原则：**数据应放在拥有其生命周期的对象中。** Sudoku 的生命周期由 clone 驱动——每次 guess 都创建新对象；Game 的生命周期等于一局游戏——它是稳定的持有者。临时 UI 辅助数据放在生命周期稳定的对象中，语义清晰且不会无故丢失。

---

## 扩展篇：超出作业要求的额外设计

### 三级独立提示系统（加分项：多等级提示）

作业基本要求是"候选提示"和"下一步提示"两种。实际实现将其扩展为**三个独立等级**，每一级有不同的触发条件和使用策略：

| 等级 | 触发条件 | 是否消耗次数 | 是否修改盘面 | 是否修改 notes |
|------|----------|:---:|:---:|:---:|
| L1 候选数 | 选中空格 + 该格有候选数 | 是 | 否 | 是（写入 notes）|
| L2 最佳格 | 盘面存在空格 | 是 | 否（仅移动光标）| 否 |
| L3 答案 | 选中空格 + 有预存答案 | 是 | 是（填入答案）| 是（清除 notes）|

设计决策：
- **L1 只写入 notes 而不填入数字**：用户看到候选数后自行决定填入哪个，保留了推理乐趣
- **L2 只移动光标**：不消耗 L1 或 L3 的宝贵次数，用户可随后自行查看
- **L3 直接填入并记录历史**：相当于一次"代为作答"，参与 Undo/Redo

### Notes 状态的封装与设计修正

#### 第一阶段：封装到领域层

HW1 中候选数（notes）状态完全由外部 `@sudoku/stores/candidates` store 管理，游离于领域层之外。这是设计缺陷——domain 不是单一数据源。

HW2 最初将 `_notes` 添加到 Sudoku 闭包内，提供 `setNotes` / `clearNotes` / `getNotes` / `getAllNotes` 方法，UI 通过 `Game → Sudoku` 透传访问。Notes 不参与 `clone()` 和 `toJSON()`，以保持其为临时 UI 辅助的语义。

#### 第二阶段：发现并修复 bug

在实践中发现了两个关键 bug：

1. **Key 格式不一致**：Sudoku 内部用 `"row,col"`，UI 渲染用 `"col,row"`，导致 L1 提示写入的候选数在棋盘上不可见
2. **guess() 导致 notes 全部丢失**：`guess()` 执行 `currentSudoku = currentSudoku.clone()`，clone 不复制 notes，所以每次填数后所有格子的候选数都被清空

根本原因是**数据放在了错误的对象中**：Sudoku 的生命周期由 clone 管理，而 notes 需要跨 clone 存活。将它放在生命周期稳定的 Game 闭包中，问题自然消失。

#### 第二阶段修正后的数据流

```
UI 层                    Store 层                    Domain 层
──────────────────────────────────────────────────────────────
选空格 + 点候选数  →  gameStore.hintLevel1()  →  Sudoku.getCandidates()  (计算)
                                              →  Game.setNotes()         (写入 _notes)
                                              →  updateStore()           (同步到响应式投影)

Board 渲染         ←  $gameStore.notes        ←  Game.getAllNotes()      (读取 _notes)

键盘输入数字       →  gameStore.guess()        →  Game.guess()            (clone + guess)
                                              →  clearNotes()            (清除该格)
```

关键点：
- Sudoku 回归纯粹的棋盘逻辑（grid 数据 + 校验 + 候选数计算 + 求解）
- Game 管理所有会话级状态（当前盘面 + 历史 + notes + 探索状态）
- Store 是 Game 的响应式投影，不做业务判断

### 探索模式中的冲突记忆

探索模式不仅支持分支与回溯，还通过 `failedHashes: Set<string>` 记录冲突路径。当用户在探索中走入一个产生冲突的盘面，该盘面的哈希被记录。后续探索中如果再次到达同一哈希状态，可通过 `isFailedState(hash)` 提前识别并警告。这是对"探索失败记忆"要求的实现。

---

## 总结：设计演进的核心教训

| 教训 | 来源 |
|------|------|
| 数据应放在拥有其生命周期的对象中 | Notes 从 Sudoku 迁移到 Game |
| 纯计算逻辑应下沉到领域对象 | `getCandidates` / `findHint` 归属 Sudoku |
| 显式状态枚举比隐式 null 检查更可扩展 | `exploreState === null` → `GAME_MODE.NORMAL` |
| 求解器集成到领域层比外部注入更简洁 | DLX solver → `originalSolution` 缓存 |
| UI 层只做渲染和交互判断，不做业务逻辑 | 三级提示按钮的置灰/弹窗判断 |
