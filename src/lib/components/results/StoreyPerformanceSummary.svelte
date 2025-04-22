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
</script>

<div class="performance-summary" transition:slide={{ duration: 200 }}>
	<div class="summary-header">
		<h3>{getPerformanceLabel(performanceType)} Sonuçları</h3>

		<div class="overall-status">
			<div class="status-badge {buildingPerformance === 'Sağlıyor' ? 'passing' : 'failing'}">
				<span class="material-icons status-icon">
					{buildingPerformance === 'Sağlıyor' ? 'check_circle' : 'error'}
				</span>
				<span>{buildingPerformance}</span>
			</div>
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
			{#each sortedStories as story}
				<div class="story-item">
					<div class="story-info">
						<span class="story-name">{story.story}</span>
					</div>
					<div
						class="status-badge {story.performanceStatus === 'Sağlıyor' ? 'passing' : 'failing'}"
					>
						<span class="material-icons status-icon">
							{story.performanceStatus === 'Sağlıyor' ? 'check' : 'close'}
						</span>
						<span>{story.performanceStatus}</span>
					</div>
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
		gap: 0.25rem;
	}

	.story-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0.5rem;
		border-radius: 3px;
		background-color: #f8fafc;
		border: 1px solid #f1f5f9;
		transition: all 0.15s ease;
	}

	.story-item:hover {
		background-color: #f1f5f9;
	}

	.story-name {
		font-size: 0.75rem;
		font-weight: 500;
		color: #334155;
	}

	.no-results {
		text-align: center;
		padding: 1rem;
		color: #64748b;
		font-size: 0.8rem;
	}

	@media (max-width: 640px) {
		.data-grid {
			grid-template-columns: 1fr;
		}

		.summary-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
