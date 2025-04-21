<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { StoryPerformance } from '$lib/types/FilterTypes';

	// Props
	export let storyPerformance: StoryPerformance[] = [];
	export let performanceType: 'SH' | 'KH' | 'GO' | null = null;

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
</script>

<div class="performance-summary" transition:slide={{ duration: 200 }}>
	<div class="summary-header">
		<h3>{getPerformanceLabel(performanceType)} Sonuçları</h3>

		<div class="overall-status">
			<div class="status-label">Genel Bina Durumu:</div>
			<div class="status-badge {buildingPerformance === 'Sağlıyor' ? 'passing' : 'failing'}">
				{buildingPerformance}
			</div>
		</div>
	</div>

	{#if sortedStories.length === 0}
		<div class="no-results">
			<p>Seçilen kriterlere göre sonuç bulunamadı.</p>
		</div>
	{:else}
		<div class="story-list">
			{#each sortedStories as story}
				<div class="story-item">
					<div class="story-name">{story.story}</div>
					<div class="story-status">
						<div
							class="status-badge {story.performanceStatus === 'Sağlıyor' ? 'passing' : 'failing'}"
						>
							{story.performanceStatus}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="legend">
			<div class="legend-item">
				<div class="legend-color passing"></div>
				<div class="legend-label">Sağlıyor</div>
			</div>
			<div class="legend-item">
				<div class="legend-color failing"></div>
				<div class="legend-label">Sağlamıyor</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.performance-summary {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.summary-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	h3 {
		font-size: 1rem;
		color: #1e3a8a;
		margin: 0;
		font-weight: 500;
	}

	.overall-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-label {
		font-size: 0.8rem;
		color: #64748b;
		font-weight: 500;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.status-badge.passing {
		background-color: #dcfce7;
		color: #16a34a;
	}

	.status-badge.failing {
		background-color: #fee2e2;
		color: #dc2626;
	}

	.story-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.story-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		background-color: #f8fafc;
		border: 1px solid #e2e8f0;
		transition: all 0.15s ease;
	}

	.story-item:hover {
		background-color: #f1f5f9;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.story-name {
		font-size: 0.85rem;
		font-weight: 500;
		color: #334155;
	}

	.no-results {
		text-align: center;
		padding: 1.5rem;
		color: #64748b;
		font-size: 0.9rem;
	}

	.legend {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e2e8f0;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.legend-color {
		width: 16px;
		height: 16px;
		border-radius: 4px;
	}

	.legend-color.passing {
		background-color: #4ade80;
	}

	.legend-color.failing {
		background-color: #ef4444;
	}

	.legend-label {
		font-size: 0.75rem;
		color: #64748b;
	}
</style>
