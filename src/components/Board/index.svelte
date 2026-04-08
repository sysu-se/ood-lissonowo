<script>
	import { BOX_SIZE } from '@sudoku/constants';
	import { gamePaused } from '@sudoku/stores/game';
	import { gameStore } from '../../stores/game';
	import { settings } from '@sudoku/stores/settings';
	import { cursor } from '@sudoku/stores/cursor';
	import { candidates } from '@sudoku/stores/candidates';
	import Cell from './Cell.svelte';

	function isSelected(cursorStore, x, y) {
		return cursorStore.x === x && cursorStore.y === y;
	}

	function isSameArea(cursorStore, x, y) {
		if (cursorStore.x === null && cursorStore.y === null) return false;
		if (cursorStore.x === x || cursorStore.y === y) return true;

		const cursorBoxX = Math.floor(cursorStore.x / BOX_SIZE);
		const cursorBoxY = Math.floor(cursorStore.y / BOX_SIZE);
		const cellBoxX = Math.floor(x / BOX_SIZE);
		const cellBoxY = Math.floor(y / BOX_SIZE);
		return (cursorBoxX === cellBoxX && cursorBoxY === cellBoxY);
	}

	function getValueAtCursor(gridStore, cursorStore) {
		if (cursorStore.x === null && cursorStore.y === null) return null;

		return gridStore[cursorStore.y][cursorStore.x];
	}

	function isInvalidCell(x, y, invalidCells) {
		return invalidCells.some(cell => cell.row === y && cell.col === x);
	}

	function isUserNumber(x, y, originalGrid, currentGrid) {
		// 如果原始网格中该位置为0，而当前网格中有值，则是用户输入的
		return originalGrid[y][x] === 0 && currentGrid[y][x] !== 0;
	}
</script>

<div class="board-padding relative z-10">
	<div class="max-w-xl relative">
		<div class="w-full" style="padding-top: 100%"></div>
	</div>
	<div class="board-padding absolute inset-0 flex justify-center">

		<div class="bg-white shadow-2xl rounded-xl overflow-hidden w-full h-full max-w-xl grid" class:bg-gray-200={$gamePaused}>

			{#each $gameStore.grid as row, y}
				{#each row as value, x}
					<Cell {value}
					      cellY={y + 1}
					      cellX={x + 1}
					      candidates={$candidates[x + ',' + y]}
					      disabled={$gamePaused}
					      selected={isSelected($cursor, x, y)}
					      userNumber={isUserNumber(x, y, $gameStore.originalGrid, $gameStore.grid)}
					      sameArea={$settings.highlightCells && !isSelected($cursor, x, y) && isSameArea($cursor, x, y)}
					      sameNumber={$settings.highlightSame && value && !isSelected($cursor, x, y) && getValueAtCursor($gameStore.grid, $cursor) === value}
					      conflictingNumber={$settings.highlightConflicting && isInvalidCell(x, y, $gameStore.invalidCells)} />
				{/each}
			{/each}

		</div>

	</div>
</div>

<style>
	.board-padding {
		padding: 0 1rem 1rem;
	}
</style>