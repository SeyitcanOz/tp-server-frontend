<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import FileDropzone from './FileDropZone.svelte';
	import api from '$lib/services/api';
	import versionService from '$lib/services/version';
	import type { ProjectVersion } from '$lib/types/version';
	import type { ProjectDetail } from '$lib/types/project';

	// Props
	export let isOpen = false;
	export let projectId: string;
	export let projectDetail: ProjectDetail | null = null;

	// Form state
	let isSubmitting = false;
	let error: string | null = null;
	let success = false;
	let createdVersion: ProjectVersion | null = null;
	let formElement: HTMLFormElement;

	// File state
	let projectFile: File | null = null;
	let modelInfoFile: File | null = null;
	let modelFile: File | null = null;
	let modelInputFile: File | null = null;
	let resultsFile: File | null = null;

	// Transition duration for staggered file upload sections
	const transitionDuration = 150;
	const staggerDelay = 50;

	// Track if the form is focused to prevent scroll propagation
	let isFormFocused = false;

	$: if (isOpen) {
		// Always reset the form when opening, unless it's already submitting
		if (!isSubmitting) {
			resetForm();
		}
	}

	const dispatch = createEventDispatcher<{
		close: void;
		versionCreated: { version: ProjectVersion };
		refreshProject: void;
	}>();

	function handleClose() {
		// Always reset isSubmitting first, regardless of current state
		isSubmitting = false;
		resetForm();
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen && !isSubmitting) {
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

	// Form validation
	function validateForm(): { valid: boolean; error: string | null } {
		// Reset error
		error = null;

		// Validate required files
		if (!projectFile) {
			return { valid: false, error: 'Project.json file is required' };
		}

		return { valid: true, error: null };
	}

	async function handleSubmit() {
		const validation = validateForm();
		if (!validation.valid) {
			error = validation.error;
			return;
		}

		isSubmitting = true;
		error = null;
		success = false;
		createdVersion = null;

		try {
			// Create a FormData object to send the files
			const formData = new FormData();
			formData.append('projectId', projectId);

			// Append files if they exist
			if (projectFile) {
				formData.append('files', projectFile);
			}
			if (modelInfoFile) {
				formData.append('files', modelInfoFile);
			}
			if (modelFile) {
				formData.append('files', modelFile);
			}
			if (modelInputFile) {
				formData.append('files', modelInputFile);
			}
			if (resultsFile) {
				formData.append('files', resultsFile);
			}

			const response = await api.post('/api/upload/version/' + projectId, formData, {
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			});

			// Store the created version
			createdVersion = response.data;

			// Set success state
			success = true;

			// Note: We're NOT resetting isSubmitting here
			// This is crucial for maintaining the success card state

			// Notify parent that a version was created (even if user stays on page)
			if (createdVersion) {
				dispatch('versionCreated', { version: createdVersion });
			}
		} catch (err) {
			console.error('Error creating version:', err);

			if (err && typeof err === 'object' && 'response' in err) {
				const axiosError = err as { response?: { data?: string | { message?: string } } };
				if (typeof axiosError.response?.data === 'string') {
					error = axiosError.response.data;
				} else if (typeof axiosError.response?.data === 'object') {
					error =
						axiosError.response.data.message ||
						'Failed to create version. Please check your files and try again.';
				} else {
					error = 'Failed to create version. Please check your files and try again.';
				}
			} else {
				error = 'Failed to create version. Please check your files and try again.';
			}

			isSubmitting = false;
		}
	}

	function resetForm() {
		if (isSubmitting) return;

		projectFile = null;
		modelInfoFile = null;
		modelFile = null;
		modelInputFile = null;
		resultsFile = null;
		error = null;
		success = false;
		createdVersion = null;
	}

	// Handle success option: View version
	function viewVersion() {
		if (!createdVersion) return;
		goto(`/projects/${projectId}/versions/${createdVersion.versionNumber}`);
	}

	// Handle success option: Create another version
	function createAnother() {
		// Notify parent to refresh project list
		dispatch('refreshProject');
		// Reset all state
		isSubmitting = false; // This needs to be set before resetForm() is called
		resetForm();
	}

	// Handle success option: Close and return to project
	function closeAndRefresh() {
		// Notify parent to refresh project list
		dispatch('refreshProject');
		// Close modal
		handleClose();
	}

	// Handle dropzone interactions better
	function handleFileSelected(event: CustomEvent<{ file: File | null }>, fileType: string) {
		switch (fileType) {
			case 'project':
				projectFile = event.detail.file;
				break;
			case 'modelInfo':
				modelInfoFile = event.detail.file;
				break;
			case 'model':
				modelFile = event.detail.file;
				break;
			case 'modelInput':
				modelInputFile = event.detail.file;
				break;
			case 'results':
				resultsFile = event.detail.file;
				break;
		}
	}

	// Generate file upload section classes with staggered animations
	function getFileUploadClass(index: number): string {
		return `file-upload-section file-upload-section-${index}`;
	}

	onMount(() => {
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

{#if isOpen}
	<div class="overlay" transition:fade={{ duration: 200 }}>
		<div class="form-container" in:fly={{ y: 20, duration: 300, easing: cubicOut }}>
			<div class="form-card">
				<!-- The header part that changes based on success status -->
				{#if success && createdVersion}
					<div class="form-header success-header" in:fly={{ y: -10, duration: 300 }}>
						<div class="header-icon">
							<span class="material-icons">check_circle</span>
						</div>
						<div class="header-text">
							<h1>Version Created Successfully</h1>
							<p class="header-subtitle">Your project version has been successfully created</p>
						</div>
						<button
							class="close-btn"
							on:click={() => {
								isSubmitting = false; // Reset submitting state first
								resetForm();
								dispatch('close');
							}}
							aria-label="Close"
						>
							<span class="material-icons">close</span>
						</button>
					</div>
				{:else}
					<div class="form-header">
						<div class="header-icon">
							<span class="material-icons">add_circle</span>
						</div>
						<div class="header-text">
							<h1>Create New Version</h1>
							<p class="header-subtitle">
								{#if projectDetail}
									Upload files for a new version of {projectDetail.projectName}
								{:else}
									Upload project files to create a new version
								{/if}
							</p>
						</div>
						<button
							class="close-btn"
							on:click={() => {
								isSubmitting = false; // Reset submitting state first
								resetForm();
								dispatch('close');
							}}
							aria-label="Close"
						>
							<span class="material-icons">close</span>
						</button>
					</div>
				{/if}

				<div class="form-body" on:wheel={handleWheel}>
					{#if error}
						<div class="alert alert-error" in:fly={{ y: -5, duration: 200 }}>
							<span class="material-icons">error_outline</span>
							<span>{error}</span>
						</div>
					{/if}

					{#if success && createdVersion}
						<div class="success-details" in:scale={{ start: 0.98, duration: 300 }}>
							<div class="detail-item">
								<span class="label">Project:</span>
								<span class="value"
									>{projectDetail ? projectDetail.projectName : 'Current project'}</span
								>
							</div>
							<div class="detail-item">
								<span class="label">Version Number:</span>
								<span class="value">{createdVersion.versionNumber}</span>
							</div>

							<div class="success-check" in:scale={{ delay: 300, duration: 400 }}>
								<div class="check-circle">
									<span class="material-icons">check</span>
								</div>
								<p>Version created successfully!</p>
							</div>
						</div>

						<div class="form-actions">
							<button
								type="button"
								class="btn-secondary"
								on:click={() => {
									isSubmitting = false; // Reset submitting state first
									resetForm();
									dispatch('close');
								}}
							>
								<span class="material-icons">close</span>
								<span>Close</span>
							</button>
							<div class="right-actions">
								<button type="button" class="btn-outline" on:click={createAnother}>
									<span class="material-icons">add_circle</span>
									<span>Create Another</span>
								</button>
								<button type="button" class="btn-success" on:click={viewVersion}>
									<span class="material-icons">visibility</span>
									<span>View Version</span>
								</button>
							</div>
						</div>
					{:else}
						<form on:submit|preventDefault={handleSubmit} bind:this={formElement}>
							<!-- Project Files -->
							<div class="form-section" in:fly={{ y: 10, duration: 200, delay: 100 }}>
								<h2>Project Files</h2>

								<div class="dropzones-container">
									<div
										class={getFileUploadClass(1)}
										in:fade={{ duration: transitionDuration, delay: staggerDelay * 0 }}
									>
										<FileDropzone
											fileType="Project File"
											acceptedExtensions=".json"
											description="Main project data file (Project.json)"
											bind:selectedFile={projectFile}
											required={true}
											backgroundColor="#EBF5FF"
											color="#3b82f6"
											disabled={isSubmitting}
											on:fileSelected={(e) => handleFileSelected(e, 'project')}
										/>
									</div>

									<div
										class={getFileUploadClass(2)}
										in:fade={{ duration: transitionDuration, delay: staggerDelay * 1 }}
									>
										<FileDropzone
											fileType="Model Info File"
											acceptedExtensions=".json"
											description="Additional model information (TBDYModelInfo.json)"
											bind:selectedFile={modelInfoFile}
											backgroundColor="#f1f5f9"
											color="#64748b"
											disabled={isSubmitting}
											on:fileSelected={(e) => handleFileSelected(e, 'modelInfo')}
										/>
									</div>

									<div
										class={getFileUploadClass(3)}
										in:fade={{ duration: transitionDuration, delay: staggerDelay * 2 }}
									>
										<FileDropzone
											fileType="Model File"
											acceptedExtensions=".model,.json"
											description="Model file (TBDYModelInputParameters.model)"
											bind:selectedFile={modelFile}
											backgroundColor="#f1f5f9"
											color="#64748b"
											disabled={isSubmitting}
											on:fileSelected={(e) => handleFileSelected(e, 'model')}
										/>
									</div>

									<div
										class={getFileUploadClass(4)}
										in:fade={{ duration: transitionDuration, delay: staggerDelay * 3 }}
									>
										<FileDropzone
											fileType="Model Input File"
											acceptedExtensions=".txt"
											description="Model input parameters (TBDYModelInputParameters.txt)"
											bind:selectedFile={modelInputFile}
											backgroundColor="#f1f5f9"
											color="#64748b"
											disabled={isSubmitting}
											on:fileSelected={(e) => handleFileSelected(e, 'modelInput')}
										/>
									</div>

									<div
										class={getFileUploadClass(5)}
										in:fade={{ duration: transitionDuration, delay: staggerDelay * 4 }}
									>
										<FileDropzone
											fileType="Results File"
											acceptedExtensions=".txt"
											description="Results data file (Sonuc_Deterministic_Pe.txt)"
											bind:selectedFile={resultsFile}
											backgroundColor="#f1f5f9"
											color="#64748b"
											disabled={isSubmitting}
											on:fileSelected={(e) => handleFileSelected(e, 'results')}
										/>
									</div>
								</div>
							</div>

							<div class="form-actions" in:fade={{ duration: 200, delay: 300 }}>
								<button
									type="button"
									class="btn-secondary"
									on:click={handleClose}
									disabled={isSubmitting}
								>
									<span class="material-icons">arrow_back</span>
									<span>Cancel</span>
								</button>
								<div class="right-actions">
									<button
										type="button"
										class="btn-outline"
										on:click={() => {
											isSubmitting = false; // Reset submitting state first
											resetForm();
										}}
										disabled={isSubmitting}
									>
										<span class="material-icons">refresh</span>
										<span>Reset</span>
									</button>
									<button type="submit" class="btn-primary" disabled={isSubmitting}>
										{#if isSubmitting}
											<span class="spinner"></span>
											<span>Creating...</span>
										{:else}
											<span class="material-icons">add</span>
											<span>Create</span>
										{/if}
									</button>
								</div>
							</div>
						</form>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

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
		max-width: 800px;
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

	/* Success Styles - More Minimalistic */
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

	/* File Upload Container */
	.dropzones-container {
		display: flex;
		flex-direction: column;
	}

	.file-upload-section {
		margin-bottom: 0.5rem;
		transition: all 0.3s ease;
	}

	.file-upload-section:hover {
		transform: translateY(-2px);
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
	.btn-outline,
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

	.btn-primary:active:not(:disabled) {
		transform: translateY(0);
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

	.btn-secondary:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-outline {
		background-color: white;
		color: #3b82f6;
		border: 1px solid #3b82f6;
	}

	.btn-outline:hover:not(:disabled) {
		background-color: #f0f7ff;
		transform: translateY(-1px);
	}

	.btn-outline:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-success {
		background-color: #10b981;
		color: white;
		border: none;
	}

	.btn-success:hover:not(:disabled) {
		background-color: #059669;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
	}

	.btn-success:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-primary:disabled,
	.btn-secondary:disabled,
	.btn-outline:disabled,
	.btn-success:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-primary .material-icons,
	.btn-secondary .material-icons,
	.btn-outline .material-icons,
	.btn-success .material-icons {
		font-size: 0.9rem;
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

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive Styles */
	@media (max-width: 768px) {
		.overlay {
			align-items: flex-start;
			padding: 1rem 0.5rem;
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
		.btn-outline,
		.btn-success {
			width: 100%;
			justify-content: center;
		}

		.btn-secondary {
			margin-top: 0.25rem;
		}
	}
</style>
