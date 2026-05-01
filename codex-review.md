# con-oo-lissonowo-2 - Review

## Review 结论

代码已经开始把 `Sudoku`/`Game` 接到界面上，但目前仍是局部接入而不是单一真源驱动。最主要的问题是：Svelte 主流程仍混用旧 store 与新领域对象，数独核心业务规则没有被对象模型真正承载，`Game` 的封装边界也比较松散，因此整体设计质量只能算中下。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. Svelte 主流程仍由旧状态体系驱动

- 严重程度：core
- 位置：src/App.svelte:4-16; src/components/Modal/Types/Welcome.svelte:3-23; src/stores/game.js:128-130
- 原因：开局通过 `@sudoku/game` 改写旧 `grid` store，`gameStore` 只是被动订阅后重建；通关判定仍订阅旧 `gameWon`。棋盘输入和撤销重做走的是 `gameStore`，开局和胜利却走旧 store，形成双真源，领域对象没有真正成为游戏流程核心。

### 2. 领域模型无法区分题面数字与玩家输入

- 严重程度：core
- 位置：src/domain/sudoku.js:14-35; src/components/Controls/Keyboard.svelte:24-29
- 原因：`Sudoku` 只保存当前 grid，`guess()` 本质是裸写数组，模型中没有“givens/题目给定数字”的概念；键盘输入也没有基于 `originalGrid` 阻止覆盖题面数字。结果是玩家可以修改题目原始数字，这违背了数独游戏的核心业务规则。

### 3. 冲突检测算法会把整盘已填数字都标成错误

- 严重程度：core
- 位置：src/stores/game.js:27-57
- 原因：`updateStore()` 对每个非 0 单元格都重建整盘后调用一次全局 `isValid()`。只要棋盘任意位置存在冲突，这次全局校验就会失败，于是当前遍历到的每个非 0 单元格都会被加入 `invalidCells`，而不是只标记真正冲突的格子。

### 4. Game 泄漏可变内部状态，破坏聚合边界

- 严重程度：major
- 位置：src/domain/game.js:26-28; src/domain/game.js:99-114; src/domain/game.js:123-139
- 原因：`getSudoku()` 返回的是可变的 live `Sudoku`，同时对象还暴露了 `currentSudoku/history/historyIndex` 的访问器供外部直接改写。Undo/Redo 的正确性因此依赖调用方自律，`createGameFromJSON()` 也只能绕过封装去拼装内部状态，OOD 边界比较脆弱。

### 5. Store Adapter 只覆盖局部交互，没有收敛成完整应用服务

- 严重程度：major
- 位置：src/stores/game.js:10-25; src/stores/game.js:61-115
- 原因：`gameStore` 负责了棋盘快照、输入和撤销重做，但暂停、开局、胜利、提示等游戏用例仍分散在旧 store 或组件里。这样适配层更像“局部状态投影”，而不是 UI 唯一调用的应用入口，导致领域对象接入不完整。

### 6. 公开 API 的输入契约过于宽松

- 严重程度：minor
- 位置：src/domain/sudoku.js:31-35; src/domain/sudoku.js:66-107
- 原因：`guess()` 只检查坐标范围，不检查 `move` 结构和值域，也不会对非法输入抛出明确错误；`isValid()` 也默认接受任意非 0 数字。对公开领域 API 来说，这不太符合常见 JS 生态里“尽早暴露错误”的习惯。

## 优点

### 1. 对网格做了防御性拷贝

- 位置：src/domain/sudoku.js:15-24
- 原因：创建对象时复制输入，`getGrid()` 也返回深拷贝，避免了外部直接拿到内部二维数组后篡改状态，这是领域对象封装里比较扎实的一步。

### 2. Undo/Redo 的基本快照推进逻辑清晰

- 位置：src/domain/game.js:18-20; src/domain/game.js:35-40
- 原因：初始化时保存首个快照，`guess()` 会在新分支出现时清理 redo 尾巴，并通过 clone 后再写入新状态，基本历史语义是成立的。

### 3. 采用了 Store Adapter 思路桥接领域对象与 Svelte

- 位置：src/stores/game.js:17-25; src/stores/game.js:50-57
- 原因：用 `writable` 包装 `Game`，对外暴露 `grid`、`canUndo`、`canRedo` 等响应式状态，这个方向符合题目推荐的 Svelte 接入方式。

### 4. 棋盘渲染、输入和撤销重做已经接到了新 store

- 位置：src/components/Board/index.svelte:49-60; src/components/Controls/Keyboard.svelte:24-29; src/components/Controls/ActionBar/Actions.svelte:23-29
- 原因：Board 从 `$gameStore.grid` 渲染，Keyboard 调 `gameStore.guess()`，ActionBar 调 `gameStore.undo()/redo()`，说明核心交互至少不再直接改旧二维数组。

## 补充说明

- 本次结论仅基于静态阅读 `src/domain/*` 及其关联的 Svelte 接入代码，未运行测试，也未实际启动界面。
- 关于“通关弹窗不会由当前领域对象状态驱动”的判断，来自静态追踪：`App.svelte` 订阅的是旧 `gameWon`，而用户输入路径写入的是 `src/stores/game.js` 中的 `gameStore`。
- 关于 `invalidCells` 会过度标红的判断，来自对 `src/stores/game.js` 中 `updateStore()` 算法的静态推演，而非运行时截图验证。
- 评审范围已限制在 `src/domain/*` 及其对 Svelte 的接入点，没有扩展评价无关目录。
