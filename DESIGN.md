# 数独游戏领域对象设计与接入方案

## 核心问题回答

### 1. Svelte 的响应式机制如何与领域对象协作？
- **Store 作为桥梁**: 使用 `writable` store 创建 `gameStore`，作为领域对象和 UI 之间的适配器
- **状态同步**: 当领域对象状态变化时，通过 `set()` 方法更新 store 状态
- **自动订阅**: UI 组件使用 `$gameStore` 语法自动订阅 store 变化
- **触发更新**: Svelte 检测到 store 状态变化后，自动重新渲染相关组件

### 2. View 层如何消费 Sudoku / Game？
- **数据消费**: View 层通过 `$gameStore.grid` 等响应式状态获取数独数据
- **操作调用**: View 层通过 `gameStore.guess()`, `gameStore.undo()`, `gameStore.redo()` 等方法操作领域对象
- **状态反馈**: View 层通过 `$gameStore.canUndo`, `$gameStore.canRedo` 等状态控制 UI 元素状态
- **视觉区分**: View 层根据 `$gameStore.originalGrid` 区分原始数字和用户输入的数字

## 关于 Svelte 响应式机制的理解

### 1. 为什么修改对象内部字段后，界面不一定自动更新？
- Svelte 的响应式系统基于赋值操作检测变化
- 直接修改对象内部字段不会触发赋值操作，因此 Svelte 不会检测到变化

### 2. 为什么直接改二维数组元素，有时 Svelte 不会按预期刷新？
- 二维数组是引用类型，直接修改数组元素不会改变数组的引用
- Svelte 只检测引用变化，不检测内部元素变化

