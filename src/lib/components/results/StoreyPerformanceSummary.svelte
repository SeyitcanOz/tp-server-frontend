<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { StoryPerformance } from '$lib/types/FilterTypes';

	// Props
	export let storyPerformance: StoryPerformance[] = [];
	export let performanceType: 'SH' | 'KH' | 'GO' | null = null;
	export let direction: 'X' | 'Y' | null = null;
	export let summarizedData: {
		maxDrift: number;
		avgDrift: number;
		maxNN0: number;
		avgNN0: number;
	} | null = null;

	// For toggling detailed view
	let showDetailedView = false;
	// Track which stories are expanded in detailed view
	let expandedStories = new Set<string>();

	// Toggle expansion for a specific story
	function toggleStoryExpansion(storyName: string) {
		if (expandedStories.has(storyName)) {
			expandedStories.delete(storyName);
		} else {
			expandedStories.add(storyName);
		}
		expandedStories = expandedStories; // Trigger Svelte reactivity
	}

	// Format the performance type for display
	function getPerformanceLabel(type: 'SH' | 'KH' | 'GO' | null): string {
		switch (type) {
			case 'SH':
				return 'Sınırlı Hasar (SH)';
			case 'KH':
				return 'Kontrollü Hasar (KH)';
			case 'GO':
				return 'Göçme Önleme (GO)';
			default:
				return 'Performans Değerlendirmesi';
		}
	}

	// Sort stories in a logical order (Bodrum first, then Kat 1, Kat 2, etc.)
	function sortStories(stories: StoryPerformance[]): StoryPerformance[] {
		return [...stories].sort((a, b) => {
			// Bodrum always comes first
			if (a.story === 'Bodrum') return -1;
			if (b.story === 'Bodrum') return 1;

			// Extract numbers from "Kat X" format
			const aMatch = a.story.match(/Kat (\d+)/);
			const bMatch = b.story.match(/Kat (\d+)/);

			if (aMatch && bMatch) {
				return parseInt(aMatch[1]) - parseInt(bMatch[1]);
			}

			// Fallback to alphabetical sorting
			return a.story.localeCompare(b.story);
		});
	}

	// Calculate overall building performance
	$: buildingPerformance = storyPerformance.some(
		(story) => story.performanceStatus === 'Sağlamıyor'
	)
		? 'Sağlamıyor'
		: 'Sağlıyor';

	// Sort stories for display
	$: sortedStories = sortStories(storyPerformance);

	// Format the number to fixed decimal places
	function formatNumber(value: number | null | undefined): string {
		if (value === null || value === undefined) return '-';
		return value.toFixed(4);
	}

	// Toggle between summary and detailed view
	function toggleDetailedView() {
		showDetailedView = !showDetailedView;
		// Reset expanded stories when toggling view
		expandedStories = new Set();
	}

	// Check if a story has any detail data
	function hasDetailData(story: any): boolean {
		return (
			story.maxDrift !== undefined ||
			story.avgDrift !== undefined ||
			story.maxNN0 !== undefined ||
			story.avgNN0 !== undefined
		);
	}
</script>

