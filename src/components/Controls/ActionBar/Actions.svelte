<script>
<<<<<<< HEAD
        import { cursor } from '@sudoku/stores/cursor';
    import { notes } from '@sudoku/stores/notes';
    import { gamePaused } from '@sudoku/stores/game';
    import { gameStore } from '../../../stores/game';
    import { hintCounts } from '../../../stores/hintCounts';

    function handleUndo() { gameStore.undo(); }
    function handleRedo() { gameStore.redo(); }
    function handleExplore() { gameStore.startExplore(); }
    function handleBacktrack() { gameStore.backtrackExplore(); }
    function handleSubmit() { gameStore.submitExplore(); }
    function handleAbandon() { gameStore.abandonExplore(); }

    /** 第一级：候选数提示 */
    function handleLevel1() {
        if ($cursor.x === null || $cursor.y === null) {
            alert('请先选择一个格子');
            return;
        }
        if ($hintCounts.level1 === 0) return;
        const row = $cursor.y;
        const col = $cursor.x;
        const result = gameStore.hintLevel1(row, col);
        if (!result) {
            alert('该格子无法获取候选数（可能是题面数字或已填入数字）');
        }
    }

    /** 第二级：跳转到候选数最少的格子 */
    function handleLevel2() {
        if ($hintCounts.level2 === 0) return;
        const result = gameStore.hintLevel2();
        if (!result) return;
        cursor.set(result.col, result.row);
    }

    /** 第三级：直接给出答案 */
    function handleLevel3() {
        if ($cursor.x === null || $cursor.y === null) {
            alert('请先选择一个格子');
            return;
        }
        if ($hintCounts.level3 === 0) return;
        const row = $cursor.y;
        const col = $cursor.x;
        const result = gameStore.hintLevel3(row, col);
        if (!result) {
            alert('无法获取答案（可能是题面数字或该格已有数字）');
        }
    }
=======
	import { candidates } from '@sudoku/stores/candidates';
	import { userGrid } from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { hints } from '@sudoku/stores/hints';
	import { notes } from '@sudoku/stores/notes';
	import { settings } from '@sudoku/stores/settings';
	import { keyboardDisabled } from '@sudoku/stores/keyboard';
	import { gamePaused } from '@sudoku/stores/game';

	$: hintsAvailable = $hints > 0;

	function handleHint() {
		if (hintsAvailable) {
			if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
				candidates.clear($cursor);
			}

			userGrid.applyHint($cursor);
		}
	}
>>>>>>> 365567dd4a2f23598b6ca5ffd7ffba29adcb07e8
</script>

<div class="action-buttons space-x-3">