### 3. 为什么 store 可以被 $store 消费？
- Svelte 提供了 ` 语法糖，自动订阅 store 的变化
- 当 store 状态变化时，Svelte 会自动更新使用 `$store` 的组件

### 4. 为什么 $: 有时会更新，有时不会更新？
- `$:` 语句依赖于其引用的响应式变量
- 只有当依赖的响应式变量发生变化时，`$:` 语句才会执行

### 5. 为什么“间接依赖”可能导致 reactive statement 不触发？
- Svelte 的响应式系统只追踪直接引用的变量
- 如果通过函数调用或其他间接方式访问变量，Svelte 可能无法追踪到依赖关系

## 一、领域对象设计

### 1. Sudoku 领域对象

#### 职责
- 持有当前数独网格数据
- 提供 `guess(...)` 接口用于输入数字
- 提供校验能力（`isValid()` 和 `isComplete()`）
- 提供外表化能力（`toString()` 和 `toJSON()`）
- 支持 Undo / Redo 所需的状态克隆（`clone()`）

#### 改进
- 增加了 `isValid()` 方法，用于检查数独的有效性
- 增加了 `isComplete()` 方法，用于检查数独是否完成
- 确保所有方法都返回深拷贝，避免外部修改内部状态

### 2. Game 领域对象

#### 职责
- 持有当前 `Sudoku` 对象
- 管理历史记录，支持 Undo / Redo
- 提供 `guess()`, `undo()`, `redo()` 方法
- 提供 `canUndo()` 和 `canRedo()` 方法，用于 UI 状态控制

#### 改进
- 改进了历史记录的管理方式，使用数组存储历史快照
- 确保每次操作都创建新的 Sudoku 实例，避免状态污染
- 提供了完整的 JSON 序列化和反序列化支持
- 增加了内部属性的访问器（getter/setter），支持 gameStore 更新初始网格和反序列化操作
- 修复了反序列化逻辑：使用 `splice(0)` 清空数组而非重新赋值，避免只读属性报错

## 二、Svelte 接入方案

### 1. Store Adapter 设计

采用 **Store Adapter** 模式，创建 `gameStore` 作为领域对象和 UI 之间的桥梁。

#### 核心功能
- 内部持有 `Game` 实例
- 对外暴露可被 Svelte 消费的响应式状态
- 对外暴露 UI 可调用的方法
- 订阅原始 `grid` store，自动同步初始网格

#### 响应式状态
- `grid`: 当前数独网格
- `originalGrid`: 初始数独网格，用于区分原始数字和用户输入
- `invalidCells`: 无效单元格列表
- `won`: 游戏是否获胜
- `canUndo`: 是否可以撤销
- `canRedo`: 是否可以重做

#### 对外方法
- `guess(move)`: 进行猜测
- `undo()`: 撤销操作
- `redo()`: 重做操作
- `canUndo()`: 检查是否可以撤销
- `canRedo()`: 检查是否可以重做
- `setInitialGrid(newGrid)`: 设置初始网格

### 2. 组件接入

#### Board 组件
- 从 `gameStore` 订阅 `grid`, `originalGrid` 和 `invalidCells`
- 使用 `$gameStore.grid` 渲染数独网格
- 使用 `$gameStore.invalidCells` 标记无效单元格
- 根据 `$gameStore.originalGrid` 区分原始数字和用户输入的数字

#### Keyboard 组件
- 当用户点击数字按钮时，调用 `gameStore.guess()`
- 传递当前光标位置和输入值

#### ActionBar 组件
- 当用户点击 Undo 按钮时，调用 `gameStore.undo()`
- 当用户点击 Redo 按钮时，调用 `gameStore.redo()`
- 根据 `$gameStore.canUndo` 和 `$gameStore.canRedo` 控制按钮状态

## 三、响应式机制说明

### 1. 依赖的 Svelte 机制
- **Store**: 使用 `writable` store 存储响应式状态
- **$store**: 使用 Svelte 的自动订阅语法消费 store
- **重新赋值**: 当领域对象状态变化时，通过 `set()` 方法更新 store 状态
- **订阅机制**: 订阅原始 `grid` store，自动同步初始网格

### 2. 响应式数据流
1. 用户在 UI 上进行操作（点击数字、Undo/Redo）
2. 组件调用 `gameStore` 暴露的方法
3. `gameStore` 内部调用领域对象的方法
4. 领域对象状态变化后，`gameStore` 更新响应式状态
5. Svelte 自动检测到状态变化，更新 UI

### 3. 为什么直接 mutate 对象会有问题
- Svelte 的响应式系统依赖于赋值操作来检测变化
- 如果直接修改对象内部字段，Svelte 不会检测到变化
- 因此，我们在 `gameStore` 中使用 `set()` 方法重新赋值，确保 Svelte 能够检测到状态变化

## 四、改进说明

### 1. 相比 HW1 的改进
- **增加了校验功能**: Sudoku 对象现在可以检查数独的有效性和完整性
- **改进了历史管理**: Game 对象的历史记录管理更加清晰
- **实现了 Store Adapter**: 创建了 `gameStore` 作为领域对象和 UI 之间的桥梁
- **真正接入 UI**: 所有主要操作都通过领域对象完成，而不是直接操作数组
- **支持初始网格同步**: 订阅原始 `grid` store，自动同步初始网格

### 2. HW1 不足的原因
- HW1 中的领域对象虽然设计合理，但没有真正接入 UI
- UI 仍然直接操作数组，领域对象只在测试中使用
- 缺少响应式机制，无法自动更新 UI
- 缺少初始网格同步机制，无法正确显示原始数字

### 3. 设计权衡
- **性能 vs. 正确性**: 每次操作都创建新的 Sudoku 实例，确保状态隔离，但会增加内存使用
- **封装 vs. 灵活性**: 领域对象封装了核心逻辑，UI 只通过 store 接口操作，提高了可维护性，但减少了直接访问内部状态的灵活性
- **复杂度 vs. 可测试性**: 增加了 store 层，增加了系统复杂度，但提高了可测试性
- **兼容性 vs. 侵入性**: 订阅原始 `grid` store 确保兼容性，但增加了一定的侵入性
- **只读属性 vs. 可修改性**: 使用 getter 暴露 `history` 数组提供封装，但需要通过 `splice` 等方法原地修改，增加了代码复杂度

## 五、技术细节：只读属性与数组操作

### 1. 问题背景
在实现 `createGameFromJSON` 反序列化功能时，遇到了一个技术问题：
```javascript
// 错误做法
game.history = []; // TypeError: Cannot set property history of #<Object> which has only a getter
```

### 2. 原因分析
- `history` 在 Game 对象中定义为只读 getter：`get history() { return history; }`
- JavaScript 的 getter 默认没有 setter，因此无法重新赋值
- 这是有意设计的封装：防止外部直接替换整个数组，但允许修改数组内容

### 3. 解决方案
使用数组的 `splice` 方法原地清空数组，而不是重新赋值：
```javascript
// 正确做法
game.history.splice(0); // 清空数组，保留引用
```

### 4. 设计意义
- **封装性**: 外部无法替换整个 `history` 数组，确保数据一致性
- **灵活性**: 外部可以修改数组内容（push、splice 等），满足反序列化需求
- **安全性**: 防止意外替换整个历史记录，避免状态混乱

## 六、结论

通过本次改进，我们成功将领域对象真正接入了 Svelte 游戏流程，实现了：

1. **领域对象驱动**: 所有核心逻辑都由 `Sudoku` 和 `Game` 领域对象处理
2. **响应式更新**: UI 能够自动响应领域对象的状态变化
3. **清晰的职责边界**: 领域对象负责业务逻辑，UI 负责展示和用户交互
4. **可测试性**: 领域对象可以独立测试，不依赖于 UI
5. **完整的游戏流程**: 支持从欢迎界面选择难度，到加载初始棋盘，再到游戏过程中的各种操作
6. **健壮的序列化**: 正确处理了只读属性的限制，确保反序列化功能正常工作

这种设计方案不仅满足了本次作业的要求，也为将来的功能扩展和维护奠定了良好的基础。