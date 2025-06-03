<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import * as THREE from 'three'; // Import THREE to fix namespace errors

	// Define necessary interfaces for type safety
	interface ElementData {
		Label: string;
		[key: string]: any;
	}

	interface StoryData {
		Label?: string;
		Beams?: ElementData[];
		Columns?: ElementData[];
		Walls?: ElementData[];
		Slabs?: ElementData[];
		[key: string]: any;
	}

	interface ModelData {
		Stories?: StoryData[];
		[key: string]: any;
	}

	interface SearchResult {
		path: string;
		type: string;
		label: string;
		storyName: string;
	}

	// Props
	export let modelData: ModelData | null = null; // The ModelInputData from the version
	export let scene: THREE.Scene | null = null; // Reference to the Three.js scene
	export let is2DMode: boolean = false;
	export let selectObject: (object: THREE.Object3D) => void; // Function to select/highlight object
	export let deselectObject: () => void; // Function to deselect current object
	export let width: string = '250px';
	export let height: string = '100%';

	// Component state
	const dispatch = createEventDispatcher();
	let elementStructure: Record<string, any> = {};
	let expandedStories: Record<string, boolean> = {};
	let expandedCategories: Record<string, boolean> = {};
	let selectedElement: string | null = null;
	let searchTerm: string = '';
	let searchResults: SearchResult[] = [];
	let isSearching: boolean = false;
	let selectedStory: string | null = null; // Track currently selected story in 2D mode

	// Element types and their display names with colors matching the 3D model
	const elementTypes: Record<string, { display: string; color: string }> = {
		Beam: { display: 'Beams', color: '#2e8b57' },
		Column: { display: 'Columns', color: '#517891' },
		Wall: { display: 'Walls', color: '#5472d3' },
		Slab: { display: 'Slabs', color: '#cccccc' }
	};

	// Initialize component when modelData changes
	$: if (modelData && modelData.Stories) {
		buildElementStructure();
	}

	// Process search term
	$: if (searchTerm.trim().length > 0) {
		performSearch();
		isSearching = true;
	} else {
		searchResults = [];
		isSearching = false;
	}

	// Build hierarchical data structure for the tree view
	function buildElementStructure() {
		elementStructure = {};
		expandedStories = {};
		expandedCategories = {};

		if (!modelData || !modelData.Stories) return;

		// Create root "Stories" entry
		elementStructure['Stories'] = {};

		// Add each story as a child under "Stories"
		modelData.Stories.forEach((story: StoryData, storyIndex: number) => {
			const storyName = story.Label || (storyIndex === 0 ? 'Bodrum' : `Kat ${storyIndex}`);

			// Add story to Stories category
			elementStructure['Stories'][storyName] = {
				Beams: {},
				Columns: {},
				Walls: {},
				Slabs: {}
			};

			// Populate beams
			if (story.Beams) {
				story.Beams.forEach((beam: ElementData) => {
					elementStructure['Stories'][storyName].Beams[beam.Label] = {
						...beam,
						objectName: `Beam_${beam.Label}`
					};
				});
			}

			// Populate columns
			if (story.Columns) {
				story.Columns.forEach((column: ElementData) => {
					elementStructure['Stories'][storyName].Columns[column.Label] = {
						...column,
						objectName: `Column_${column.Label}`
					};
				});
			}

			// Populate walls
			if (story.Walls) {
				story.Walls.forEach((wall: ElementData) => {
					elementStructure['Stories'][storyName].Walls[wall.Label] = {
						...wall,
						objectName: `Wall_${wall.Label}`
					};
				});
			}

			// Populate slabs
			if (story.Slabs) {
				story.Slabs.forEach((slab: ElementData) => {
					elementStructure['Stories'][storyName].Slabs[slab.Label] = {
						...slab,
						objectName: `Slab_${slab.Label}`
					};
				});
			}
		});

		// Auto-expand "Stories" by default
		expandedStories['Stories'] = true;
	}

	// Toggle expansion of a story
	function toggleStory(storyName: string) {
		// Prevent dispatch if it's the same story in 2D mode to avoid infinite loop
		if (is2DMode && storyName !== 'Stories') {
			// Check if this is already the selected story in 2D mode
			if (selectedStory === storyName) {
				// Just toggle expansion without dispatching
				expandedStories[storyName] = !expandedStories[storyName];
				return;
			}

			// Update the selected story
			selectedStory = storyName;

			// Always expand the story in 2D mode
			expandedStories['Stories'] = true;
			expandedStories[storyName] = true;

			// Dispatch event to tell parent component to show only this story
			dispatch('storySelected', { storyName });
		} else {
			// Normal toggle behavior for 3D mode or the root "Stories" node
			expandedStories[storyName] = !expandedStories[storyName];
		}
	}

	// Toggle expansion of a category within a story
	function toggleCategory(storyName: string, category: string) {
		const key = `${storyName}_${category}`;
		expandedCategories[key] = !expandedCategories[key];
	}

	// Select an element in the tree view and highlight it in the 3D model
	function selectElementInTree(storyName: string, category: string, elementLabel: string) {
		if (!scene) return;

		const objectName = `${category}_${elementLabel}`;
		selectedElement = objectName;

		// In 2D mode, if clicking an element in a different story, make that story visible
		if (is2DMode && selectedStory !== storyName) {
			// Update the selected story
			selectedStory = storyName;

			// Dispatch event to change the visible story
			dispatch('storySelected', { storyName });
		}

		// Find the object in the scene
		let selectedObj: THREE.Object3D | null = null;

		// For walls, check both the wall group and its segments
		if (category === 'Wall') {
			// First try to find the wall group
			selectedObj = scene.getObjectByName(objectName) || null;

			// If not found, try to find wall segments
			if (!selectedObj) {
				scene.traverse((object: THREE.Object3D) => {
					if (object.name === `${objectName}_Segment`) {
						selectedObj = object;
					}
				});
			}
		} else {
			// For other element types
			selectedObj = scene.getObjectByName(objectName) || null;
		}

		if (selectedObj) {
			// Call the select function from the main component
			selectObject(selectedObj);

			// Dispatch an event for parent components
			dispatch('select', {
				type: category,
				label: elementLabel,
				object: selectedObj
			});
		} else {
			console.warn(`Could not find object with name: ${objectName}`);
		}
	}

	// Count elements in a category
	function countElementsInCategory(storyPath: string[], category: string): number {
		let current = elementStructure;
		for (const path of storyPath) {
			if (!current[path]) return 0;
			current = current[path];
		}
		return Object.keys(current[category] || {}).length;
	}

	// Check if a story has any elements
	function hasElements(storyPath: string[]): boolean {
		let current = elementStructure;
		for (const path of storyPath) {
			if (!current[path]) return false;
			current = current[path];
		}

		return Object.keys(elementTypes).some((type) => {
			return Object.keys(current[type + 's'] || {}).length > 0;
		});
	}

	// Perform search across all elements
	function performSearch() {
		searchResults = [];
		const term = searchTerm.toLowerCase();

		// Search through Stories
		if (!elementStructure['Stories']) return;

		Object.entries(elementStructure['Stories']).forEach(([storyName, storyData]) => {
			Object.entries(storyData as any).forEach(([category, elements]) => {
				Object.entries(elements as any).forEach(([label, data]) => {
					// Check if this is a valid element type
					const elementType = category.slice(0, -1); // Remove the 's' from the end
					const validType = elementTypes[elementType];

					if (label.toLowerCase().includes(term)) {
						searchResults.push({
							path: `${storyName} > ${validType?.display || category} > ${label}`,
							type: elementType,
							label: label,
							storyName: storyName // Add the story name for easy access
						});
					}
				});
			});
		});
	}

	// Handle a search result selection
	function selectSearchResult(result: SearchResult) {
		if (!scene) return;

		// Extract story from the path
		const storyName = result.storyName || result.path.split(' > ')[0];
		const objectName = `${result.type}_${result.label}`;
		selectedElement = objectName;

		// In 2D mode, always select the story containing the search result
		if (is2DMode && storyName !== selectedStory) {
			selectedStory = storyName;
			dispatch('storySelected', { storyName });
		}

		// Find and select the object
		const obj = scene.getObjectByName(objectName) || null;
		if (obj) {
			selectObject(obj);

			// Dispatch an event for parent components
			dispatch('select', {
				type: result.type,
				label: result.label,
				object: obj
			});

			// Auto-expand the path
			expandedStories['Stories'] = true;
			expandedStories[storyName] = true;
			expandedCategories[`${storyName}_${result.type}s`] = true;
		}
	}

	// Public method: Clear the current selection
	export function clearSelection() {
		selectedElement = null;
		deselectObject();
	}

	// Public method: Set focus on the search box
	export function focusSearch() {
		const searchInput = document.querySelector('.building-tree-view input') as HTMLInputElement;
		if (searchInput) {
			searchInput.focus();
		}
	}

	// Public method: Expand to a specific element path
	export function expandToElement(storyName: string, category: string, elementLabel: string) {
		expandedStories['Stories'] = true;
		expandedStories[storyName] = true;
		expandedCategories[`${storyName}_${category}s`] = true;
	}

	// Public method: Expand to a specific story
	export function expandToStory(storyName: string) {
		// In 2D mode, we need to update selected story to prevent loops
		if (is2DMode) {
			selectedStory = storyName;
		}

		expandedStories['Stories'] = true;
		expandedStories[storyName] = true;

		// Only dispatch if explicitly called externally
		if (storyName !== 'Stories') {
			dispatch('storySelected', { storyName });
		}
	}

	// Watch for changes in is2DMode
	$: if (is2DMode !== undefined) {
		// When switching modes, reset selected story tracking
		// to prevent issues with previous selections
		if (!is2DMode) {
			selectedStory = null;
		}
	}

	// NEW: Select element by name (to be called from the main component)
	export function selectElementByName(objectName: string) {
		// Parse the object name to get the type and label
		const match = objectName.match(/^([A-Za-z]+)_(.+)$/);

		if (!match) return false;

		const [_, elementType, elementLabel] = match;

		// If we've already selected this element, no need to process further
		if (selectedElement === objectName) return true;

		// Update the selected element
		selectedElement = objectName;

		// Now we need to find which story this element belongs to
		if (elementStructure['Stories']) {
			// Search through all stories
			for (const [storyName, storyData] of Object.entries(elementStructure['Stories'])) {
				const category = `${elementType}s`;
				const typedStoryData = storyData as Record<string, any>;

				// Check if this story has this category
				if (typedStoryData[category] && typedStoryData[category][elementLabel]) {
					// Found the element in this story

					// Auto-expand the path to make the element visible
					expandedStories['Stories'] = true;
					expandedStories[storyName] = true;
					expandedCategories[`${storyName}_${category}`] = true;

					// In 2D mode, if the element is in another story, select that story
					if (is2DMode && selectedStory !== storyName) {
						selectedStory = storyName;
						dispatch('storySelected', { storyName });
					}

					// Dispatch event about the selection
					dispatch('select', {
						type: elementType,
						label: elementLabel,
						objectName: objectName
					});

					// Wait for the next tick so the UI can update with expanded nodes
					setTimeout(() => {
						// Find the element in the DOM and scroll to it, but only within the tree container
						const treeContent = document.querySelector('.tree-content') as HTMLElement;
						const elementNode = document.querySelector(`.element-item.selected`) as HTMLElement;

						if (elementNode && treeContent) {
							// Calculate if the element is outside the visible area of tree-content
							const treeRect = treeContent.getBoundingClientRect();
							const elementRect = elementNode.getBoundingClientRect();

							// Only scroll if element is outside visible area
							if (elementRect.top < treeRect.top || elementRect.bottom > treeRect.bottom) {
								// Use manual scrolling to control exactly where the element goes
								// This avoids the page movement issue of scrollIntoView
								const scrollTop = treeContent.scrollTop;

								if (elementRect.top < treeRect.top) {
									// Element is above visible area - scroll up
									treeContent.scrollTop = scrollTop - (treeRect.top - elementRect.top) - 10; // Add padding
								} else if (elementRect.bottom > treeRect.bottom) {
									// Element is below visible area - scroll down
									treeContent.scrollTop = scrollTop + (elementRect.bottom - treeRect.bottom) + 10; // Add padding
								}
							}
						}
					}, 150); // Small delay to allow for DOM updates

					return true; // Successfully selected
				}
			}
		}

		return false; // Element not found in the tree
	}

	// Handle keyboard navigation for accessibility
	function handleKeyDown(event: KeyboardEvent, action: Function, ...args: any[]) {
		// Handle Enter or Space to trigger the action
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			action(...args);
		}
	}