<<<<<<< HEAD
    <!-- 撤销 / 重做（探索模式下操作探索历史，普通模式下操作主历史） -->
    <button class="btn btn-round" disabled={$gamePaused || !$gameStore.canUndo} title="Undo" on:click={handleUndo}>
        <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
    </button>

    <button class="btn btn-round" disabled={$gamePaused || !$gameStore.canRedo} title="Redo" on:click={handleRedo}>
        <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
        </svg>
    </button>

    {#if $gameStore.isExploring}
        <!-- 探索模式专用操作 -->
        <span class="explore-badge">探索</span>

        <button class="btn btn-round"
                disabled={!$gameStore.canBacktrack}
                title="回溯到分支点"
                on:click={handleBacktrack}>
            <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
        </button>

        <button class="btn btn-round btn-submit"
                title="提交探索结果"
                on:click={handleSubmit}>
            <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
        </button>

        <button class="btn btn-round btn-abandon"
                title="放弃探索"
                on:click={handleAbandon}>
            <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    {:else}
        <!-- 进入探索 -->
        <button class="btn btn-round"
                disabled={$gamePaused}
                title="进入探索模式"
                on:click={handleExplore}>
            <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
        </button>
    {/if}

    <!-- Notes (always visible) -->
    <button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
        <svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>

        <span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
    </button>

</div>

<!-- 三级提示按钮组 -->
<div class="hint-section">
    <span class="hint-section-label">提示</span>

    <button class="btn btn-hint"
            disabled={$gamePaused || $hintCounts.level1 === 0}
            on:click={handleLevel1}
            title="计算当前格子的候选数（剩余 {$hintCounts.level1} 次）">
        候选数 <span class="hint-count">{$hintCounts.level1}</span>
    </button>

    <button class="btn btn-hint"
            disabled={$gamePaused || $hintCounts.level2 === 0}
            on:click={handleLevel2}
            title="跳转到候选数最少的格子（剩余 {$hintCounts.level2} 次）">
        最佳格 <span class="hint-count">{$hintCounts.level2}</span>
    </button>

    <button class="btn btn-hint"
            disabled={$gamePaused || $hintCounts.level3 === 0}
            on:click={handleLevel3}
            title="直接给出当前格子的答案（剩余 {$hintCounts.level3} 次）">
        答案 <span class="hint-count">{$hintCounts.level3}</span>
    </button>
=======
	<button class="btn btn-round" disabled={$gamePaused} title="Undo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
		</svg>
	</button>

	<button class="btn btn-round" disabled={$gamePaused} title="Redo">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 90 00-8 8v2M21 10l-6 6m6-6l-6-6" />
		</svg>
	</button>

	<button class="btn btn-round btn-badge" disabled={$keyboardDisabled || !hintsAvailable || $userGrid[$cursor.y][$cursor.x] !== 0} on:click={handleHint} title="Hints ({$hints})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
		</svg>

		{#if $settings.hintsLimited}
			<span class="badge" class:badge-primary={hintsAvailable}>{$hints}</span>
		{/if}
	</button>

	<button class="btn btn-round btn-badge" on:click={notes.toggle} title="Notes ({$notes ? 'ON' : 'OFF'})">
		<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
		</svg>

		<span class="badge tracking-tighter" class:badge-primary={$notes}>{$notes ? 'ON' : 'OFF'}</span>
	</button>

>>>>>>> 365567dd4a2f23598b6ca5ffd7ffba29adcb07e8
</div>


<style>
<<<<<<< HEAD
    .action-buttons {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-evenly;
        align-self: flex-end;
    }

    .btn-badge {
        position: relative;
    }

    .badge {
        min-height: 20px;
        min-width:  20px;
        padding: 1px;
        border-radius: 50%;
        line-height: 1;
        text-align: center;
        font-size: 0.75rem;
        color: white;
        background-color: #4B5563;
        display: inline-block;
        position: absolute;
        top: 0;
        left: 0;
    }

    .badge-primary {
        background-color: #3B82F6;
    }

    .explore-badge {
        font-size: 0.7rem;
        font-weight: 600;
        color: #D97706;
        background-color: #FEF3C7;
        border: 1px solid #F59E0B;
        border-radius: 0.375rem;
        padding: 0.125rem 0.375rem;
        align-self: center;
        line-height: 1.2;
    }

    .btn-submit {
        color: #059669;
    }

    .btn-abandon {
        color: #DC2626;
    }

    /* 三级提示按钮组 */
    .hint-section {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding-top: 0.5rem;
        border-top: 1px solid #E5E7EB;
    }

    .hint-section-label {
        font-size: 0.7rem;
        font-weight: 600;
        color: #9CA3AF;
        margin-right: 0.25rem;
    }

    .btn-hint {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.625rem;
        font-size: 0.8rem;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid #D1D5DB;
        background-color: #F9FAFB;
        color: #374151;
        cursor: pointer;
        transition: background-color 0.15s, border-color 0.15s;
    }

    .btn-hint:hover:not(:disabled) {
        background-color: #EFF6FF;
        border-color: #93C5FD;
    }

    .btn-hint:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .hint-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.25rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 600;
        background-color: #DBEAFE;
        color: #1D4ED8;
    }

    .btn-hint:disabled .hint-count {
        background-color: #E5E7EB;
        color: #9CA3AF;
    }
</style>
=======
	.action-buttons {
		@apply flex flex-wrap justify-evenly self-end;
	}

	.btn-badge {
		@apply relative;
	}

	.badge {
		min-height: 20px;
		min-width:  20px;
		@apply p-1 rounded-full leading-none text-center text-xs text-white bg-gray-600 inline-block absolute top-0 left-0;
	}

	.badge-primary {
		@apply bg-primary;
	}
</style>
>>>>>>> 365567dd4a2f23598b6ca5ffd7ffba29adcb07e8
