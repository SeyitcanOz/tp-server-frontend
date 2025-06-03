<!-- EditProjectComponent.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { user } from '$lib/stores/auth';
	import api from '$lib/services/api';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { ProjectDetail } from '$lib/types/project';

	// Component props
	export let projectId: string;
	export let onClose: () => void = () => {}; // Default empty function

	const dispatch = createEventDispatcher();

	// Project data
	let project: ProjectDetail | null = null;
	let isLoading = true;
	let isSaving = false;
	let error: string | null = null;
	let saveSuccess = false;

	// Form fields
	let projectName = '';
	let modellingType = '';
	let formElement: HTMLFormElement;

	// Form validation
	let errors: Record<string, string> = {};

	// Track if the form is focused to prevent scroll propagation
	let isFormFocused = false;

	// Check if user is admin or project owner
	$: isAdminOrOwner = $user && ($user.roles.includes('Admin') || $user.id === project?.createdBy);

	async function loadProject() {
		isLoading = true;
		error = null;

		try {
			const response = await api.get<ProjectDetail>(`/api/projects/${projectId}`);
			project = response.data;

			// Initialize form fields
			projectName = project.projectName;
			modellingType = project.modellingType;
		} catch (err) {
			console.error('Error fetching project details:', err);
			error = 'Failed to load project details. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function validateForm(): boolean {
		errors = {};
		let isValid = true;

		if (!projectName.trim()) {
			errors.projectName = 'Project name is required';
			isValid = false;
		} else if (!/^\d{2}-\d{2}-M\d{2}-\d{2}(-[A-Z])?$/.test(projectName)) {
			errors.projectName =
				'Project name must follow format: XX-XX-MXX-XX (e.g. 02-30-M02-01) or XX-XX-MXX-XX-X (e.g. 02-30-M02-01-A)';
			isValid = false;
		}

		if (!modellingType.trim()) {
			errors.modellingType = 'Modelling type is required';
			isValid = false;
		}

		return isValid;
	}

	async function handleSubmit() {
		if (!validateForm()) return;

		isSaving = true;
		error = null;
		saveSuccess = false;

		try {
			await api.put(`/api/projects/${projectId}`, {
				projectName,
				modellingType
			});

			saveSuccess = true;

			// Dispatch success event
			dispatch('saved', {
				projectId,
				projectName,
				modellingType
			});

			// Keep the success screen open - don't close immediately
		} catch (err) {
			console.error('Error updating project:', err);

			// Handle specific error types
			if (err && typeof err === 'object' && 'response' in err) {
				const axiosError = err as { response?: { data?: { message?: string } } };
				if (axiosError.response?.data?.message) {
					error = axiosError.response.data.message;
				} else {
					error = 'Failed to update project. Please try again.';
				}
			} else {
				error = 'Failed to update project. Please try again.';
			}
			isSaving = false;
		}
	}

	function handleClose() {
		// Reset saving state first
		isSaving = false;
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !isSaving && !saveSuccess) {
			handleClose();
		}
	}

	// Prevent scrolling of the background when scrolling inside the modal
	function handleWheel(event: WheelEvent) {
		if (!isFormFocused) return;

		// Only if we're at the top or bottom of the scrollable area
		const target = event.currentTarget as HTMLElement;
		const isAtTop = target.scrollTop === 0;
		const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;

		if ((isAtTop && event.deltaY < 0) || (isAtBottom && event.deltaY > 0)) {
			event.preventDefault();
		}

		// Stop propagation to prevent background scrolling
		event.stopPropagation();
	}

	// Handle focus and blur events for the form
	function handleFormFocus() {
		isFormFocused = true;
	}

	function handleFormBlur() {
		isFormFocused = false;
	}

	onMount(() => {
		// Check if user has permission to edit
		if (!$user) {
			dispatch('unauthorized');
			onClose();
			return;
		}

		loadProject();

		if (formElement) {
			formElement.addEventListener('focus', handleFormFocus, true);
			formElement.addEventListener('blur', handleFormBlur, true);
		}

		return () => {
			if (formElement) {
				formElement.removeEventListener('focus', handleFormFocus, true);
				formElement.removeEventListener('blur', handleFormBlur, true);
			}
		};
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="overlay" transition:fade={{ duration: 200 }}>
	<div class="form-container" in:fly={{ y: 20, duration: 300, easing: cubicOut }}>
		<div class="form-card">
			<!-- Header changes based on success status -->
			{#if saveSuccess && project}
				<div class="form-header success-header" in:fly={{ y: -10, duration: 300 }}>
					<div class="header-icon">
						<span class="material-icons">check_circle</span>
					</div>
					<div class="header-text">
						<h1>Project Updated Successfully</h1>
						<p class="header-subtitle">Your project has been updated</p>
					</div>
					<button class="close-btn" on:click={handleClose} aria-label="Close">
						<span class="material-icons">close</span>
					</button>
				</div>
			{:else}
				<div class="form-header">
					<div class="header-icon">
						<span class="material-icons">edit</span>
					</div>
					<div class="header-text">
						<h1>Edit Project</h1>
						<p class="header-subtitle">
							{#if project}
								Update details for {project.projectName}
							{:else}
								Update project details
							{/if}
						</p>
					</div>
					<button class="close-btn" on:click={handleClose} aria-label="Close" disabled={isSaving}>
						<span class="material-icons">close</span>
					</button>
				</div>
			{/if}

			<div class="form-body" on:wheel={handleWheel}>
				{#if isLoading}
					<div class="loading-state">
						<div class="spinner large-spinner"></div>
						<p>Loading project details...</p>
					</div>
				{:else if error && !project}
					<div class="alert alert-error" in:fly={{ y: -5, duration: 200 }}>
						<span class="material-icons">error_outline</span>
						<span>{error}</span>
					</div>
					<div class="error-actions">
						<button class="btn-primary" on:click={loadProject}>Try Again</button>
						<button class="btn-secondary" on:click={handleClose}>Cancel</button>
					</div>
				{:else if project && !isAdminOrOwner}
					<div class="alert alert-error" in:fly={{ y: -5, duration: 200 }}>
						<span class="material-icons">lock</span>
						<span>You don't have permission to edit this project.</span>
					</div>
					<div class="error-actions">
						<button class="btn-secondary" on:click={handleClose}>Cancel</button>
					</div>
				{:else if project}
					{#if error}
						<div class="alert alert-error" in:fly={{ y: -5, duration: 200 }}>
							<span class="material-icons">error_outline</span>
							<span>{error}</span>
						</div>
					{/if}

					{#if saveSuccess}
						<div class="success-details" in:scale={{ start: 0.98, duration: 300 }}>
							<div class="detail-item">
								<span class="label">Project Name:</span>
								<span class="value">{projectName}</span>
							</div>
							<div class="detail-item">
								<span class="label">Modelling Type:</span>
								<span class="value">{modellingType}</span>
							</div>

							<div class="success-check" in:scale={{ delay: 300, duration: 400 }}>
								<div class="check-circle">
									<span class="material-icons">check</span>
								</div>
								<p>Project updated successfully!</p>
							</div>
						</div>

						<div class="form-actions">
							<button type="button" class="btn-secondary" on:click={handleClose}>
								<span class="material-icons">close</span>
								<span>Close</span>
							</button>
							<div class="right-actions">
								<a href={`/projects/${projectId}`} class="btn-success">
									<span class="material-icons">visibility</span>
									<span>View Project</span>
								</a>
							</div>
						</div>
					{:else}
						<form on:submit|preventDefault={handleSubmit} bind:this={formElement}>
							<div class="form-section" in:fly={{ y: 10, duration: 200 }}>
								<h2>Project Details</h2>
								<div class="form-row">
									<div class="form-group required-field">
										<label for="projectName"
											>Project Name <span class="required-indicator">*</span></label
										>
										<div class="input-with-icon">
											<span class="material-icons input-icon">badge</span>
											<input
												type="text"
												id="projectName"
												bind:value={projectName}
												class:error={!!errors.projectName}
												disabled={isSaving}
												placeholder="Enter project name (e.g. 02-30-M02-01)"
											/>
										</div>
										{#if errors.projectName}
											<div class="error-message">{errors.projectName}</div>
										{:else}
											<div class="help-text">
												Format: XX-XX-MXX-XX (e.g. 02-30-M02-01) for single blocks or XX-XX-MXX-XX-X
												(e.g. 02-30-M02-01-A) for multiple blocks
											</div>
										{/if}
									</div>

									<div class="form-group type-group required-field">
										<label>Modelling Type <span class="required-indicator">*</span></label>
										<div class="toggle-container">
											<button
												type="button"
												class="toggle-button {modellingType === 'RC' ? 'active' : ''}"
												on:click={() => (modellingType = 'RC')}
												disabled={isSaving}
											>
												RC
											</button>
											<button
												type="button"
												class="toggle-button {modellingType === 'Masonry' ? 'active' : ''}"
												on:click={() => (modellingType = 'Masonry')}
												disabled={isSaving}
											>
												Masonry
											</button>
										</div>
										{#if errors.modellingType}
											<div class="error-message">{errors.modellingType}</div>
										{/if}
									</div>
								</div>
							</div>

							<div class="form-actions" in:fade={{ duration: 200, delay: 150 }}>
								<button
									type="button"
									class="btn-secondary"
									on:click={handleClose}
									disabled={isSaving}
								>
									<span class="material-icons">arrow_back</span>
									<span>Cancel</span>
								</button>
								<button type="submit" class="btn-primary" disabled={isSaving}>
									{#if isSaving}
										<span class="spinner"></span>
										<span>Saving...</span>
									{:else}
										<span class="material-icons">save</span>
										<span>Save Changes</span>
									{/if}
								</button>
							</div>
						</form>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Overlay with Blur Effect */
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(15, 23, 42, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		padding: 1.5rem;
		overflow-y: auto;
	}

	/* Main Container */
	.form-container {
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
	}

	/* Form Card with Animation */
	.form-card {
		background-color: white;
		border-radius: 10px;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* Header Styles */
	.form-header {
		padding: 1rem 1.5rem;
		background: linear-gradient(135deg, #4a89e8 0%, #5c9fff 100%);
		color: white;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	/* Success Header Style */
	.form-header.success-header {
		background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.header-icon .material-icons {
		font-size: 1.2rem;
	}

	.header-text {
		flex: 1;
	}

	h1 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 500;
	}

	.header-subtitle {
		font-size: 0.8rem;
		margin: 0.25rem 0 0;
		opacity: 0.85;
	}

	.close-btn {
		background: none;
		border: none;
		color: white;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background-color 0.15s;
		flex-shrink: 0;
	}

	.close-btn:hover {
		background-color: rgba(255, 255, 255, 0.15);
	}

	.close-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.close-btn .material-icons {
		font-size: 1.2rem;
	}

	/* Form Body */
	.form-body {
		padding: 1.25rem;
		overflow-y: auto;
		flex: 1;
	}

	/* Loading State */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 0;
		color: #64748b;
	}

	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 1s ease-in-out infinite;
	}

	.large-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(92, 159, 255, 0.2);
		border-top-color: #5c9fff;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Alert Styles */
	.alert {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1rem;
		border-radius: 6px;
		margin-bottom: 1.25rem;
		font-size: 0.85rem;
	}

	.alert-error {
		background-color: #fee2e2;
		color: #b91c1c;
	}

	.alert .material-icons {
		font-size: 1rem;
	}

	.error-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	/* Success Styles */
	.success-details {
		padding: 1.25rem;
		background-color: #f8fafc;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		border: 1px solid #e2e8f0;
	}

	.detail-item {
		display: flex;
		margin-bottom: 0.75rem;
		font-size: 0.85rem;
	}

	.detail-item:last-of-type {
		margin-bottom: 1.5rem;
	}

	.label {
		font-weight: 500;
		color: #64748b;
		min-width: 120px;
	}

	.value {
		color: #1e293b;
		font-weight: 500;
	}

	/* Success Check Animation */
	.success-check {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1.5rem 0 0.5rem;
		text-align: center;
	}

	.check-circle {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background-color: #10b981;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
		box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.2);
		animation: pulse-success 2s infinite;
	}

	.check-circle .material-icons {
		font-size: 1.5rem;
	}

	.success-check p {
		font-size: 0.9rem;
		color: #10b981;
		font-weight: 500;
		margin: 0;
	}

	@keyframes pulse-success {
		0% {
			box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
		}
		70% {
			box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
		}
	}

	/* Form Sections */
	.form-section {
		margin-bottom: 1.5rem;
	}

	.form-section h2 {
		font-size: 0.95rem;
		color: #1e293b;
		margin: 0 0 1rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e2e8f0;
		font-weight: 600;
	}

	.form-row {
		display: flex;
		gap: 1.25rem;
		margin-bottom: 0.75rem;
		align-items: flex-start;
	}

	.form-group {
		flex: 2;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.type-group {
		flex: 1;
	}

	label {
		font-size: 0.8rem;
		font-weight: 500;
		color: #334155;
	}

	.required-indicator {
		color: #ef4444;
	}

	.input-with-icon {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: #64748b;
		font-size: 0.9rem;
	}

	input[type='text'] {
		width: 100%;
		padding: 0 0.75rem 0 2.25rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.85rem;
		background-color: #f8fafc;
		transition: all 0.2s;
		height: 38px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
	}

	input[type='text']:focus {
		outline: none;
		border-color: #3b82f6;
		background-color: white;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	input.error {
		border-color: #ef4444;
		background-color: #fef2f2;
	}

	.error-message {
		color: #ef4444;
		font-size: 0.7rem;
		margin-top: 0.2rem;
	}

	.help-text {
		font-size: 0.7rem;
		color: #64748b;
		margin-top: 0.2rem;
	}

	.required-field {
		border-left: 3px solid #3b82f6;
		padding-left: 0.5rem;
	}

	/* Toggle Button Styles */
	.toggle-container {
		display: flex;
		width: 100%;
		height: 38px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		overflow: hidden;
	}

	.toggle-button {
		flex: 1;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f8fafc;
		border: none;
		font-size: 0.75rem;
		color: #334155;
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
		margin: 0;
		position: relative;
	}

	.toggle-button:first-child {
		border-right: 1px solid #cbd5e1;
	}

	.toggle-button.active {
		background: linear-gradient(135deg, #4a89e8 0%, #5c9fff 100%);
		color: white;
		font-weight: bold;
	}

	.toggle-button:hover:not(.active):not(:disabled) {
		background-color: #e2e8f0;
	}

	.toggle-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Form Actions */
	.form-actions {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e2e8f0;
	}

	.right-actions {
		display: flex;
		gap: 0.5rem;
	}

	/* Button Styles */
	.btn-primary,
	.btn-secondary,
	.btn-success {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
		border: none;
		text-decoration: none;
	}

	.btn-primary {
		background: linear-gradient(135deg, #4a89e8 0%, #5c9fff 100%);
		color: white;
		border: none;
		font-weight: bold;
	}

	.btn-primary:hover {
		background: linear-gradient(135deg, #4a89e8 0%, #1d4ed8 100%);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
	}

	.btn-secondary {
		background-color: #f1f5f9;
		color: #334155;
		border: 1px solid #cbd5e1;
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: #e2e8f0;
		transform: translateY(-1px);
	}

	.btn-success {
		background-color: #10b981;
		color: white;
	}

	.btn-success:hover {
		background-color: #059669;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
	}

	.btn-primary:disabled,
	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary .material-icons,
	.btn-secondary .material-icons,
	.btn-success .material-icons {
		font-size: 0.9rem;
	}

	/* Responsive Styles */
	@media (max-width: 768px) {
		.overlay {
			align-items: flex-start;
			padding: 1rem 0.5rem;
		}

		.form-row {
			flex-direction: column;
			gap: 1rem;
		}

		.form-actions {
			flex-direction: column-reverse;
			gap: 0.75rem;
		}

		.right-actions {
			display: flex;
			flex-direction: column;
			width: 100%;
			gap: 0.5rem;
		}

		.btn-primary,
		.btn-secondary,
		.btn-success {
			width: 100%;
			justify-content: center;
		}

		.btn-secondary {
			margin-top: 0.25rem;
		}
	}
</style>
