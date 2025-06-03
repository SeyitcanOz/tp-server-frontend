<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Props
	export let selectedObjectType: string = '';
	export let selectedObjectProperties: any = {};
	export let showProperties: boolean = false;
	export let isTreeViewVisible: boolean = true; // To make it responsive based on tree view visibility
	export let width: string = '250px';

	// Get formatted member type and label for property panel header
	function getFormattedMemberLabel(): string {
		if (!selectedObjectType || !selectedObjectProperties.Label) {
			return 'Properties';
		}

		return `${selectedObjectType}-${selectedObjectProperties.Label}`;
	}

	// Close properties panel
	function closePanel() {
		dispatch('close');
	}
</script>

{#if showProperties}
	<div class="properties-panel" class:tree-view-hidden={!isTreeViewVisible} style="width: {width};">
		<div class="properties-header">
			<h3>{getFormattedMemberLabel()}</h3>
			<button class="close-button" on:click={closePanel}>
				<span class="material-icons">close</span>
			</button>
		</div>
		<div class="properties-content">
			{#if selectedObjectType === 'Beam'}
				<div class="property">
					<span class="property-label">Width:</span>
					<span class="property-value">{selectedObjectProperties.Width || 'N/A'} cm</span>
				</div>
				<div class="property">
					<span class="property-label">Depth:</span>
					<span class="property-value">{selectedObjectProperties.Depth || 'N/A'} cm</span>
				</div>
				<div class="property">
					<span class="property-label">Length:</span>
					<span class="property-value">{selectedObjectProperties.Length || 'N/A'} cm</span>
				</div>
			{:else if selectedObjectType === 'Column'}
				<div class="property">
					<span class="property-label">B1:</span>
					<span class="property-value">{selectedObjectProperties.B1 || 'N/A'} cm</span>
				</div>
				<div class="property">
					<span class="property-label">B2:</span>
					<span class="property-value">{selectedObjectProperties.B2 || 'N/A'} cm</span>
				</div>
				<div class="property">
					<span class="property-label">Is Supported:</span>
					<span class="property-value">{selectedObjectProperties.IsSupported ? 'Yes' : 'No'}</span>
				</div>
			{:else if selectedObjectType === 'Wall'}
				<div class="property">
					<span class="property-label">Width:</span>
					<span class="property-value">{selectedObjectProperties.Width || 'N/A'} cm</span>
				</div>
				<div class="property">
					<span class="property-label">Length:</span>
					<span class="property-value">{selectedObjectProperties.Length || 'N/A'} cm</span>
				</div>
				<div class="property">
					<span class="property-label">Is Supported:</span>
					<span class="property-value">{selectedObjectProperties.IsSupported ? 'Yes' : 'No'}</span>
				</div>
				{#if selectedObjectProperties.Openings}
					<div class="property">
						<span class="property-label">Openings:</span>
						<span class="property-value">{selectedObjectProperties.Openings}</span>
					</div>
				{/if}
			{:else if selectedObjectType === 'Slab'}
				<div class="property">
					<span class="property-label">Thickness:</span>
					<span class="property-value">{selectedObjectProperties.Thickness || 'N/A'} cm</span>
				</div>
				<div class="property">
					<span class="property-label">Coating Load:</span>
					<span class="property-value">{selectedObjectProperties.CoatingLoad || '0'} kN/m²</span>
				</div>
				<div class="property">
					<span class="property-label">Live Load:</span>
					<span class="property-value">{selectedObjectProperties.LiveLoad || '0'} kN/m²</span>
				</div>
			{:else}
				{#each Object.entries(selectedObjectProperties) as [key, value]}
					{#if key !== 'Label'}
						<div class="property">
							<span class="property-label">{key}:</span>
							<span class="property-value">{value}</span>
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</div>
{/if}

<style>
	.properties-panel {
		position: absolute;
		top: calc(70% + 20px); /* By default, positioned below the Tree View */
		left: 10px;
		background-color: rgba(255, 255, 255, 0.8);
		border-radius: 8px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		z-index: 100;
		overflow: hidden;
		/* animation: slideInLeft 0.3s ease-out; */
		backdrop-filter: blur(5px);
		transition: top 0.3s ease-out;
	}

	/* When tree view is hidden, position properties panel at the top */
	.properties-panel.tree-view-hidden {
		top: 10px;
	}

	@keyframes slideInLeft {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.properties-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background-color: rgba(241, 245, 249, 0.7);
		border-bottom: 1px solid rgba(226, 232, 240, 0.8);
	}

	.properties-header h3 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: #334155;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px;
	}

	.close-button {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background-color: transparent;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.close-button:hover {
		background-color: rgba(0, 0, 0, 0.05);
		transform: rotate(90deg);
	}

	.close-button:active {
		transform: scale(0.9) rotate(90deg);
	}

	.close-button .material-icons {
		font-size: 16px;
		color: #64748b;
	}

	.properties-content {
		padding: 8px 12px;
		max-height: 250px;
		overflow-y: auto;
	}

	.property {
		display: flex;
		justify-content: space-between;
		padding: 4px 0;
		border-bottom: 1px solid rgba(241, 245, 249, 0.5);
	}

	.property:last-child {
		border-bottom: none;
	}

	.property-label {
		font-size: 12px;
		font-weight: 500;
		color: #64748b;
	}

	.property-value {
		font-size: 12px;
		color: #334155;
		font-weight: 500;
	}
</style>