</script>

<div class="building-tree-view" style="width: {width}; height: {height};">
	<div class="tree-header">
		<div class="search-container">
			<input
				type="text"
				bind:value={searchTerm}
				placeholder="Search elements..."
				on:keydown={(e) => e.key === 'Escape' && (searchTerm = '')}
			/>
			{#if searchTerm && searchResults.length === 0}
				<div class="no-results">No elements found</div>
			{/if}
		</div>
	</div>

	{#if isSearching && searchResults.length > 0}
		<!-- Search Results View -->
		<div class="search-results">
			<div class="results-header">
				<span>Found {searchResults.length} result{searchResults.length > 1 ? 's' : ''}</span>
				<button class="clear-button" on:click={() => (searchTerm = '')}>Clear</button>
			</div>
			<ul class="results-list">
				{#each searchResults as result}
					<li
						class="result-item"
						class:selected={selectedElement === `${result.type}_${result.label}`}
						on:click={() => selectSearchResult(result)}
						on:keydown={(e) => handleKeyDown(e, selectSearchResult, result)}
						tabindex="0"
						role="button"
						aria-label="Select {result.label}"
					>
						<span class="result-color" style="background-color: {elementTypes[result.type]?.color}"
						></span>
						<span class="result-label">{result.label}</span>
						<span class="result-path">{result.path}</span>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<!-- Tree View -->
		<div class="tree-content">
			{#if !elementStructure['Stories'] || Object.keys(elementStructure['Stories']).length === 0}
				<div class="empty-state">No building model data available</div>
			{:else}
				<ul class="tree-root">
					<!-- Stories as root level -->
					<li
						class="tree-item root-item"
						on:click={() => toggleStory('Stories')}
						on:keydown={(e) => handleKeyDown(e, toggleStory, 'Stories')}
						tabindex="0"
						role="button"
						aria-expanded={expandedStories['Stories']}
						aria-label="Toggle Stories visibility"
					>
						<span class="toggle-icon">{expandedStories['Stories'] ? '−' : '+'}</span>
						<span class="item-label">Stories</span>
					</li>

					{#if expandedStories['Stories']}
						<ul class="story-list" transition:slide={{ duration: 150 }}>
							<!-- Each story -->
							{#each Object.keys(elementStructure['Stories']) as storyName}
								{#if hasElements(['Stories', storyName])}
									<li class="tree-story">
										<div
											class="tree-item story-item"
											class:story-selectable={is2DMode && storyName !== 'Stories'}
											class:story-selected={is2DMode && selectedStory === storyName}
											on:click={() => toggleStory(storyName)}
											on:keydown={(e) => handleKeyDown(e, toggleStory, storyName)}
											tabindex="0"
											role="button"
											aria-expanded={expandedStories[storyName]}
											aria-label="Toggle {storyName} visibility"
										>
											<span class="toggle-icon">{expandedStories[storyName] ? '−' : '+'}</span>
											<span class="item-label">{storyName}</span>

											<!-- Show a clickable indicator in 2D mode -->
											{#if is2DMode && storyName !== 'Stories'}
												<span
													class="story-view-indicator"
													title="Click to view this story in 2D mode"
												>
													<span class="material-icons story-icon">
														{selectedStory === storyName ? 'visibility' : 'visibility_off'}
													</span>
												</span>
											{/if}
										</div>

										{#if expandedStories[storyName]}
											<ul class="category-list" transition:slide={{ duration: 150 }}>
												{#each Object.keys(elementTypes) as elementType}
													{#if countElementsInCategory(['Stories', storyName], elementType + 's') > 0}
														<li class="tree-category">
															<div
																class="tree-item category-item"
																on:click={() => toggleCategory(storyName, elementType + 's')}
																on:keydown={(e) =>
																	handleKeyDown(e, toggleCategory, storyName, elementType + 's')}
																tabindex="0"
																role="button"
																aria-expanded={expandedCategories[`${storyName}_${elementType}s`]}
																aria-label="Toggle {elementTypes[elementType].display} visibility"
															>
																<span class="toggle-icon"
																	>{expandedCategories[`${storyName}_${elementType}s`]
																		? '−'
																		: '+'}</span
																>
																<span
																	class="color-indicator"
																	style="background-color: {elementTypes[elementType].color}"
																></span>
																<span class="item-label">{elementTypes[elementType].display}</span>
																<span class="item-count"
																	>({countElementsInCategory(
																		['Stories', storyName],
																		elementType + 's'
																	)})</span
																>
															</div>

															{#if expandedCategories[`${storyName}_${elementType}s`]}
																<ul class="element-list" transition:slide={{ duration: 150 }}>
																	{#each Object.keys(elementStructure['Stories'][storyName][elementType + 's']) as elementLabel}
																		<li
																			class="tree-item element-item"
																			class:selected={selectedElement ===
																				`${elementType}_${elementLabel}`}
																			on:click={() =>
																				selectElementInTree(storyName, elementType, elementLabel)}
																			on:keydown={(e) =>
																				handleKeyDown(
																					e,
																					selectElementInTree,
																					storyName,
																					elementType,
																					elementLabel
																				)}
																			tabindex="0"
																			role="button"
																			aria-label="Select {elementLabel}"
																		>
																			<span class="element-label">{elementLabel}</span>
																		</li>
																	{/each}
																</ul>
															{/if}
														</li>
													{/if}
												{/each}
											</ul>
										{/if}
									</li>
								{/if}
							{/each}
						</ul>
					{/if}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* MODIFIED: Changed background to be transparent */
	.building-tree-view {
		background-color: transparent; /* Changed from #f8fafc to transparent */
		display: flex;
		flex-direction: column;
		overflow: hidden;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 0.75rem;
		color: #333;
		height: 100%;
		border-right: 1px solid rgba(226, 232, 240, 0.5); /* Semi-transparent border */
	}

	/* MODIFIED: More transparent header */
	.tree-header {
		padding: 10px 12px;
		border-bottom: 1px solid rgba(226, 232, 240, 0.5);
		background-color: rgba(241, 245, 249, 0.7); /* Semi-transparent background */
	}

	.search-container {
		position: relative;
	}

	.search-container input {
		width: 100%;
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid rgba(203, 213, 225, 0.8);
		font-size: 0.7rem;
		outline: none;
		transition: border-color 0.2s;
		background-color: rgba(255, 255, 255, 0.9); /* Semi-transparent background */
	}

	.search-container input:focus {
		border-color: rgba(100, 116, 139, 0.8);
	}

	.no-results {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		padding: 6px;
		background-color: rgba(255, 255, 255, 0.9); /* Semi-transparent background */
		border: 1px solid rgba(226, 232, 240, 0.8);
		border-radius: 4px;
		margin-top: 4px;
		font-size: 0.7rem;
		color: #64748b;
		z-index: 10;
	}

	.tree-content {
		overflow-y: auto;
		flex: 1;
		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: rgba(100, 116, 139, 0.3) transparent;
	}

	.story-selectable {
		background-color: rgba(241, 245, 249, 0.7);
		border-left: 2px solid rgba(59, 130, 246, 0.5);
		transition:
			background-color 0.15s,
			border-left-color 0.15s;
	}

	.story-selectable:hover {
		background-color: rgba(219, 234, 254, 0.7);
		border-left-color: rgba(59, 130, 246, 0.8);
	}

	.story-selected {
		background-color: rgba(219, 234, 254, 0.9);
		border-left: 2px solid rgba(37, 99, 235, 0.9);
	}

	.story-view-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 4px;
		color: #64748b;
		font-size: 0.65rem;
	}

	.story-icon {
		font-size: 14px;
	}

	/* Custom scrollbar styling for webkit browsers */
	.tree-content::-webkit-scrollbar {
		width: 6px;
	}

	.tree-content::-webkit-scrollbar-track {
		background: transparent;
	}

	.tree-content::-webkit-scrollbar-thumb {
		background-color: rgba(100, 116, 139, 0.3);
		border-radius: 6px;
		border: 2px solid transparent;
	}

	.tree-content::-webkit-scrollbar-thumb:hover {
		background-color: rgba(100, 116, 139, 0.5);
	}

	.empty-state {
		padding: 16px;
		text-align: center;
		color: #64748b;
		font-size: 0.75rem;
	}

	.tree-root {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.tree-story {
		margin-bottom: 1px;
	}

	.story-list {
		list-style: none;
		padding: 0 0 0 16px;
		margin: 0;
	}

	.category-list {
		list-style: none;
		padding: 0 0 0 16px;
		margin: 0;
	}

	.element-list {
		list-style: none;
		padding: 0 0 0 16px;
		margin: 0;
	}

	.tree-item {
		display: flex;
		align-items: center;
		padding: 4px 8px;
		cursor: pointer;
		transition: background-color 0.15s;
		border-radius: 2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tree-item:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}

	.root-item {
		font-weight: 600;
		color: #334155;
	}

	.story-item {
		font-weight: 500;
	}

	.category-item {
		font-weight: 400;
	}

	.element-item {
		padding: 3px 8px 3px 24px;
	}

	.selected {
		background-color: rgba(0, 0, 0, 0.08);
	}

	.toggle-icon {
		width: 14px;
		display: inline-block;
		text-align: center;
		font-size: 0.7rem;
		color: #64748b;
		margin-right: 2px;
	}

	.color-indicator {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		margin-right: 4px;
		display: inline-block;
	}

	.item-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.element-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-count {
		font-size: 0.65rem;
		color: #64748b;
		margin-left: 2px;
	}

	/* Search Results Styles - MODIFIED for transparency */
	.search-results {
		overflow-y: auto;
		flex: 1;
		/* Custom scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: rgba(100, 116, 139, 0.3) transparent;
	}

	/* Custom scrollbar styling for webkit browsers */
	.search-results::-webkit-scrollbar {
		width: 6px;
	}

	.search-results::-webkit-scrollbar-track {
		background: transparent;
	}

	.search-results::-webkit-scrollbar-thumb {
		background-color: rgba(100, 116, 139, 0.3);
		border-radius: 6px;
		border: 2px solid transparent;
	}

	.search-results::-webkit-scrollbar-thumb:hover {
		background-color: rgba(100, 116, 139, 0.5);
	}

	.results-header {
		padding: 6px 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid rgba(226, 232, 240, 0.5);
		font-size: 0.7rem;
		color: #64748b;
		background-color: rgba(248, 250, 252, 0.7);
	}

	.clear-button {
		background: none;
		border: none;
		color: #64748b;
		font-size: 0.7rem;
		cursor: pointer;
		padding: 2px 4px;
		border-radius: 3px;
	}

	.clear-button:hover {
		background-color: rgba(241, 245, 249, 0.7);
		color: #334155;
	}

	.results-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.result-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		padding: 6px 10px;
		cursor: pointer;
		border-bottom: 1px solid rgba(241, 245, 249, 0.5);
		transition: background-color 0.15s;
	}

	.result-item:hover {
		background-color: rgba(0, 0, 0, 0.03);
	}

	.result-item.selected {
		background-color: rgba(0, 0, 0, 0.08);
	}

	.result-color {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		margin-right: 6px;
	}

	.result-label {
		font-weight: 500;
		font-size: 0.75rem;
	}

	.result-path {
		width: 100%;
		margin-top: 3px;
		padding-left: 14px;
		font-size: 0.65rem;
		color: #64748b;
	}
</style>
