<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly, fade, scale } from 'svelte/transition';

	export let fileType: string;
	export let acceptedExtensions: string;
	export let description: string;
	export let selectedFile: File | null = null;
	export let required = false;
	export let backgroundColor: string;
	export let color: string;
	export let disabled = false;

	let dragging = false;
	let fileInput: HTMLInputElement;
	let dragCounter = 0; // To handle child elements triggering drag events

	const dispatch = createEventDispatcher<{
		fileSelected: { file: File | null };
	}>();

	function handleDragEnter(e: DragEvent) {
		if (disabled) return;
		e.preventDefault();
		e.stopPropagation();

		// Increment counter to handle nested elements
		dragCounter++;
		dragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		if (disabled) return;
		e.preventDefault();
		e.stopPropagation();

		// Decrement counter
		dragCounter--;

		// Only set dragging to false if we've left the outer container
		if (dragCounter === 0) {
			dragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		if (disabled) return;
		e.preventDefault();
		e.stopPropagation();

		// Set the dropEffect to 'copy' to show a "+" cursor
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}

		dragging = true;
	}

	function handleDrop(e: DragEvent) {
		if (disabled) return;
		e.preventDefault();
		e.stopPropagation();

		// Reset counter and dragging state
		dragCounter = 0;
		dragging = false;

		if (!e.dataTransfer) return;

		const files = e.dataTransfer.files;
		if (files.length > 0) {
			selectFile(files[0]);
		}
	}

	function handleFileInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			selectFile(input.files[0]);
		}
	}

	function selectFile(file: File) {
		// Check if the file extension matches one of the accepted extensions
		const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
		const acceptedExts = acceptedExtensions
			.split(',')
			.map((ext) => ext.trim().toLowerCase().replace('.', ''));

		if (acceptedExts.includes(fileExt) || acceptedExtensions === '*') {
			selectedFile = file;
			dispatch('fileSelected', { file });
		} else {
			alert(`Invalid file type. Please select a valid ${acceptedExtensions} file.`);
		}
	}

	function clearSelection() {
		selectedFile = null;
		dispatch('fileSelected', { file: null });
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function browseFiles() {
		if (disabled) return;
		fileInput.click();
	}
</script>

<div
	class="dropzone"
	class:dragging
	class:has-file={selectedFile !== null}
	class:disabled
	class:required
	style="--bg-color: {backgroundColor}; --color: {color};"
	on:dragenter={handleDragEnter}
	on:dragleave={handleDragLeave}
	on:dragover={handleDragOver}
	on:drop={handleDrop}
>
	<input
		type="file"
		accept={acceptedExtensions}
		bind:this={fileInput}
		on:change={handleFileInputChange}
		style="display: none;"
		{disabled}
	/>

	<div class="dropzone-content">
		{#if selectedFile}
			<div class="file-info" transition:scale={{ duration: 200, start: 0.95 }}>
				<div class="file-details">
					<div class="file-name" title={selectedFile.name}>{selectedFile.name}</div>
					<div class="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</div>
				</div>
				<button
					type="button"
					class="clear-button"
					on:click={clearSelection}
					{disabled}
					aria-label="Remove file"
				>
					<span class="material-icons">close</span>
				</button>
			</div>
		{:else}
			<div class="dropzone-placeholder" on:click={browseFiles}>
				{#if dragging}
					<div class="drop-indicator" transition:fade={{ duration: 100 }}>
						<span class="material-icons drop-icon">file_download</span>
						<span class="drop-text">Release to upload</span>
					</div>
				{:else}
					<div class="dropzone-text" transition:fade={{ duration: 100 }}>
						<div class="file-type">
							{fileType}{#if required}<span class="required-mark">*</span>{/if}
						</div>
						<div class="description">{description}</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if !selectedFile}
		<div class="drop-instruction" transition:fade={{ duration: 150 }}>
			{#if dragging}
				Drop to upload
			{:else}
				Drop file here or <button class="browse-link" on:click={browseFiles}>browse</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dropzone {
		border: 1px dashed #cbd5e1;
		border-radius: 6px;
		padding: 0.7rem;
		text-align: center;
		background-color: #f8fafc;
		transition: all 0.2s ease;
		cursor: pointer;
		position: relative;
		margin-bottom: 0.6rem;
		overflow: hidden;
		min-height: 76px; /* Set minimum height to prevent layout shifts */
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.dropzone:hover:not(.disabled) {
		border-color: #94a3b8;
		background-color: #f1f5f9;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.dragging:not(.disabled) {
		border-color: var(--color, #3b82f6);
		border-style: dashed;
		border-width: 2px;
		background-color: rgba(var(--bg-color-rgb, 241, 245, 249), 0.6);
		transform: translateY(-1px);
		box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(var(--color-rgb, 59, 130, 246), 0.4);
		}
		70% {
			box-shadow: 0 0 0 5px rgba(var(--color-rgb, 59, 130, 246), 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(var(--color-rgb, 59, 130, 246), 0);
		}
	}

	.has-file {
		border-color: var(--color, #3b82f6);
		border-style: solid;
		background-color: rgba(var(--bg-color-rgb, 241, 245, 249), 0.3);
	}

	.required {
		border-left: 3px solid #3b82f6;
	}

	.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.dropzone-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}

	.dropzone-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 0.5rem;
		min-height: 50px; /* Prevent layout shifts */
	}

	.dropzone-text {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.file-type {
		font-weight: 600;
		font-size: 0.75rem;
		color: #1e293b;
	}

	.file-type .required-mark {
		color: #3b82f6;
		margin-left: 2px;
	}

	.description {
		font-size: 0.65rem;
		color: #64748b;
	}

	/* Drop indicator when dragging */
	.drop-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		color: var(--color, #3b82f6);
	}

	.drop-icon {
		font-size: 1.5rem;
		animation: bounce 0.6s infinite alternate;
	}

	@keyframes bounce {
		from {
			transform: translateY(-3px);
		}
		to {
			transform: translateY(3px);
		}
	}

	.drop-text {
		font-size: 0.8rem;
		font-weight: 500;
	}

	.drop-instruction {
		font-size: 0.65rem;
		color: #94a3b8;
		margin-top: 0.4rem;
		font-weight: 500;
	}

	.browse-link {
		background: none;
		border: none;
		color: var(--color, #3b82f6);
		padding: 0;
		font-size: 0.65rem;
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.browse-link:hover {
		color: var(--color-hover, #2563eb);
		text-decoration: none;
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.6rem;
		background-color: #f8fafc;
		border-radius: 5px;
		border: 1px solid #e2e8f0;
		transition: all 0.2s ease;
	}

	.file-info:hover {
		background-color: #f1f5f9;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.file-details {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		text-align: left;
		overflow: hidden;
	}

	.file-name {
		font-size: 0.7rem;
		font-weight: 500;
		color: #334155;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-size {
		font-size: 0.6rem;
		color: #64748b;
	}

	.clear-button {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #e2e8f0;
		border: none;
		color: #64748b;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
		padding: 0;
	}

	.clear-button:hover:not(:disabled) {
		background-color: #cbd5e1;
		color: #475569;
		transform: scale(1.05);
	}

	.clear-button:active:not(:disabled) {
		transform: scale(0.95);
	}

	.clear-button .material-icons {
		font-size: 0.7rem;
	}

	.clear-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Add custom CSS variables to allow color manipulation */
	:root {
		--bg-color-rgb: 241, 245, 249;
		--color-rgb: 59, 130, 246;
		--color-hover: #2563eb;
	}
</style>
