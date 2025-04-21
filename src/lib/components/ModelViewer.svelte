<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { slide } from 'svelte/transition';
	import BuildingModelViewer from './BuildingModelViewer.svelte';
	import type { ProjectVersion } from '$lib/types/version';

	// Props
	export let version: ProjectVersion | null = null;
	export let width: string = '100%';
	export let height: string = '500px';

	// Component state
	let modelData: any = null;
	let modelError: string | null = null;
	let isLoadingModel = false;
	let buildingViewerComponent: any;
	let viewerContainer: HTMLElement;
	let isExpanded = true; // Start expanded by default

	// Process and extract model data from version
	function processVersionData() {
		if (!version) {
			modelData = null;
			return;
		}

		isLoadingModel = true;
		modelError = null;

		try {
			// Based on the ProjectVersion.ts file, we should check for these fields in order of priority
			if (version.modelInputData && Object.keys(version.modelInputData).length > 0) {
				console.log('Using modelInputData from version');
				modelData = version.modelInputData;
			} else {
				console.error('No recognizable model data format found');
				modelError = 'No 3D model data found in this version';
			}

			// Log the structure of the data we're using
			if (modelData) {
				console.log('Model data structure:', Object.keys(modelData));
			}
		} catch (error) {
			console.error('Error processing model data:', error);
			modelError = 'Error processing 3D model data';
		} finally {
			isLoadingModel = false;
		}
	}

	function resetView() {
		if (buildingViewerComponent && buildingViewerComponent.resetView) {
			buildingViewerComponent.resetView();
		}
	}

	function toggleFullscreen() {
		if (!viewerContainer) return;

		if (!document.fullscreenElement) {
			viewerContainer.requestFullscreen().catch((err) => {
				console.error(`Error attempting to enable fullscreen: ${err.message}`);
			});

			// Listen for fullscreen change to handle resize properly
			document.addEventListener('fullscreenchange', handleFullscreenChange);
		} else {
			document.exitFullscreen();
		}
	}

	// Toggle expand/collapse
	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	// Handle fullscreen change events
	function handleFullscreenChange() {
		if (document.fullscreenElement) {
			// We're entering fullscreen mode
			if (buildingViewerComponent) {
				// Trigger resize to update renderer dimensions
				setTimeout(() => {
					if (buildingViewerComponent.handleResize) {
						buildingViewerComponent.handleResize();
					}
				}, 100); // Small delay to ensure the browser has updated the DOM
			}
		} else {
			// We're exiting fullscreen mode
			if (buildingViewerComponent) {
				// Trigger resize to update renderer dimensions
				setTimeout(() => {
					if (buildingViewerComponent.handleResize) {
						buildingViewerComponent.handleResize();
					}
				}, 100); // Small delay to ensure the browser has updated the DOM
			}

			// Remove the event listener when exiting fullscreen
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		}
	}

	// React to changes in version data
	$: if (version) {
		processVersionData();
	}

	onMount(() => {
		if (version) {
			processVersionData();
		}
	});

	onDestroy(() => {
		document.removeEventListener('fullscreenchange', handleFullscreenChange);
	});
</script>

<div class="results-section">
	<div class="results-header">
		<h2>3D Building Model</h2>

		<div class="header-actions">
			<button
				class="toggle-button"
				on:click={toggleExpand}
				aria-label={isExpanded ? 'Collapse' : 'Expand'}
			>
				<span class="material-icons"
					>{isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span
				>
			</button>
		</div>
	</div>

	{#if isExpanded}
		<div class="model-content" transition:slide={{ duration: 300 }}>
			{#if isLoadingModel}
				<div class="loading-container">
					<div class="loader"></div>
					<p>Loading 3D model...</p>
				</div>
			{:else if modelError}
				<div class="no-results">
					<span class="material-icons no-results-icon">3d_rotation</span>
					<p>{modelError}</p>
				</div>
			{:else if modelData}
				<div class="model-viewer-wrapper">
					<div class="model-controls">
						<button class="action-button" on:click={resetView} title="Reset View">
							<span class="material-icons">cached</span>
						</button>
						<button class="action-button" on:click={toggleFullscreen} title="Fullscreen">
							<span class="material-icons">fullscreen</span>
						</button>
					</div>
					<div class="model-container" bind:this={viewerContainer}>
						<BuildingModelViewer {modelData} {width} {height} bind:this={buildingViewerComponent} />
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Match the results-section style from projects/[projectId]/versions/[versionNumber]/+page.svelte */
	.results-section {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #f0f0f0;
		padding-bottom: 1rem;
	}

	.results-header h2 {
		font-size: 1.2rem;
		color: #1e3a8a;
		margin: 0;
		font-weight: 500;
	}

	.header-actions {
		display: flex;
		align-items: center;
	}

	.toggle-button {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		background-color: #f1f5f9;
		color: #64748b;
		border: 1px solid #e2e8f0;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toggle-button:hover {
		background-color: #e2e8f0;
		color: #334155;
	}

	.toggle-button .material-icons {
		font-size: 1.1rem;
	}

	/* Wrapper for model viewer - without border */
	.model-viewer-wrapper {
		position: relative;
		border-radius: 8px;
		overflow: hidden;
	}

	.model-controls {
		position: absolute;
		top: 0rem;
		right: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		z-index: 10;
	}

	.action-button {
		width: 32px;
		height: 32px;
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		transition: all 0.15s ease;
		background-color: white;
		border: none;
		cursor: pointer;
	}

	.action-button .material-icons {
		font-size: 0.9rem;
		color: black;
	}

	.action-button:hover {
		background-color: #e2e8f0;
	}

	.model-container {
		width: 100%;
		height: 100%;
	}

	/* Loading State - to match the styles from versions page */
	.loading-container {
		padding: 3rem 1.5rem;
		text-align: center;
		background-color: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.loader {
		border: 3px solid rgba(92, 159, 255, 0.2);
		border-left-color: #5c9fff;
		border-radius: 50%;
		width: 32px;
		height: 32px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* No results / empty state - to match versions page */
	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 4rem 0;
		color: #64748b;
		text-align: center;
	}

	.no-results-icon {
		font-size: 3rem;
		color: #94a3b8;
		opacity: 0.5;
	}

	/* Fullscreen specific styles */
	:global(:fullscreen) .model-container {
		width: 100vw !important;
		height: 100vh !important;
	}
</style>
