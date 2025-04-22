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

	// Function to check if all filters are selected
	$: isFilterComplete =
		filters.earthquake !== null && filters.performance !== null && filters.direction !== null;
</script>

<div class="results-filter">
	<div class="filter-groups">
		<!-- Earthquake Filter -->
		<div class="filter-group">
			<div class="filter-label">Deprem Düzeyi</div>
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
			<div class="filter-label">Performans</div>
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
			<div class="filter-label">Yön</div>
			<div class="filter-options">
				<button
					class="filter-btn"
					class:active={filters.direction === 'X'}
					on:click={() => selectDirection(filters.direction === 'X' ? null : 'X')}
				>
					X
				</button>
				<button
					class="filter-btn"
					class:active={filters.direction === 'Y'}
					on:click={() => selectDirection(filters.direction === 'Y' ? null : 'Y')}
				>
					Y
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
							<span class="tag-text">{filters.earthquake}</span>
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
							<span class="tag-text">{filters.performance}</span>
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
							<span class="tag-text">{filters.direction}</span>
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
			<span>Filtreleme tamamlandı.</span>
		</div>
	{:else}
		<div class="filter-status incomplete" transition:fade={{ duration: 150 }}>
			<span class="material-icons status-icon">info</span>
			<span>Tüm kriterleri seçiniz.</span>
		</div>
	{/if}
</div>

<style>
	.results-filter {
		background-color: white;
		border-radius: 4px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		border: 1px solid #f1f5f9;
		padding: 0.75rem;
		margin-bottom: 1rem;
	}

	.filter-groups {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 120px;
	}

	.filter-label {
		font-size: 0.65rem;
		color: #64748b;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	.filter-options {
		display: flex;
		gap: 0.25rem;
	}

	.filter-btn {
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		background-color: #f1f5f9;
		border: 1px solid #e2e8f0;
		color: #334155;
		font-size: 0.7rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-btn:hover {
		background-color: #e2e8f0;
	}

	.filter-btn.active {
		background-color: #5c9fff;
		border-color: #5c9fff;
		color: white;
	}

	/* Active Filters */
	.active-filters {
		padding: 0.5rem;
		background-color: #f8fafc;
		border-radius: 3px;
		margin-top: 0.75rem;
	}

	.filter-content {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.filter-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		flex: 1;
	}

	.filter-tag {
		display: flex;
		align-items: center;
		background-color: #e0f2fe;
		color: #0369a1;
		padding: 0.15rem 0.3rem;
		border-radius: 3px;
		font-size: 0.65rem;
		gap: 0.25rem;
	}

	.tag-text {
		font-weight: 500;
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
		width: 14px;
		height: 14px;
		padding: 0;
		transition: background-color 0.15s ease;
	}

	.tag-remove:hover {
		background-color: rgba(2, 132, 199, 0.15);
	}

	.tag-remove .material-icons {
		font-size: 0.65rem;
	}

	.clear-all-btn {
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		background-color: #f1f5f9;
		border: 1px solid #e2e8f0;
		color: #64748b;
		font-size: 0.65rem;
		cursor: pointer;
		transition: all 0.15s ease;
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
		gap: 0.3rem;
		margin-top: 0.75rem;
		padding: 0.4rem 0.5rem;
		border-radius: 3px;
		font-size: 0.7rem;
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
		font-size: 0.85rem;
	}

	/* Responsive styles */
	@media (max-width: 768px) {
		.filter-groups {
			flex-direction: column;
			gap: 0.75rem;
		}

		.filter-group {
			min-width: 0;
			width: 100%;
		}

		.filter-options {
			justify-content: flex-start;
		}

		.active-filters .filter-content {
			flex-direction: column;
			align-items: flex-start;
		}

		.clear-all-btn {
			align-self: flex-end;
			margin-top: 0.25rem;
		}
	}
</style>
