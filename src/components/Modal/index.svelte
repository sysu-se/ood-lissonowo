<script>
	import { fade, scale } from 'svelte/transition';
	import { modal, modalData } from '@sudoku/stores/modal';
	import { MODAL_NONE, MODAL_DURATION } from '@sudoku/constants';
	import types from './Types';

	const MODALS_DISABLED_OVERLAY = ['welcome', 'gameover'];

	function handleOverlayClick() {
		if (!MODALS_DISABLED_OVERLAY.includes($modal)) {
			modal.hide();
		}
	}
</script>

{#if $modal !== MODAL_NONE}
	<div class="modal">
		<button transition:fade={{duration: MODAL_DURATION}} class="modal-overlay" on:click={handleOverlayClick} tabindex="-1"></button>

		<div transition:scale={{duration: MODAL_DURATION}} class="modal-container">
			<div class="modal-content">
				<svelte:component this={types[$modal]} data={$modalData} hideModal={modal.hide} />
			</div>
		</div>
	</div>
{/if}

<style>
	.modal {
		position: fixed;
		z-index: 40;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-overlay {
		position: fixed;
		z-index: 40;
		inset: 0;
		height: 100%;
		width: 100%;
		background-color: black;
		opacity: 0.5;
		outline: none;
		cursor: default;
	}

	.modal-container {
		z-index: 50;
		background-color: #f8f9fa;
		width: 91.666667%;
		margin-left: auto;
		margin-right: auto;
		border-radius: 0.75rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		overflow-y: auto;
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		text-align: left;
	}

	@media (min-width: 768px) {
		.modal-container {
			max-width: 28rem;
		}
	}
</style>