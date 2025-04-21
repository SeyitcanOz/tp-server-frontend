<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { FilterCriteria } from '$lib/types/FilterTypes';

	// Initial filter state (starts with no filters)
	export let initialFilters: FilterCriteria = {
		earthquake: null,
		performance: null,
		direction: null
	};

	// Export the current filters so parent component can use them
	export let filters: FilterCriteria = { ...initialFilters };

	// Create event dispatcher for filter changes
	const dispatch = createEventDispatcher<{
		filterChange: FilterCriteria;
	}>();

	// Handle earthquake selection
	function selectEarthquake(value: 'DD-1' | 'DD-2' | 'DD-3' | null) {
		filters = { ...filters, earthquake: value };
		emitFilterChange();
	}

	// Handle performance selection
	function selectPerformance(value: 'SH' | 'KH' | 'GO' | null) {
		filters = { ...filters, performance: value };
		emitFilterChange();
	}

	// Handle direction selection
	function selectDirection(value: 'X' | 'Y' | null) {
		filters = { ...filters, direction: value };
		emitFilterChange();
	}

	// Clear all filters
	function clearFilters() {
		filters = { ...initialFilters };
		emitFilterChange();
	}

	// Send the filter change event
	function emitFilterChange() {
		dispatch('filterChange', filters);
	}

	// Map filter values to display names
	const earthquakeNames: Record<string, string> = {
		'DD-1': 'DD-1',
		'DD-2': 'DD-2',
		'DD-3': 'DD-3'
	};

	const performanceNames: Record<string, string> = {
		SH: 'SH (Sınırlı Hasar)',
		KH: 'KH (Kontrollü Hasar)',
		GO: 'GO (Göçme Önleme)'
	};

	const directionNames: Record<string, string> = {
		X: 'X Yönü',
		Y: 'Y Yönü'
	};

	// Function to check if all filters are selected
	$: isFilterComplete =
		filters.earthquake !== null && filters.performance !== null && filters.direction !== null;
</script>

