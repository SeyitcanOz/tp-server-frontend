<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';
	import { user } from '$lib/stores/auth';
	import userService from '$lib/services/user';
	import projectService from '$lib/services/project';
	import versionService from '$lib/services/version';
	import downloadService from '$lib/services/download';
	import BuildingPerformanceViewer from '$lib/components/results/BuildingPerformanceViewer.svelte';
	import type { ProjectDetail } from '$lib/types/project';
	import type { ProjectVersion } from '$lib/types/version';

	// Type definitions for the results data
	interface ResultRow {
		[key: string]: any;
	}

	interface ResultsData {
		metadata?: { rowCount: number };
		rows?: ResultRow[];
	}

	// Extend the ProjectVersion type to include properly typed resultsData
	type ExtendedProjectVersion = ProjectVersion & {
		resultsData?: ResultsData | null;
	};

	// Project and version data
	let project: ProjectDetail | null = null;
	let version: ExtendedProjectVersion | null = null;
	let isLoading = true;
	let error: string | null = null;

	// For results table pagination
	let currentPage = 1;
	let pageSize = 20;
	let totalPages = 1;
	let sortColumn: string = '';
	let sortDirection: 'asc' | 'desc' = 'asc';
	let filteredResults: ResultRow[] = [];
	let availableColumns: string[] = [];

	// Download state tracking
	let isDownloading: Record<string, boolean> = {
		project: false,
		dotmodel: false,
		results: false
	};

	// Results Table Toggle Button
	let isResultsExpanded = false;

	// Extract IDs from URL parameters
	$: projectId = $page.params.projectId;
	$: versionNumber = parseInt($page.params.versionNumber);

	// Check if user is admin or project owner
	$: isAdminOrOwner = $user && ($user.roles.includes('Admin') || $user.id === project?.createdBy);

	// Apply filtering and sorting to results
	$: {
		if (version?.resultsData?.rows) {
			// Apply search if query exists
			filteredResults = [...version.resultsData.rows];

			// Apply sorting if a column is selected
			if (sortColumn) {
				filteredResults.sort((a, b) => {
					const aValue = a[sortColumn];
					const bValue = b[sortColumn];

					// Handle different types of values
					if (typeof aValue === 'number' && typeof bValue === 'number') {
						return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
					} else {
						const aString = String(aValue || '');
						const bString = String(bValue || '');
						return sortDirection === 'asc'
							? aString.localeCompare(bString)
							: bString.localeCompare(aString);
					}
				});
			}

			// Recalculate pagination
			totalPages = Math.ceil(filteredResults.length / pageSize);

			// If current page is out of bounds after filtering, reset to page 1
			if (currentPage > totalPages && totalPages > 0) {
				currentPage = 1;
			}
		} else {
			filteredResults = [];
		}
	}

	// Paginated results based on filtered and sorted data
	$: paginatedResults = filteredResults.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	// Check what data is available
	$: hasProjectData = !!version?.projectData && Object.keys(version.projectData || {}).length > 0;
	$: hasModelInfoData =
		!!version?.modelInfoData && Object.keys(version.modelInfoData || {}).length > 0;
	$: hasDotModelData =
		!!version?.dotModelData && Object.keys(version.dotModelData || {}).length > 0;
	$: hasResultsData = !!version?.resultsData?.rows && version.resultsData.rows.length > 0;

	async function loadData() {
		isLoading = true;
		error = null;

		try {
			// Load project data using the project service
			project = await projectService.getProjectById(projectId);

			// Load version data using the version service
			version = await versionService.getVersion(projectId, versionNumber);

			// Get available columns for table
			if (version?.resultsData?.rows && version.resultsData.rows.length > 0) {
				availableColumns = Object.keys(version.resultsData.rows[0]);
			}
		} catch (err) {
			console.error('Error fetching data:', err);
			error = 'Failed to load version details. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Navigate to previous/next version if available
	function goToVersion(newVersionNumber: number) {
		if (newVersionNumber >= 1 && newVersionNumber <= (project?.currentVersion || 0)) {
			window.location.href = `/projects/${projectId}/versions/${newVersionNumber}`;
		}
	}

	// Mark this version as the current version
	async function makeCurrentVersion() {
		if (!confirm('Set this as the current version?')) {
			return;
		}

		try {
			// Use version service to set current version
			await versionService.setCurrentVersion(projectId, versionNumber);
			// Reload data to refresh the UI
			await loadData();
		} catch (err) {
			console.error('Error setting current version:', err);
			alert('Failed to update current version. Please try again.');
		}
	}

	// Download handlers using download service
	async function downloadProjectZip() {
		if (isDownloading.project || !hasProjectData) return;

		try {
			isDownloading.project = true;
			await downloadService.downloadProjectZip(projectId, versionNumber);
		} catch (err) {
			console.error('Error downloading project:', err);
			alert('Failed to download project. Please try again.');
		} finally {
			isDownloading.project = false;
		}
	}

	async function downloadDotModel() {
		if (isDownloading.dotmodel || !hasDotModelData) return;

		try {
			isDownloading.dotmodel = true;
			await downloadService.downloadDotModel(projectId, versionNumber);
		} catch (err) {
			console.error('Error downloading model file:', err);
			alert('Failed to download model file. Please try again.');
		} finally {
			isDownloading.dotmodel = false;
		}
	}

	async function downloadResultsCsv() {
		if (isDownloading.results || !hasResultsData) return;

		try {
			isDownloading.results = true;
			await downloadService.downloadResultsCsv(projectId, versionNumber);
		} catch (err) {
			console.error('Error downloading results CSV:', err);
			alert('Failed to download results. Please try again.');
		} finally {
			isDownloading.results = false;
		}
	}

	function toggleResultsSection() {
		isResultsExpanded = !isResultsExpanded;
	}

	// Sort results by column
	function sortByColumn(column: string) {
		if (sortColumn === column) {
			// If already sorting by this column, toggle direction
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// New column, default to ascending
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	// Pagination handlers
	function changePage(newPage: number) {
		if (newPage >= 1 && newPage <= totalPages) {
			currentPage = newPage;
		}
	}

	// Get the column headers for the results table
	function getResultsHeaders(): string[] {
		return availableColumns;
	}

	// Format cell value for display
	function formatCellValue(value: any): string {
		if (value === null || value === undefined) return '-';
		if (typeof value === 'boolean') return value ? 'Yes' : 'No';
		return String(value);
	}

	// Page title
	$: pageTitle =
		project && version
			? `Version #${versionNumber} of ${project.projectName} - TPServer`
			: 'Version Details - TPServer';

	onMount(() => {
		loadData();
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content="Project version details" />
	<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
</svelte:head>

<div class="container">
	{#if isLoading}
		<div class="loading-container">
			<div class="loader"></div>
			<p>Loading version details...</p>
		</div>
	{:else if error}
		<div class="error-container">
			<span class="material-icons error-icon">error_outline</span>
			<p>{error}</p>
			<div class="error-actions">
				<button class="btn-primary" on:click={loadData}>Try Again</button>
				<a href={`/projects/${projectId}`} class="btn-secondary">Back to Project</a>
			</div>
		</div>
	{:else if project && version}
		<div class="page-header">
			<div class="breadcrumbs">
				<a href="/projects">Projects</a> <span class="separator">/</span>
				<a href={`/projects/${projectId}`}>{project.projectName}</a>
				<span class="separator">/</span>
				Version #{versionNumber}
			</div>

			<div class="header-content">
				<div class="header-left">
					<h1>Version #{versionNumber}</h1>
				</div>

				<div class="header-actions">
					<!-- Version Navigation -->
					<div class="version-navigation">
						<button
							class="btn btn-outline btn-nav"
							disabled={versionNumber <= 1}
							on:click={() => goToVersion(versionNumber - 1)}
							title={versionNumber <= 1
								? 'This is the first version'
								: `Go to version ${versionNumber - 1}`}
						>
							<span class="material-icons">chevron_left</span>
							Previous
						</button>
						<button
							class="btn btn-outline btn-nav"
							disabled={versionNumber >= project.currentVersion}
							on:click={() => goToVersion(versionNumber + 1)}
							title={versionNumber >= project.currentVersion
								? 'This is the latest version'
								: `Go to version ${versionNumber + 1}`}
						>
							Next
							<span class="material-icons">chevron_right</span>
						</button>
					</div>

					{#if isAdminOrOwner && versionNumber !== project.currentVersion}
						<button class="btn btn-primary" on:click={makeCurrentVersion}>
							<span class="material-icons">check_circle</span>
							Set as Current
						</button>
					{/if}
				</div>
			</div>
		</div>

		<!-- Combined Information and Downloads Card -->
		<div class="unified-card">
			<!-- Version Information Section -->
			<div class="card-section">
				<div class="section-header">
					<h2>Version Information</h2>
				</div>
				<div class="info-row">
					<div class="info-item">
						<span class="label">Version ID</span>
						<span class="value">{version.id}</span>
					</div>

					<div class="info-item">
						<span class="label">Created On</span>
						<span class="value">{formatDate(version.createdAt)}</span>
					</div>

					<div class="info-item">
						<span class="label">Status</span>
						<span class="value">
							{#if versionNumber === project.currentVersion}
								<span class="status-indicator current">Current Version</span>
							{:else}
								<span class="status-indicator">Previous Version</span>
							{/if}
						</span>
					</div>
				</div>
			</div>

			<!-- Divider -->
			<div class="card-divider"></div>

			<!-- Downloads Section -->
			<div class="card-section">
				<div class="section-header">
					<h2>Downloads</h2>
				</div>
				<div class="download-row">
					<button
						class="download-btn"
						class:disabled={!hasProjectData}
						disabled={!hasProjectData || isDownloading.project}
						on:click={downloadProjectZip}
					>
						{#if isDownloading.project}
							<div class="button-spinner"></div>
						{:else}
							<div class="btn-icon project">
								<span class="material-icons">folder</span>
							</div>
						{/if}
						<div class="btn-content">
							<span class="btn-title">Project Files</span>
							<span class="btn-subtitle">TP Project Folder</span>
						</div>
					</button>

					<button
						class="download-btn"
						class:disabled={!hasDotModelData}
						disabled={!hasDotModelData || isDownloading.dotmodel}
						on:click={downloadDotModel}
					>
						{#if isDownloading.dotmodel}
							<div class="button-spinner"></div>
						{:else}
							<div class="btn-icon model">
								<span class="material-icons">data_object</span>
							</div>
						{/if}
						<div class="btn-content">
							<span class="btn-title">Model File</span>
							<span class="btn-subtitle">.MODEL Format</span>
						</div>
					</button>

					<button
						class="download-btn"
						class:disabled={!hasResultsData}
						disabled={!hasResultsData || isDownloading.results}
						on:click={downloadResultsCsv}
					>
						{#if isDownloading.results}
							<div class="button-spinner"></div>
						{:else}
							<div class="btn-icon csv">
								<span class="material-icons">table_chart</span>
							</div>
						{/if}
						<div class="btn-content">
							<span class="btn-title">Results Data</span>
							<span class="btn-subtitle">CSV Format</span>
						</div>
					</button>
				</div>
			</div>
		</div>

		<!-- 3D Model Viewer Section -->
		<BuildingPerformanceViewer {version} height="600px" />

		<!-- Results Section -->
		<div class="results-section">
			<div class="results-header">
				<h2>Analysis Results</h2>
				<div class="header-actions">
					<!-- Add results info with conditional styling -->
					{#if version?.resultsData?.rows && version.resultsData.rows.length > 0}
						<div class="results-info">
							<span class="results-count">
								Showing {Math.min(
									(currentPage - 1) * pageSize + 1,
									version.resultsData.rows.length
								)}-{Math.min(currentPage * pageSize, version.resultsData.rows.length)} of {version
									.resultsData.rows.length} results
							</span>
						</div>
					{/if}
					<!-- Add toggle button -->
					<button
						class="toggle-button"
						on:click={toggleResultsSection}
						aria-label={isResultsExpanded ? 'Collapse' : 'Expand'}
					>
						<span class="material-icons"
							>{isResultsExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span
						>
					</button>
				</div>
			</div>

			<!-- Wrap content in a conditional block based on expanded state -->
			{#if isResultsExpanded}
				{#if hasResultsData}
					<div class="results-table-container" transition:slide={{ duration: 300 }}>
						<div class="table-wrapper">
							<table class="results-table">
								<thead>
									<tr>
										{#each getResultsHeaders() as header}
											<th>
												<button class="header-button" on:click={() => sortByColumn(header)}>
													{header}
													{#if sortColumn === header}
														<span class="sort-indicator">
															{sortDirection === 'asc' ? '↑' : '↓'}
														</span>
													{/if}
												</button>
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#if filteredResults.length === 0}
										<tr>
											<td colspan={getResultsHeaders().length} class="no-results-cell">
												No results available
											</td>
										</tr>
									{:else}
										{#each paginatedResults as row}
											<tr>
												{#each getResultsHeaders() as header}
													<td>{formatCellValue(row[header])}</td>
												{/each}
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>

						{#if totalPages > 1}
							<div class="pagination">
								<button
									class="pagination-button tooltip"
									on:click={() => changePage(1)}
									disabled={currentPage === 1}
									data-tooltip="First Page"
								>
									<span class="material-icons">first_page</span>
								</button>

								<button
									class="pagination-button tooltip"
									on:click={() => changePage(currentPage - 1)}
									disabled={currentPage === 1}
									data-tooltip="Previous Page"
								>
									<span class="material-icons">chevron_left</span>
								</button>

								<div class="page-numbers">
									{#if totalPages <= 7}
										{#each Array(totalPages) as _, i}
											<button
												class="page-number"
												class:active={currentPage === i + 1}
												on:click={() => changePage(i + 1)}
											>
												{i + 1}
											</button>
										{/each}
									{:else}
										<!-- First page always shown -->
										<button
											class="page-number"
											class:active={currentPage === 1}
											on:click={() => changePage(1)}
										>
											1
										</button>

										<!-- Show ellipsis if we're not at the beginning -->
										{#if currentPage > 3}
											<span class="page-ellipsis">...</span>
										{/if}

										<!-- Pages around current page -->
										{#each Array(Math.min(5, totalPages)).fill(0) as _, i}
											{#if currentPage - 2 + i > 1 && currentPage - 2 + i < totalPages}
												<button
													class="page-number"
													class:active={currentPage === currentPage - 2 + i}
													on:click={() => changePage(currentPage - 2 + i)}
												>
													{currentPage - 2 + i}
												</button>
											{/if}
										{/each}

										<!-- Show ellipsis if we're not at the end -->
										{#if currentPage < totalPages - 2}
											<span class="page-ellipsis">...</span>
										{/if}

										<!-- Last page always shown -->
										<button
											class="page-number"
											class:active={currentPage === totalPages}
											on:click={() => changePage(totalPages)}
										>
											{totalPages}
										</button>
									{/if}
								</div>

								<button
									class="pagination-button tooltip"
									on:click={() => changePage(currentPage + 1)}
									disabled={currentPage === totalPages}
									data-tooltip="Next Page"
								>
									<span class="material-icons">chevron_right</span>
								</button>

								<button
									class="pagination-button tooltip"
									on:click={() => changePage(totalPages)}
									disabled={currentPage === totalPages}
									data-tooltip="Last Page"
								>
									<span class="material-icons">last_page</span>
								</button>

								<div class="pagination-info">
									<span>Page {currentPage} of {totalPages}</span>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="no-results" transition:slide={{ duration: 300 }}>
						<span class="material-icons no-results-icon">analytics</span>
						<p>No results data available for this version</p>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Base Styles */
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.8rem;
	}

	/* Header Styles */
	.page-header {
		margin-bottom: 1rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.breadcrumbs {
		font-size: 0.8rem;
		color: #64748b;
		margin-bottom: 0.5rem;
	}

	.breadcrumbs a {
		color: #5c9fff;
		text-decoration: none;
	}

	.breadcrumbs a:hover {
		text-decoration: underline;
	}

	.separator {
		padding: 0 0.3rem;
		color: #94a3b8;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0;
		color: #1e3a8a;
		font-weight: 500;
	}

	/* Loading & Error Styles */
	.loading-container,
	.error-container {
		padding: 3rem 1.5rem;
		text-align: center;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin-bottom: 1.5rem;
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

	.error-icon {
		font-size: 2.5rem;
		color: #dc2626;
	}

	.error-container p {
		color: #dc2626;
		font-weight: 500;
		font-size: 0.9rem;
	}

	.error-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	/* Info Card */
	.unified-card {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		padding: 0;
		margin-bottom: 1.5rem;
		border-top: 4px solid #5c9fff;
	}

	.card-section {
		padding: 1.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #f0f0f0;
		padding-bottom: 1rem;
	}

	.section-header h2 {
		margin: 0;
		font-size: 1.2rem;
		color: #1e3a8a;
		font-weight: 500;
	}

	.card-divider {
		height: 1px;
		background-color: #e2e8f0;
		margin: 0;
	}

	.info-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		position: relative;
		padding-bottom: 0.5rem;
	}

	.info-item:after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 40px;
		height: 1px;
		background-color: #f0f0f0;
	}

	.label {
		font-size: 0.75rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.value {
		font-size: 0.9rem;
		color: #1e293b;
		font-weight: 500;
	}

	.status-indicator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 500;
		background-color: #f1f5f9;
		color: #64748b;
	}

	.status-indicator.current {
		background-color: #dcfce7;
		color: #16a34a;
	}

	/* Download Buttons */
	.download-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: flex-start;
	}

	.download-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background-color: #f8f9fa;
		border: none;
		border-radius: 5px;
		color: #334155;
		font-size: 0.8rem;
		font-weight: 600;
		transition: all 0.2s;
		cursor: pointer;
		gap: 0.4rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		min-width: auto;
		flex: 0 1 auto;
	}

	.download-btn:not(.disabled):not(:disabled):hover {
		transform: translateY(-2px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.download-btn.disabled,
	.download-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 5px;
		flex-shrink: 0;
	}

	.btn-icon .material-icons {
		font-size: 1.1rem;
	}

	.btn-icon.project {
		background-color: #fffbeb; /* Light yellow */
		color: #d97706; /* Amber/yellow */
	}

	.btn-icon.model {
		background-color: #f0f4ff; /* Light blue */
		color: #5c9fff; /* Blue */
	}

	.btn-icon.csv {
		background-color: #dcfce7; /* Light green */
		color: #16a34a; /* Green */
	}

	.btn-content {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.btn-title {
		font-weight: 600;
		color: #1e293b;
		font-size: 0.8rem;
	}

	.btn-subtitle {
		color: #64748b;
		font-size: 0.7rem;
		margin-top: 0.15rem;
	}

	.button-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(92, 159, 255, 0.2);
		border-left-color: #5c9fff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	/* Toggle button style - similar to the one in ModelViewer */
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

	/* Update header-actions to handle multiple items */
	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	/* Adjust results-info for new positioning */
	.results-info {
		display: flex;
		align-items: center;
	}

	/* Version Navigation */
	.header-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.version-navigation {
		display: flex;
		gap: 0.5rem;
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s;
		border: none;
		font-size: 0.85rem;
	}

	.btn-primary {
		background-color: #5c9fff;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #4a89e8;
	}

	.btn-outline {
		background-color: #f1f5f9;
		color: #334155;
		border: 1px solid #e2e8f0;
	}

	.btn-outline:hover:not(:disabled) {
		background-color: #e2e8f0;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-nav {
		white-space: nowrap;
	}

	/* Results Section */
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

	.results-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.results-count {
		font-size: 0.8rem;
		color: #64748b;
	}

	/* Results Table */
	.results-table-container {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
	}

	.table-wrapper {
		overflow-x: auto;
		max-height: 600px;
		overflow-y: auto;
	}

	.results-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.results-table th {
		position: sticky;
		top: 0;
		background-color: #f8fafc;
		z-index: 10;
		border-bottom: 1px solid #e2e8f0;
		padding: 0;
		font-weight: 500;
		color: #64748b;
		text-align: center;
	}

	.header-button {
		width: 100%;
		height: 100%;
		padding: 0.75rem 1rem;
		text-align: center;
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s;
	}

	.header-button:hover {
		background-color: #f1f5f9;
	}

	.sort-indicator {
		color: #5c9fff;
		font-weight: bold;
		margin-left: 0.3rem;
	}

	.results-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #f1f5f9;
		color: #1e293b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
		text-align: center;
	}

	.results-table tr:last-child td {
		border-bottom: none;
	}

	.results-table tr:hover td {
		background-color: #f8fafc;
	}

	.no-results-cell {
		text-align: center;
		padding: 2rem;
		color: #64748b;
		font-style: italic;
	}

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

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.25rem;
		padding: 1rem;
		border-top: 1px solid #f1f5f9;
		background-color: #f8fafc;
		flex-wrap: wrap;
	}

	.pagination-button {
		width: 26px;
		height: 26px;
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f1f5f9;
		border: 1px solid #e2e8f0;
		color: #64748b;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.pagination-button .material-icons {
		font-size: 0.9rem;
	}

	.pagination-button:hover:not(:disabled) {
		background-color: #e2e8f0;
	}

	.pagination-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.page-numbers {
		display: flex;
		gap: 0.15rem;
	}

	.page-number {
		width: 26px;
		height: 26px;
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: transparent;
		border: 1px solid #e2e8f0;
		color: #64748b;
		font-weight: 400;
		cursor: pointer;
		transition: all 0.15s ease;
		font-size: 0.75rem;
	}

	.page-number.active {
		background-color: #5c9fff;
		color: white;
		border-color: #5c9fff;
	}

	.page-number:hover:not(.active) {
		background-color: #f1f5f9;
	}

	.page-ellipsis {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		color: #64748b;
		font-size: 0.75rem;
	}

	.pagination-info {
		margin-left: 0.5rem;
		color: #64748b;
		font-size: 0.7rem;
	}

	/* Tooltip styles */
	.tooltip {
		position: relative;
	}

	.tooltip:hover::after {
		content: attr(data-tooltip);
		position: absolute;
		top: -30px;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.25rem 0.5rem;
		background-color: rgba(0, 0, 0, 0.8);
		color: white;
		border-radius: 3px;
		font-size: 0.7rem;
		white-space: nowrap;
		z-index: 1010;
		pointer-events: none;
		opacity: 0;
		animation: fadeIn 0.2s ease-in-out forwards;
	}

	.tooltip:hover::before {
		content: '';
		position: absolute;
		top: -10px;
		left: 50%;
		transform: translateX(-50%);
		border-width: 5px;
		border-style: solid;
		border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
		z-index: 1010;
		opacity: 0;
		animation: fadeIn 0.2s ease-in-out forwards;
	}

	/* Special treatment for pagination tooltips */
	.pagination .tooltip:hover::after {
		top: auto;
		bottom: 35px;
	}

	.pagination .tooltip:hover::before {
		top: auto;
		bottom: 25px;
		border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
	}

	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}

	/* Buttons */
	.btn-primary,
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background-color: #5c9fff;
		color: white;
		border: none;
	}

	.btn-primary:hover {
		background-color: #4a89e8;
	}

	.btn-secondary {
		background-color: #f1f5f9;
		color: #334155;
		border: 1px solid #e2e8f0;
	}

	.btn-secondary:hover {
		background-color: #e2e8f0;
	}

	/* Responsive Styles */
	@media (max-width: 992px) {
		.header-content {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.header-actions {
			width: 100%;
		}

		.version-navigation {
			width: 100%;
		}

		.btn-nav {
			flex: 1;
		}

		.info-row {
			flex-direction: column;
			gap: 1rem;
		}

		.download-row {
			flex-direction: column;
		}

		.results-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
	}

	@media (max-width: 768px) {
		.table-wrapper {
			overflow-x: auto;
		}

		.results-table {
			min-width: 600px;
		}

		.pagination {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.pagination-info {
			width: auto;
			text-align: center;
			margin: 0;
		}
	}

	@media (max-width: 576px) {
		.header-actions {
			flex-direction: column;
			gap: 0.5rem;
		}

		.btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
