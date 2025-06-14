<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { slide, fade } from 'svelte/transition';
	import BuildingModelViewer from '../BuildingModelViewer.svelte';
	import ResultsFilter from './ResultsFilter.svelte';
	import StoryPerformanceSummary from './StoreyPerformanceSummary.svelte';
	import type { ProjectVersion } from '$lib/types/version';
	import type { FilterCriteria, StoryPerformance, ResultRow } from '$lib/types/FilterTypes';
	import {
		filterResultsData,
		getStoryPerformanceStatus,
		getStoryColors,
		isFilterSelectionComplete
	} from '$lib/utils/resultFiltering';

	// Props
	export let version: ProjectVersion | null = null;
	export let width: string = '100%';
	export let height: string = '500px';

	// Component state
	let modelData: any = null;
	let resultsData: ResultRow[] = [];
	let filteredResults: ResultRow[] = [];
	let storyColors: Record<string, string> = {};
	let storyPerformance: StoryPerformance[] = [];
	let modelError: string | null = null;
	let isLoadingModel = false;
	let buildingViewerComponent: any;
	let viewerContainer: HTMLElement;
	let isExpanded = true;
	let showPerformanceView = false;
	let filters: FilterCriteria = {
		earthquake: null,
		performance: null,
		direction: null
	};

	// Process and extract model data from version
	function processVersionData() {
		if (!version) {
			modelData = null;
			resultsData = [];
			return;
		}

		isLoadingModel = true;
		modelError = null;

		try {
			// Extract model data
			if (version.modelInputData && Object.keys(version.modelInputData).length > 0) {
				console.log('Using modelInputData from version');
				modelData = version.modelInputData;
			} else {
				console.error('No recognizable model data format found');
				modelError = 'No 3D model data found in this version';
			}

			// Extract results data
			if (version.resultsData && version.resultsData.rows) {
				resultsData = version.resultsData.rows as ResultRow[];
				console.log(`Loaded ${resultsData.length} result rows`);
			} else {
				console.warn('No results data found');
				resultsData = [];
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

	// Handle filter changes
	function handleFilterChange(event: CustomEvent<FilterCriteria>) {
		filters = event.detail;
		updateFilteredResults();
	}

	// Update filtered results based on current filters
	function updateFilteredResults(): void {
		console.log('Updating filtered results with filters:', filters);

		if (resultsData.length === 0) {
			filteredResults = [];
			storyPerformance = [];
			storyColors = {};
			return;
		}

		// Apply the filters
		filteredResults = filterResultsData(resultsData, filters);
		console.log(`Filtered results: ${filteredResults.length} rows`);

		// Update story performance if performance criterion is selected
		if (filters.performance) {
			storyPerformance = getStoryPerformanceStatus(filteredResults, filters.performance);
			console.log('Story performance status:', storyPerformance);

			// Update story colors for visualization
			storyColors = getStoryColors(storyPerformance);
			console.log('Story colors:', storyColors);
		} else {
			storyPerformance = [];
			storyColors = {};
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

	// Toggle between original model and performance view
	function togglePerformanceView() {
		showPerformanceView = !showPerformanceView;

		// Reset filters when switching back to original view
		if (!showPerformanceView) {
			filters = {
				earthquake: null,
				performance: null,
				direction: null
			};
			storyColors = {};
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

	// When storyColors change, ensure the viewer rerenders with the new colors
	$: if (buildingViewerComponent && Object.keys(storyColors).length > 0) {
		console.log('Applying story colors to 3D model:', storyColors);
		// Force a rerender of the model with new colors immediately and also with a small delay
		// to ensure it happens after any other pending updates
		if (buildingViewerComponent.updateMaterialColors) {
			// Try immediately
			buildingViewerComponent.updateMaterialColors(storyColors);

			// And also with a delay to be sure
			setTimeout(() => {
				if (buildingViewerComponent && buildingViewerComponent.updateMaterialColors) {
					console.log('Retrying color update with delay');
					buildingViewerComponent.updateMaterialColors(storyColors);
				}
			}, 300);
		}
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
			{#if resultsData.length > 0}
				<button
					class="icon-button"
					class:active={showPerformanceView}
					on:click={togglePerformanceView}
					title={showPerformanceView ? 'Switch to Original View' : 'Switch to Performance View'}
				>
					<span class="material-icons">
						{showPerformanceView ? 'visibility' : 'assessment'}
					</span>
				</button>
			{/if}
			<button
				class="icon-button"
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
		<div class="model-content" in:fade={{ duration: 200 }}>
			{#if showPerformanceView && resultsData.length > 0}
				<!-- Performance View with Filters -->
				<div class="performance-view" in:fade={{ duration: 200 }}>
					<ResultsFilter on:filterChange={handleFilterChange} bind:filters />

					{#if isFilterSelectionComplete(filters)}
						<StoryPerformanceSummary
							{storyPerformance}
							performanceType={filters.performance}
							direction={filters.direction}
						/>
					{/if}

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
							<div class="model-container" bind:this={viewerContainer}>
								<BuildingModelViewer
									{modelData}
									{width}
									{height}
									{storyColors}
									bind:this={buildingViewerComponent}
								/>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Original Building View -->
				<div in:fade={{ duration: 200 }}>
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
							<div class="model-container" bind:this={viewerContainer}>
								<BuildingModelViewer
									{modelData}
									{width}
									{height}
									bind:this={buildingViewerComponent}
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
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
		gap: 0.5rem;
	}

	.icon-button {
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
		transition: all 0.2s ease;
	}

	.icon-button:hover {
		background-color: #e2e8f0;
		color: #334155;
	}

	.icon-button.active {
		background-color: #f1f5f9;
		color: #64748b;
	}

	.icon-button .material-icons {
		font-size: 1.1rem;
	}

	/* Performance view */
	.performance-view {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Wrapper for model viewer - without border */
	.model-viewer-wrapper {
		position: relative;
		border-radius: 8px;
		overflow: hidden;
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