<div class="results-filter">
	<div class="filter-groups">
		<!-- Earthquake Filter -->
		<div class="filter-group">
			<div class="filter-label">Deprem Düzeyi:</div>
			<div class="filter-options">
				<button
					class="filter-btn"
					class:active={filters.earthquake === 'DD-1'}
					on:click={() => selectEarthquake(filters.earthquake === 'DD-1' ? null : 'DD-1')}
				>
					DD-1
				</button>
				<button
					class="filter-btn"
					class:active={filters.earthquake === 'DD-2'}
					on:click={() => selectEarthquake(filters.earthquake === 'DD-2' ? null : 'DD-2')}
				>
					DD-2
				</button>
				<button
					class="filter-btn"
					class:active={filters.earthquake === 'DD-3'}
					on:click={() => selectEarthquake(filters.earthquake === 'DD-3' ? null : 'DD-3')}
				>
					DD-3
				</button>
			</div>
		</div>

		<!-- Performance Filter -->
		<div class="filter-group">
			<div class="filter-label">Performans Düzeyi:</div>
			<div class="filter-options">
				<button
					class="filter-btn"
					class:active={filters.performance === 'SH'}
					on:click={() => selectPerformance(filters.performance === 'SH' ? null : 'SH')}
				>
					SH
				</button>
				<button
					class="filter-btn"
					class:active={filters.performance === 'KH'}
					on:click={() => selectPerformance(filters.performance === 'KH' ? null : 'KH')}
				>
					KH
				</button>
				<button
					class="filter-btn"
					class:active={filters.performance === 'GO'}
					on:click={() => selectPerformance(filters.performance === 'GO' ? null : 'GO')}
				>
					GO
				</button>
			</div>
		</div>

		<!-- Direction Filter -->
		<div class="filter-group">
			<div class="filter-label">Yönü:</div>
			<div class="filter-options">
				<button
					class="filter-btn"
					class:active={filters.direction === 'X'}
					on:click={() => selectDirection(filters.direction === 'X' ? null : 'X')}
				>
					X Yönü
				</button>
				<button
					class="filter-btn"
					class:active={filters.direction === 'Y'}
					on:click={() => selectDirection(filters.direction === 'Y' ? null : 'Y')}
				>
					Y Yönü
				</button>
			</div>
		</div>
	</div>

	{#if filters.earthquake || filters.performance || filters.direction}
		<div class="active-filters" transition:fade={{ duration: 150 }}>
			<div class="filter-content">
				<span class="filter-label">Aktif Filtreler:</span>

				<div class="filter-tags">
					{#if filters.earthquake}
						<div class="filter-tag">
							<span class="tag-icon">
								<span class="material-icons">filter_alt</span>
							</span>
							<span class="tag-text">
								Deprem: {earthquakeNames[filters.earthquake]}
							</span>
							<button
								class="tag-remove"
								on:click={() => selectEarthquake(null)}
								aria-label="Remove earthquake filter"
							>
								<span class="material-icons">close</span>
							</button>
						</div>
					{/if}

					{#if filters.performance}
						<div class="filter-tag">
							<span class="tag-icon">
								<span class="material-icons">filter_alt</span>
							</span>
							<span class="tag-text">
								Performans: {performanceNames[filters.performance]}
							</span>
							<button
								class="tag-remove"
								on:click={() => selectPerformance(null)}
								aria-label="Remove performance filter"
							>
								<span class="material-icons">close</span>
							</button>
						</div>
					{/if}

					{#if filters.direction}
						<div class="filter-tag">
							<span class="tag-icon">
								<span class="material-icons">filter_alt</span>
							</span>
							<span class="tag-text">
								Yönü: {directionNames[filters.direction]}
							</span>
							<button
								class="tag-remove"
								on:click={() => selectDirection(null)}
								aria-label="Remove direction filter"
							>
								<span class="material-icons">close</span>
							</button>
						</div>
					{/if}
				</div>

				<button class="clear-all-btn" on:click={clearFilters}>Temizle</button>
			</div>
		</div>
	{/if}

	{#if isFilterComplete}
		<div class="filter-status complete" transition:fade={{ duration: 150 }}>
			<span class="material-icons status-icon">check_circle</span>
			<span>Filtreleme tamamlandı. Sonuçlar güncellendi.</span>
		</div>
	{:else}
		<div class="filter-status incomplete" transition:fade={{ duration: 150 }}>
			<span class="material-icons status-icon">info</span>
			<span>Tüm filtre kriterlerini seçiniz.</span>
		</div>
	{/if}
</div>

<style>
	.results-filter {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.filter-groups {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
		margin-bottom: 1rem;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 180px;
	}

	.filter-label {
		font-size: 0.75rem;
		color: #64748b;
		font-weight: 500;
	}

	.filter-options {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.filter-btn {
		padding: 0.35rem 0.7rem;
		border-radius: 4px;
		background-color: #f1f5f9;
		border: 1px solid #e2e8f0;
		color: #334155;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.filter-btn:hover {
		background-color: #e2e8f0;
	}

	.filter-btn.active {
		background-color: #3b82f6;
		border-color: #3b82f6;
		color: white;
	}

	/* Active Filters */
	.active-filters {
		padding: 0.8rem;
		background-color: #f8fafc;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
		margin-top: 1rem;
	}

	.filter-content {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		align-items: center;
	}

	.filter-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		flex: 1;
	}

	.filter-tag {
		display: flex;
		align-items: center;
		background-color: #e0f2fe;
		color: #0369a1;
		padding: 0.25rem 0.4rem;
		border-radius: 4px;
		font-size: 0.7rem;
		gap: 0.4rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.tag-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tag-icon .material-icons {
		font-size: 0.75rem;
	}

	.tag-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tag-remove {
		background: none;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #0369a1;
		cursor: pointer;
		border-radius: 50%;
		width: 16px;
		height: 16px;
		padding: 0;
		transition: background-color 0.15s ease;
	}

	.tag-remove:hover {
		background-color: rgba(2, 132, 199, 0.15);
	}

	.tag-remove .material-icons {
		font-size: 0.7rem;
	}

	.clear-all-btn {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		background-color: #f1f5f9;
		border: 1px solid #e2e8f0;
		color: #64748b;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: inherit;
	}

	.clear-all-btn:hover {
		background-color: #e2e8f0;
		color: #475569;
	}

	/* Filter Status */
	.filter-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.6rem 0.8rem;
		border-radius: 6px;
		font-size: 0.75rem;
	}

	.filter-status.complete {
		background-color: #dcfce7;
		color: #16a34a;
	}

	.filter-status.incomplete {
		background-color: #fff7ed;
		color: #f59e0b;
	}

	.status-icon {
		font-size: 1rem;
	}

	/* Responsive styles */
	@media (max-width: 768px) {
		.filter-groups {
			flex-direction: column;
			gap: 1rem;
		}

		.filter-group {
			min-width: 0;
			width: 100%;
		}

		.active-filters .filter-content {
			flex-direction: column;
			align-items: flex-start;
		}

		.clear-all-btn {
			margin-left: 0;
			align-self: flex-end;
			margin-top: 0.5rem;
		}
	}
</style>
