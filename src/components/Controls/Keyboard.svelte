<script>
<<<<<<< HEAD
	import { cursor } from '@sudoku/stores/cursor';
	import { notes } from '@sudoku/stores/notes';
	import { gameStore } from '../../stores/game';
=======
	import { userGrid } from '@sudoku/stores/grid';
	import { cursor } from '@sudoku/stores/cursor';
	import { notes } from '@sudoku/stores/notes';
	import { candidates } from '@sudoku/stores/candidates';
>>>>>>> 365567dd4a2f23598b6ca5ffd7ffba29adcb07e8

	// TODO: Improve keyboardDisabled
	import { keyboardDisabled } from '@sudoku/stores/keyboard';

<<<<<<< HEAD
	/**
	 * 读取当前格子的 notes，切换指定数字
	 * 数字存在则移除，不存在则添加
	 */
	function toggleNotes(row, col, num) {
		const currentNotes = $gameStore.notes[`${col},${row}`] || [];
		const updated = currentNotes.includes(num)
			? currentNotes.filter(n => n !== num)
			: [...currentNotes, num].sort();
		gameStore.setNotes(row, col, updated);
	}

	function handleKeyButton(num) {
		if (!$keyboardDisabled && $cursor.x !== null && $cursor.y !== null) {
			if ($notes) {
				if (num === 0) {
					gameStore.clearNotes($cursor.y, $cursor.x);
				} else {
					toggleNotes($cursor.y, $cursor.x, num);
				}
				// 笔记模式下不修改实际数值
			} else {
				// 填入数字时清除该格的候选数
				if ($gameStore.notes[$cursor.x + ',' + $cursor.y]) {
					gameStore.clearNotes($cursor.y, $cursor.x);
				}

				// 使用gameStore进行猜测
				gameStore.guess({
					row: $cursor.y,
					col: $cursor.x,
					value: num
				});
=======
	function handleKeyButton(num) {
		if (!$keyboardDisabled) {
			if ($notes) {
				if (num === 0) {
					candidates.clear($cursor);
				} else {
					candidates.add($cursor, num);
				}
				userGrid.set($cursor, 0);
			} else {
				if ($candidates.hasOwnProperty($cursor.x + ',' + $cursor.y)) {
					candidates.clear($cursor);
				}

				userGrid.set($cursor, num);
>>>>>>> 365567dd4a2f23598b6ca5ffd7ffba29adcb07e8
			}
		}
	}

	function handleKey(e) {
		switch (e.key || e.keyCode) {
			case 'ArrowUp':
			case 38:
			case 'w':
			case 87:
				cursor.move(0, -1);
				break;

			case 'ArrowDown':
			case 40:
			case 's':
			case 83:
				cursor.move(0, 1);
				break;

			case 'ArrowLeft':
			case 37:
			case 'a':
			case 65:
				cursor.move(-1);
				break;

			case 'ArrowRight':
			case 39:
			case 'd':
			case 68:
				cursor.move(1);
				break;

			case 'Backspace':
			case 8:
			case 'Delete':
			case 46:
				handleKeyButton(0);
				break;

			default:
				if (e.key && e.key * 1 >= 0 && e.key * 1 < 10) {
					handleKeyButton(e.key * 1);
				} else if (e.keyCode - 48 >= 0 && e.keyCode - 48 < 10) {
					handleKeyButton(e.keyCode - 48);
				}
				break;
		}
	}
</script>

<svelte:window on:keydown={handleKey} /><!--on:beforeunload|preventDefault={e => e.returnValue = ''} />-->

<div class="keyboard-grid">

	{#each Array(10) as _, keyNum}
		{#if keyNum === 9}
			<button class="btn btn-key" disabled={$keyboardDisabled} title="Erase Field" on:click={() => handleKeyButton(0)}>
				<svg class="icon-outline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>
		{:else}
			<button class="btn btn-key" disabled={$keyboardDisabled} title="Insert {keyNum + 1}" on:click={() => handleKeyButton(keyNum + 1)}>
				{keyNum + 1}
			</button>
		{/if}
	{/each}

</div>

<style>
	.keyboard-grid {
<<<<<<< HEAD
		display: grid;
		grid-template-rows: repeat(2, 1fr);
		grid-template-columns: repeat(5, 1fr);
		gap: 0.75rem;
=======
		@apply grid grid-rows-2 grid-cols-5 gap-3;
>>>>>>> 365567dd4a2f23598b6ca5ffd7ffba29adcb07e8
	}


	.btn-key {
<<<<<<< HEAD
		padding-top: 1rem;
		padding-bottom: 1rem;
		padding-left: 0;
		padding-right: 0;
	}
</style>
=======
		@apply py-4 px-0;
	}
</style>
>>>>>>> 365567dd4a2f23598b6ca5ffd7ffba29adcb07e8