<div class="performance-summary" transition:slide={{ duration: 200 }}>
	<div class="summary-header">
		<h3>{getPerformanceLabel(performanceType)} Sonuçları</h3>

		<div class="header-actions">
			<div class="overall-status">
				<div class="status-badge {buildingPerformance === 'Sağlıyor' ? 'passing' : 'failing'}">
					<span class="material-icons status-icon">
						{buildingPerformance === 'Sağlıyor' ? 'check_circle' : 'error'}
					</span>
					<span>{buildingPerformance}</span>
				</div>
			</div>

			<button class="view-toggle-btn" on:click={toggleDetailedView}>
				<span class="material-icons">
					{showDetailedView ? 'view_list' : 'analytics'}
				</span>
				<span class="toggle-text">
					{showDetailedView ? 'Basit Görünüm' : 'Detaylı Görünüm'}
				</span>
			</button>
		</div>
	</div>

	{#if sortedStories.length === 0}
		<div class="no-results">
			<p>Seçilen kriterlere göre sonuç bulunamadı.</p>
		</div>
	{:else}
		<!-- Performance Data Summary -->
		{#if summarizedData}
			<div class="data-summary">
				<div class="data-grid">
					<div class="data-item">
						<div class="data-label">Maks. Göreli Kat Ötelemesi ({direction})</div>
						<div class="data-value">{formatNumber(summarizedData.maxDrift)}</div>
					</div>
					<div class="data-item">
						<div class="data-label">Ort. Göreli Kat Ötelemesi ({direction})</div>
						<div class="data-value">{formatNumber(summarizedData.avgDrift)}</div>
					</div>
					<div class="data-item">
						<div class="data-label">Maks. N/N₀</div>
						<div class="data-value">{formatNumber(summarizedData.maxNN0)}</div>
					</div>
					<div class="data-item">
						<div class="data-label">Ort. N/N₀</div>
						<div class="data-value">{formatNumber(summarizedData.avgNN0)}</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Story Performance List -->
		<div class="story-list">
			{#each sortedStories as story (story.story)}
				<div class="story-item">
					<div class="story-header">
						<div class="story-info">
							<span class="story-name">{story.story}</span>
						</div>
						<div class="story-actions">
							<div
								class="status-badge {story.performanceStatus === 'Sağlıyor'
									? 'passing'
									: 'failing'}"
							>
								<span class="material-icons status-icon">
									{story.performanceStatus === 'Sağlıyor' ? 'check' : 'close'}
								</span>
								<span>{story.performanceStatus}</span>
							</div>

							{#if showDetailedView && hasDetailData(story)}
								<button
									class="expand-btn"
									on:click={() => toggleStoryExpansion(story.story)}
									aria-label={expandedStories.has(story.story)
										? 'Collapse details'
										: 'Expand details'}
								>
									<span class="material-icons">
										{expandedStories.has(story.story) ? 'expand_less' : 'expand_more'}
									</span>
								</button>
							{/if}
						</div>
					</div>

					{#if showDetailedView && expandedStories.has(story.story)}
						<div class="story-details" transition:slide={{ duration: 200 }}>
							<div class="details-grid">
								{#if story.maxDrift !== undefined && direction}
									<div class="detail-item">
										<div class="detail-label">Maks. Göreli Kat Ötelemesi ({direction})</div>
										<div class="detail-value">{formatNumber(story.maxDrift)}</div>
									</div>
								{/if}

								{#if story.avgDrift !== undefined && direction}
									<div class="detail-item">
										<div class="detail-label">Ort. Göreli Kat Ötelemesi ({direction})</div>
										<div class="detail-value">{formatNumber(story.avgDrift)}</div>
									</div>
								{/if}

								{#if story.maxNN0 !== undefined}
									<div class="detail-item">
										<div class="detail-label">Maks. N/N₀</div>
										<div class="detail-value">{formatNumber(story.maxNN0)}</div>
									</div>
								{/if}

								{#if story.avgNN0 !== undefined}
									<div class="detail-item">
										<div class="detail-label">Ort. N/N₀</div>
										<div class="detail-value">{formatNumber(story.avgNN0)}</div>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.performance-summary {
		background-color: white;
		border-radius: 4px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		border: 1px solid #f1f5f9;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.summary-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #f1f5f9;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h3 {
		font-size: 0.9rem;
		color: #1e3a8a;
		margin: 0;
		font-weight: 500;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		font-size: 0.7rem;
		font-weight: 500;
	}

	.status-icon {
		font-size: 0.8rem;
	}

	.status-badge.passing {
		background-color: #dcfce7;
		color: #16a34a;
	}

	.status-badge.failing {
		background-color: #fee2e2;
		color: #dc2626;
	}

	/* Toggle button styling */
	.view-toggle-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		background-color: #f1f5f9;
		border: 1px solid #e2e8f0;
		color: #334155;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.view-toggle-btn:hover {
		background-color: #e2e8f0;
	}

	.view-toggle-btn .material-icons {
		font-size: 0.85rem;
	}

	.toggle-text {
		font-weight: 500;
	}

	/* Data Summary Section */
	.data-summary {
		margin-bottom: 1rem;
		background-color: #f8fafc;
		border-radius: 3px;
		padding: 0.75rem;
	}

	.data-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.data-item {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.data-label {
		font-size: 0.65rem;
		color: #64748b;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	.data-value {
		font-size: 0.9rem;
		color: #1e3a8a;
		font-weight: 600;
	}

	/* Story Performance List */
	.story-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.story-item {
		border-radius: 3px;
		background-color: #f8fafc;
		border: 1px solid #f1f5f9;
		transition: all 0.15s ease;
		overflow: hidden;
	}

	.story-item:hover {
		border-color: #e2e8f0;
	}

	.story-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
	}

	.story-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.story-name {
		font-size: 0.8rem;
		font-weight: 500;
		color: #334155;
	}

	/* Story Details section */
	.story-details {
		padding: 0.5rem 0.75rem;
		background-color: white;
		border-top: 1px solid #f1f5f9;
	}

	.details-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.detail-label {
		font-size: 0.65rem;
		color: #64748b;
	}

	.detail-value {
		font-size: 0.8rem;
		color: #334155;
		font-weight: 500;
	}

	/* Expand button styling */
	.expand-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		border: 1px solid #e2e8f0;
		background-color: #f1f5f9;
		color: #64748b;
		cursor: pointer;
		transition: all 0.15s ease;
		padding: 0;
	}

	.expand-btn:hover {
		background-color: #e2e8f0;
	}

	.expand-btn .material-icons {
		font-size: 1rem;
	}

	.no-results {
		text-align: center;
		padding: 1rem;
		color: #64748b;
		font-size: 0.8rem;
	}

	/* Responsive styles */
	@media (max-width: 768px) {
		.summary-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.header-actions {
			width: 100%;
			justify-content: space-between;
		}

		.data-grid,
		.details-grid {
			grid-template-columns: 1fr;
		}

		.toggle-text {
			display: none; /* Hide text on small screens */
		}
	}

	@media (max-width: 640px) {
		.story-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.story-actions {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
