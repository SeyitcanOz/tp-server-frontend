<script lang="ts">
	// @ts-ignore
	// For polygon triangulation - we'll use Earcut as it's reliable for complex polygons
	import earcut from 'earcut';
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
	import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
	import { EdgesGeometry, LineSegments } from 'three';
	import BuildingTreeView from './BuildingTreeView.svelte';
	import BuildingPropertiesPanel from './BuildingPropertiesPanel.svelte';

	// Event dispatcher for component events
	const dispatch = createEventDispatcher();

	// Props
	export let modelData: any = null; // The ModelInputData from the version
	export let width: string = '100%';
	export let height: string = '500px';
	export let axisExtensionLength: number = 200; // Extension length for axis lines
	export let storyColors: Record<string, string> = {};

	// Component state
	let container: HTMLElement;
	let renderer: THREE.WebGLRenderer;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
	let perspectiveCamera: THREE.PerspectiveCamera;
	let orthographicCamera: THREE.OrthographicCamera;
	let controls: OrbitControls;
	let raycaster: THREE.Raycaster;
	let mouse: THREE.Vector2;
	let isInitialized = false;
	let animationId: number;
	let fontLoader: FontLoader;
	let isFontLoaded = false;
	let defaultFont: Font | null = null;

	// View mode state
	let is2DMode = false;
	let viewModeText = '2D';

	// Controls panel state
	let isControlsPanelOpen = false;
	let savedStoryVisibility: Record<string, boolean> = {};

	// Rendering order follows the eMemberType2D priority
	let zIndexLayers = {
		grid: 0,
		axes: 5,
		slab: 1, // Lowest priority
		beam: 2,
		wall: 3,
		masonryWall: 5, // Not used currently but added for completeness
		column: 6, // Highest priority
		edges: 10 // Edge borders on top of everything
	};

	// Reference to the ViewCube component
	let viewCubeRef: any;

	// Selection and highlighting state
	let selectedObject: THREE.Object3D | null = null;
	let originalMaterial: THREE.Material | null = null;
	let highlightMaterial = new THREE.MeshPhongMaterial({
		color: 0xffff00, // Yellow highlight
		transparent: true,
		opacity: 0.9,
		specular: 0xffffff,
		shininess: 80,
		depthWrite: true,
		polygonOffset: true,
		polygonOffsetFactor: -1,
		polygonOffsetUnits: -1
	});

	// Properties panel state
	let showProperties = false;
	let selectedObjectProperties: any = {};
	let selectedObjectType: string = '';

	// Tree View panel state
	let isTreeViewVisible = true;
	let treeViewWidth = '250px';
	let treeViewRef: any;

	function toggleTreeView() {
		if (isTreeViewVisible) {
			isTreeViewVisible = false;
		} else {
			isTreeViewVisible = true;
		}
	}

	// Storey filter state
	let storeyFilters: Record<string, boolean> = {};
	let showStoreyFilter = false;
	let storyLevels: { name: string; level: number }[] = [];

	// Store the story name mapping (index to actual name)
	let storyNameMapping: Record<string, string> = {};

	// Fullscreen state
	let isFullscreen = false;

	// Edge material for 2D mode borders
	const edgeMaterial = new THREE.LineBasicMaterial({
		color: 0x000000, // Black
		linewidth: 1
	});

	// Keep track of edge objects to toggle visibility
	const edgeObjects: THREE.LineSegments[] = [];

	// Materials for different structural elements with improved quality and z-fighting prevention
	// Restored to original colors
	const defaultMaterials = {
		column: new THREE.MeshPhongMaterial({
			color: 0x517891, // Steel blue for columns - more professional
			transparent: false, // Columns remain opaque
			specular: 0x999999,
			shininess: 60,
			flatShading: false,
			// depthWrite: true,
			polygonOffset: true,
			polygonOffsetFactor: 1,
			polygonOffsetUnits: 1
		}),
		beam: new THREE.MeshPhongMaterial({
			color: 0x2e8b57, // Sea green for beams - richer color
			transparent: false,
			specular: 0x888888,
			shininess: 55,
			flatShading: false,
			// depthWrite: true,
			depthTest: true,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1
		}),
		slab: new THREE.MeshPhongMaterial({
			color: 0xcccccc, // Lighter gray for slabs
			transparent: false,
			specular: 0x777777,
			// opacity: 0.5,
			shininess: 40,
			flatShading: true,
			side: THREE.DoubleSide,
			depthWrite: false, // Proper setting for transparent objects
			depthTest: true,
			polygonOffset: true,
			polygonOffsetFactor: -3,
			polygonOffsetUnits: -3
		}),
		wall: new THREE.MeshPhongMaterial({
			color: 0x5472d3, // Refined blue for walls
			transparent: true,
			opacity: 0.9,
			specular: 0x777777,
			shininess: 50,
			flatShading: false,
			depthWrite: false, // Changed to false for transparent objects
			depthTest: true,
			polygonOffset: true,
			polygonOffsetFactor: -2,
			polygonOffsetUnits: -2
		}),
		wallBeam: new THREE.MeshPhongMaterial({
			color: 0x7b9bc0, // Refined blue for wall beams
			transparent: true,
			opacity: 0.9,
			specular: 0x777777,
			shininess: 55,
			flatShading: false,
			depthWrite: false,
			depthTest: true
		}),
		wallColumn: new THREE.MeshPhongMaterial({
			color: 0x8a4fdb, // Refined purple for wall columns
			transparent: false, // Keep opaque like regular columns
			specular: 0x777777,
			shininess: 60,
			flatShading: false,
			depthWrite: true
		}),
		axisLine: new THREE.LineBasicMaterial({
			color: 0x444444, // Darker gray for axis lines
			linewidth: 2
		}),
		axisText: new THREE.MeshBasicMaterial({
			color: 0x222222 // Nearly black for axis labels
		})
	};

	// Created a copy of the materials for the current rendering
	let materials = { ...defaultMaterials };

	// Add borders to a mesh (used for 2D mode)
	function addBorders(mesh: THREE.Mesh) {
		// Create an edges geometry from the mesh's geometry
		const edgesGeometry = new EdgesGeometry(mesh.geometry);

		// Create a line segments object with the edges geometry
		const edges = new LineSegments(edgesGeometry, edgeMaterial);

		// Copy the mesh's position, rotation, and scale
		edges.position.copy(mesh.position);
		edges.rotation.copy(mesh.rotation);
		edges.scale.copy(mesh.scale);

		// Set a higher render order to ensure borders appear on top
		edges.renderOrder = zIndexLayers.edges;

		// Add a reference to the original mesh for easier updates
		(edges as any).originalMesh = mesh;

		// Add the edges to the scene
		mesh.parent?.add(edges);

		// Store the edges object in our array for toggling later
		edgeObjects.push(edges);

		// Return the edges object in case it's needed
		return edges;
	}

	// Update borders for all objects (used when toggling 2D/3D mode)
	function updateBorders(show: boolean) {
		// First remove any existing edge objects
		for (const edge of edgeObjects) {
			if (edge.parent) {
				edge.parent.remove(edge);
			}
		}

		// Clear the array
		edgeObjects.length = 0;

		// If we need to show borders (2D mode), add them to all visible meshes
		if (show) {
			scene.traverse((object) => {
				if (
					object instanceof THREE.Mesh &&
					object.visible &&
					(object.name.startsWith('Beam_') ||
						object.name.startsWith('Column_') ||
						object.name.startsWith('Wall_') ||
						object.name.startsWith('Slab_'))
				) {
					addBorders(object);
				}
			});
		}
	}

	export function updateMaterialColors(newStoryColors?: Record<string, string>) {
		// Allow calling with or without parameters for backward compatibility
		if (newStoryColors) {
			console.log('updateMaterialColors called with:', newStoryColors);
			// Update the component's storyColors with the new values
			storyColors = newStoryColors;
		} else {
			console.log('updateMaterialColors called without parameters, using current storyColors');
		}

		// Define the explicit type for materials
		materials = {
			column: defaultMaterials.column.clone(),
			beam: defaultMaterials.beam.clone(),
			slab: defaultMaterials.slab.clone(),
			wall: defaultMaterials.wall.clone(),
			wallBeam: defaultMaterials.wallBeam.clone(),
			wallColumn: defaultMaterials.wallColumn.clone(),
			axisLine: defaultMaterials.axisLine.clone(),
			axisText: defaultMaterials.axisText.clone()
		};

		// If no story colors are provided, use default materials
		if (Object.keys(storyColors).length === 0) {
			return;
		}

		// Debug: Show all story names we're looking for
		console.log('Looking for these story names in the model:', Object.keys(storyColors));

		// Keep track of whether we found and updated any materials
		let updatedAnyMaterials = false;

		// Update materials in the scene if they exist
		if (scene) {
			// First, log all top-level objects in the scene to debug
			console.log(
				'Top-level scene objects:',
				scene.children.map((child) => child.name)
			);

			// Find all story groups first, as they're at the top level of the scene
			const storyGroups = scene.children.filter((obj) => obj.name && obj.name.startsWith('Story_'));
			console.log(`Found ${storyGroups.length} story groups in the scene`);

			// Log the names of all the story groups found
			console.log(
				'Story groups:',
				storyGroups.map((group) => group.name)
			);

			// Log the story name mapping we have built
			console.log('Story name mapping:', storyNameMapping);

			// For each story group, update all its children's materials based on the story color
			storyGroups.forEach((storyGroup) => {
				// Extract the story index from the group name (e.g., "Story_0")
				const storyMatch = storyGroup.name.match(/^Story_(\d+)$/);
				if (storyMatch) {
					const storyIndex = parseInt(storyMatch[1]);

					// Get the actual story name from our mapping
					const storyName = storyNameMapping[`Story_${storyIndex}`] || '';

					console.log(`Processing story group: ${storyGroup.name} maps to ${storyName}`);

					// If we have a color for this story, apply it to all children
					if (storyName && storyColors[storyName]) {
						console.log(`Applying color ${storyColors[storyName]} to all objects in ${storyName}`);
						updatedAnyMaterials = true;

						// Keep track of how many objects were updated
						let updatedCount = 0;

						// Apply color to all meshes in this story group
						storyGroup.traverse((child) => {
							if (child instanceof THREE.Mesh && child.material) {
								// Clone the material to avoid affecting other objects
								const originalMaterial = child.material;
								const newMaterial = originalMaterial.clone();

								// Set the new color from storyColors
								newMaterial.color.set(storyColors[storyName]);

								// Keep the original opacity and other properties
								if ('opacity' in originalMaterial) {
									newMaterial.opacity = originalMaterial.opacity;
								}
								if ('transparent' in originalMaterial) {
									newMaterial.transparent = originalMaterial.transparent;
								}

								// Apply the new material
								child.material = newMaterial;

								// Mark material as needing update
								newMaterial.needsUpdate = true;

								updatedCount++;
							}
						});

						console.log(`Updated ${updatedCount} materials in ${storyName}`);
					} else {
						console.log(`No color specified for ${storyName}, skipping`);
					}
				}
			});
		}

		// Force a re-render if we updated materials
		if (updatedAnyMaterials && renderer && camera) {
			console.log('Forcing re-render after material updates');
			renderer.render(scene, camera);
		}
	}

	// Initialize the 3D scene
	function initScene() {
		if (!container) return;

		// Initialize raycaster and mouse
		raycaster = new THREE.Raycaster();
		mouse = new THREE.Vector2();

		// Create renderer with improved quality and z-buffer configuration
		renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			logarithmicDepthBuffer: false, // Crucial for z-fighting prevention
			precision: 'highp',
			powerPreference: 'high-performance'
		});

		// Additional renderer settings to improve rendering quality and reduce artifacts
		renderer.setClearColor(0xffffff, 1); // Slightly lighter background
		renderer.sortObjects = true; // Critical for transparent object rendering
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowMap;

		container.appendChild(renderer.domElement);

		// Create scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xffffff);

		// Create perspective camera with improved near/far plane settings
		const aspect = container.clientWidth / container.clientHeight;
		perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 1, 100000); // Adjusted near plane for better precision
		perspectiveCamera.position.set(500, 500, 500);
		perspectiveCamera.lookAt(0, 0, 0);

		// Create orthographic camera for 2D mode
		const frustumSize = 1000;
		const aspectRatio = container.clientWidth / container.clientHeight;
		orthographicCamera = new THREE.OrthographicCamera(
			(frustumSize * aspectRatio) / -2,
			(frustumSize * aspectRatio) / 2,
			frustumSize / 2,
			frustumSize / -2,
			1,
			10000
		);
		orthographicCamera.position.set(0, 1000, 0); // Position directly above
		orthographicCamera.lookAt(0, 0, 0);
		orthographicCamera.up.set(0, 0, -1); // Set up vector to match 2D plan view orientation

		// Start with perspective camera as default
		camera = perspectiveCamera;

		// Add lights for better quality
		// Ambient light for base illumination
		const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Increased ambient light
		scene.add(ambientLight);

		// Main directional light with shadows
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(200, 500, 300);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 2048;
		directionalLight.shadow.mapSize.height = 2048;
		directionalLight.shadow.camera.near = 100;
		directionalLight.shadow.camera.far = 2000;
		directionalLight.shadow.camera.left = -500;
		directionalLight.shadow.camera.right = 500;
		directionalLight.shadow.camera.top = 500;
		directionalLight.shadow.camera.bottom = -500;
		directionalLight.shadow.bias = -0.0005;
		scene.add(directionalLight);

		// Add back light and fill light for better 3D definition
		const backLight = new THREE.DirectionalLight(0xffffff, 1);
		backLight.position.set(-200, 200, -200);
		scene.add(backLight);

		// Add fill light
		const fillLight = new THREE.DirectionalLight(0xffffff, 1);
		fillLight.position.set(-100, 100, 200);
		scene.add(fillLight);

		// Add orbit controls
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.rotateSpeed = 0.7;
		controls.zoomSpeed = 0.9;
		controls.panSpeed = 0.7;
		controls.screenSpacePanning = true;

		// Add mouse event listeners for object selection
		container.addEventListener('mousedown', onMouseDown);

		loadFont();

		isInitialized = true;
		animate();
		updateMaterialColors();
	}

	// Toggle between 2D and 3D view modes
	function toggleViewMode() {
		// Save current state before changing modes
		if (is2DMode) {
			// Switching from 2D to 3D - restore saved visibility
			if (Object.keys(savedStoryVisibility).length > 0) {
				// Restore the previous 3D visibility state
				storeyFilters = { ...savedStoryVisibility };

				// Apply the restored filters
				const visibleStories = Object.entries(storeyFilters)
					.filter(([_, isVisible]) => isVisible)
					.map(([name]) => name);

				filterStories(visibleStories);
			} else {
				// If no saved state (first time switching), make all stories visible in 3D
				Object.keys(storeyFilters).forEach((name) => {
					storeyFilters[name] = true;
				});

				filterStories(Object.keys(storeyFilters));
			}
		} else {
			// Switching from 3D to 2D - save current visibility
			savedStoryVisibility = { ...storeyFilters };

			// In 2D mode, ensure only one story is visible
			handleStoryVisibilityFor2D();
		}

		// Toggle the mode
		is2DMode = !is2DMode;
		viewModeText = is2DMode ? '3D' : '2D';

		if (is2DMode) {
			// Switch to 2D mode (orthographic camera)
			camera = orthographicCamera;

			// Position camera for top-down view
			camera.position.set(0, 1000, 0);
			camera.lookAt(0, 0, 0);

			// Disable rotation for 2D mode
			controls.enableRotate = false;

			// Update controls to use orthographic camera
			controls.object = camera;

			// Reset controls
			controls.update();

			// Add borders to all objects in 2D mode
			updateBorders(true);
		} else {
			// Switch back to 3D mode (perspective camera)
			camera = perspectiveCamera;

			// Enable rotation for 3D mode
			controls.enableRotate = true;

			// Update controls to use perspective camera
			controls.object = camera;

			// Reset to isometric view
			setCubicView('iso');

			// Remove borders when switching back to 3D mode
			updateBorders(false);
		}

		// Center and fit model to view
		centerCameraOnModel();
	}

	// Helper function to ensure only one story is visible in 2D mode
	function handleStoryVisibilityFor2D() {
		if (!is2DMode) return;

		// Get all story names
		const storyNames = Object.keys(storeyFilters);

		// Count how many stories are currently visible
		const visibleStories = storyNames.filter((name) => storeyFilters[name]);

		// If there's exactly one story visible, we're good
		if (visibleStories.length === 1) return;

		// Otherwise, make all stories invisible first
		storyNames.forEach((name) => (storeyFilters[name] = false));

		// Then make only the first story visible
		if (storyNames.length > 0) {
			storeyFilters[storyNames[0]] = true;
			// Apply the filter
			filterStories([storyNames[0]]);
		}
	}

	function toggleStoryVisibility(storyName: string) {
		// In 2D mode, we select a single story
		if (is2DMode) {
			// Make all stories invisible first
			Object.keys(storeyFilters).forEach((name) => {
				storeyFilters[name] = false;
			});

			// Then make only the selected story visible
			storeyFilters[storyName] = true;

			// Apply the filter
			filterStories([storyName]);
		} else {
			// In 3D mode, toggle the visibility of the selected story
			storeyFilters[storyName] = !storeyFilters[storyName];

			// Get all currently selected stories
			const selectedStories = Object.entries(storeyFilters)
				.filter(([_, isVisible]) => isVisible)
				.map(([name]) => name);

			// Apply the filter
			filterStories(selectedStories);
		}
	}

	function selectStoryInTreeView(storyName: string) {
		if (is2DMode) {
			// In 2D mode, only show the selected story
			const storyNames = Object.keys(storeyFilters);

			// Make all stories invisible first
			storyNames.forEach((name) => (storeyFilters[name] = false));

			// Then make only the selected story visible
			storeyFilters[storyName] = true;

			// Apply the filter
			filterStories([storyName]);
		} else {
			// In 3D mode, toggle visibility of the selected story
			storeyFilters[storyName] = !storeyFilters[storyName];

			// Get all currently visible stories
			const visibleStories = Object.entries(storeyFilters)
				.filter(([_, isVisible]) => isVisible)
				.map(([name]) => name);

			// Apply the filter
			filterStories(visibleStories);
		}
	}

	// Toggle fullscreen mode
	function toggleFullscreen() {
		if (!container) return;

		if (!isFullscreen) {
			if (container.requestFullscreen) {
				container.requestFullscreen();
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	}

	// Handle fullscreen change events
	function handleFullscreenChange() {
		isFullscreen = !!document.fullscreenElement;

		// Resize the viewer if fullscreen state changed
		setTimeout(handleResize, 100);

		// Force re-render if we have a scene
		if (scene && camera && renderer) {
			renderer.render(scene, camera);
		}
	}

	// Toggle the controls panel visibility
	function toggleControlsPanel() {
		isControlsPanelOpen = !isControlsPanelOpen;
	}

	// Mouse down event handler for object selection
	// Replace the current onMouseDown function with this improved version
	function onMouseDown(event: MouseEvent) {
		// Don't handle selection if it's a right-click (context menu) or control key is pressed
		if (event.button === 2 || event.ctrlKey) return;

		// Calculate mouse position in normalized device coordinates
		const rect = container.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		mouse.x = (x / container.clientWidth) * 2 - 1;
		mouse.y = -(y / container.clientHeight) * 2 + 1;

		// Update the raycaster with the mouse position and camera
		raycaster.setFromCamera(mouse, camera);

		// Create separate arrays for each object type
		const slabObjects: THREE.Object3D[] = [];
		const beamObjects: THREE.Object3D[] = [];
		const wallObjects: THREE.Object3D[] = [];
		const columnObjects: THREE.Object3D[] = [];

		// Collect objects by type from visible stories
		scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				const storyGroup = object.parent;
				if (storyGroup && storyGroup.visible) {
					if (object.name.startsWith('Column_')) {
						columnObjects.push(object);
					} else if (object.name.startsWith('Wall_')) {
						wallObjects.push(object);
					} else if (object.name.startsWith('Beam_')) {
						beamObjects.push(object);
					} else if (object.name.startsWith('Slab_')) {
						slabObjects.push(object);
					}
				}
			}
		});

		// Check intersections for each object type in order of priority
		// Column has the highest priority, then Wall, Beam, and Slab last
		let intersects = raycaster.intersectObjects(columnObjects);

		// If no columns are intersected, try walls
		if (intersects.length === 0) {
			intersects = raycaster.intersectObjects(wallObjects);
		}

		// If no walls are intersected, try beams
		if (intersects.length === 0) {
			intersects = raycaster.intersectObjects(beamObjects);
		}

		// Finally, if nothing else is intersected, try slabs
		if (intersects.length === 0) {
			intersects = raycaster.intersectObjects(slabObjects);
		}

		if (intersects.length > 0) {
			// Get the first intersected object
			const intersectedObject = intersects[0].object;
			selectObject(intersectedObject);
		} else {
			// If clicking on empty space, deselect current object
			deselectObject();
		}
	}

	// Select an object and show its properties
	function selectObject(object: THREE.Object3D) {
		// Deselect current object first
		deselectObject();

		// Set the new selected object
		selectedObject = object;

		// Store the original material to restore later
		if (object instanceof THREE.Mesh) {
			originalMaterial = object.material;
			// Apply highlight material
			object.material = highlightMaterial;

			// Extract object properties
			const objectName = object.name;
			selectedObjectType = objectName.split('_')[0]; // e.g., "Beam", "Column", "Wall", "Slab"

			// Get the userData from the object which contains the properties
			selectedObjectProperties = object.userData;

			// Show properties panel
			showProperties = true;

			// Update the tree view selection
			// Check if the tree view is visible and the reference is available
			if (isTreeViewVisible && treeViewRef) {
				// Call the selectElementByName method we added to the tree view
				// This will highlight the element in the tree and scroll to it
				if (typeof treeViewRef.selectElementByName === 'function') {
					treeViewRef.selectElementByName(objectName);
				}
			}

			// Notify parent component about selection
			dispatch('objectSelected', {
				type: selectedObjectType,
				properties: selectedObjectProperties
			});
		}
	}

	// Deselect the current object
	function deselectObject() {
		if (selectedObject && originalMaterial) {
			if (selectedObject instanceof THREE.Mesh) {
				selectedObject.material = originalMaterial;
			}

			selectedObject = null;
			originalMaterial = null;
			showProperties = false;
			selectedObjectProperties = {};
			selectedObjectType = '';

			// Notify parent component about deselection
			dispatch('objectDeselected');
		}
	}

	// Animation loop
	function animate() {
		animationId = requestAnimationFrame(animate);
		if (controls) controls.update();
		if (renderer && scene && camera) {
			renderer.render(scene, camera);
		}
	}

	// Handle window resize - export this to be called from parent component
	export function handleResize() {
		if (!container || !camera || !renderer) return;

		// Get the current dimensions
		const width = container.clientWidth;
		const height = container.clientHeight;

		// Update camera aspect ratio
		if (camera === perspectiveCamera) {
			perspectiveCamera.aspect = width / height;
			perspectiveCamera.updateProjectionMatrix();
		} else if (camera === orthographicCamera) {
			const aspectRatio = width / height;
			const frustumSize = 1000;
			orthographicCamera.left = (frustumSize * aspectRatio) / -2;
			orthographicCamera.right = (frustumSize * aspectRatio) / 2;
			orthographicCamera.top = frustumSize / 2;
			orthographicCamera.bottom = frustumSize / -2;
			orthographicCamera.updateProjectionMatrix();
		}

		// Update renderer with the new size
		renderer.setSize(width, height);

		// Use a more conservative pixel ratio for better performance
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Force a render to update the view immediately
		if (scene) {
			renderer.render(scene, camera);
		}
	}

	// Draw building axes with labels in bubbles
	function loadFont() {
		fontLoader = new FontLoader();
		// Use the Helvetica-like font - it's the standard sans-serif in Three.js
		fontLoader.load(
			'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
			(font) => {
				defaultFont = font;
				isFontLoaded = true;
				console.log('Font loaded successfully');
				// If we already rendered axes but didn't have the font, re-render them
				if (scene) {
					// Remove old axes
					const oldAxes = scene.getObjectByName('BuildingAxes');
					if (oldAxes) scene.remove(oldAxes);
					// Draw new axes with text
					drawBuildingAxes();
				}
			}
		);
	}

	function drawBuildingAxes() {
		if (!modelData || !modelData.AxesIntersections) return;

		const axesGroup = new THREE.Group();
		axesGroup.name = 'BuildingAxes';
		axesGroup.renderOrder = zIndexLayers.axes;

		// Extract unique axis labels and their points
		const axisLabels = new Set<string>();
		const intersections = modelData.AxesIntersections as Record<string, { X: number; Y: number }>;

		// First collect all unique axis labels
		for (const key in intersections) {
			const parts = key.split('-');
			axisLabels.add(parts[0]);
			axisLabels.add(parts[1]);
		}

		// Group intersections by axis to determine axis lines
		const axisPoints: Record<string, Array<{ key: string; x: number; y: number }>> = {};

		for (const label of axisLabels) {
			axisPoints[label] = [];

			// Find all intersections that include this axis
			for (const [key, point] of Object.entries(intersections)) {
				if (key.includes(label)) {
					axisPoints[label].push({
						key: key,
						x: point.X,
						y: point.Y
					});
				}
			}
		}

		// For each axis, determine if it's horizontal or vertical and draw it
		for (const [label, points] of Object.entries(axisPoints)) {
			if (points.length >= 2) {
				// Sort points to find extremes
				const sortedByX = [...points].sort((a, b) => a.x - b.x);
				const sortedByY = [...points].sort((a, b) => a.y - b.y);

				const isVertical =
					Math.abs(sortedByX[0].x - sortedByX[sortedByX.length - 1].x) <
					Math.abs(sortedByY[0].y - sortedByY[sortedByY.length - 1].y);

				if (isVertical) {
					// Vertical axis (constant X)
					const x = points[0].x;
					const minY = sortedByY[0].y;
					const maxY = sortedByY[sortedByY.length - 1].y;

					// Extend the line
					const startY = minY - axisExtensionLength;
					const endY = maxY + axisExtensionLength;

					// Create the axis line
					const lineGeometry = new THREE.BufferGeometry().setFromPoints([
						new THREE.Vector3(x, 0, startY),
						new THREE.Vector3(x, 0, endY)
					]);
					const line = new THREE.Line(lineGeometry, materials.axisLine);
					axesGroup.add(line);

					// Add labels exactly at the endpoints of the axis line
					createAxisLabel(label, x, 0, startY);
					createAxisLabel(label, x, 0, endY);
				} else {
					// Horizontal axis (constant Y)
					const z = points[0].y;
					const minX = sortedByX[0].x;
					const maxX = sortedByX[sortedByX.length - 1].x;

					// Extend the line
					const startX = minX - axisExtensionLength;
					const endX = maxX + axisExtensionLength;

					// Create the axis line
					const lineGeometry = new THREE.BufferGeometry().setFromPoints([
						new THREE.Vector3(startX, 0, z),
						new THREE.Vector3(endX, 0, z)
					]);
					const line = new THREE.Line(lineGeometry, materials.axisLine);
					axesGroup.add(line);

					// Add labels exactly at the endpoints of the axis line
					createAxisLabel(label, startX, 0, z);
					createAxisLabel(label, endX, 0, z);
				}
			} else if (points.length === 1) {
				// Axis with only one point - add label exactly at this point
				const point = points[0];
				createAxisLabel(label, point.x, 0, point.y);
			}
		}

		scene.add(axesGroup);
	}

	$: if (isInitialized && scene && Object.keys(storyColors).length > 0) {
		updateMaterialColors();
	}

	// Create a label for an axis
	function createAxisLabel(text: string, x: number, y: number, z: number) {
		if (!scene) return;

		// Create a canvas to render the text
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		if (!context) return;

		// Configure canvas and text
		canvas.width = 128;
		canvas.height = 64;
		context.fillStyle = 'rgba(255, 255, 255, 0)'; // Transparent background
		context.fillRect(0, 0, canvas.width, canvas.height);

		// Text style
		context.font = 'bold 36px Arial, Helvetica, sans-serif';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillStyle = '#000000'; // Pure black text

		// Draw text centered on canvas
		context.fillText(text, canvas.width / 2, canvas.height / 2);

		// Create a texture from the canvas
		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;

		// Create sprite material with the texture
		const material = new THREE.SpriteMaterial({
			map: texture,
			transparent: true,
			depthTest: false, // Important - always visible regardless of depth
			depthWrite: false
		});

		// Create sprite (billboard) that always faces the camera
		// Now positioned exactly at the endpoint with y=0
		const sprite = new THREE.Sprite(material);
		sprite.position.set(x, 0, z); // Exactly at the endpoint with y=0
		sprite.scale.set(100, 50, 1); // Adjust size as needed
		sprite.renderOrder = 9999; // Ensure it renders on top of everything
		sprite.name = `AxisLabel_${text}`;

		scene.add(sprite);
	}

	// Filter stories by setting visibility
	export function filterStories(selectedStories: string[]) {
		if (!scene) return;

		// Find all story groups
		const storyGroups = scene.children.filter((obj) => obj.name && obj.name.startsWith('Story_'));

		// For each story group, set visibility based on filter
		storyGroups.forEach((storyGroup) => {
			const storyMatch = storyGroup.name.match(/^Story_(\d+)$/);
			if (storyMatch) {
				const storyIndex = parseInt(storyMatch[1]);
				const storyName = storyNameMapping[`Story_${storyIndex}`] || '';

				// Set visibility based on whether the story is in the selected list
				storyGroup.visible = selectedStories.includes(storyName);
			}
		});

		// Re-render the scene with the updated visibility
		if (renderer && camera) {
			renderer.render(scene, camera);
		}

		// If an object was selected and is now hidden, deselect it
		if (selectedObject) {
			const storyGroup = selectedObject.parent;
			if (storyGroup && !storyGroup.visible) {
				deselectObject();
			}
		}
	}

	// Set camera to predefined views - updated to use ViewCube
	export function setCubicView(
		viewType: 'top' | 'front' | 'side' | 'back' | 'left' | 'bottom' | 'iso'
	) {
		if (viewCubeRef) {
			const viewMap = {
				top: 'top',
				front: 'front',
				side: 'right',
				back: 'back',
				left: 'left',
				bottom: 'bottom',
				iso: 'iso'
			};
			viewCubeRef.setView(viewMap[viewType]);
		}
	}

	// Parse and render the building model from modelData
	function renderBuildingModel() {
		if (!modelData || !scene) {
			console.error('Model data or scene not available');
			return;
		}

		// Clear existing model if any
		clearScene();

		// Check if modelData has the necessary information
		if (!modelData.AxesIntersections || !modelData.Stories) {
			console.error('Invalid or incomplete model data: Missing AxesIntersections or Stories');
			console.log('ModelData keys:', Object.keys(modelData));
			return;
		}

		try {
			// Draw building axes with labels
			drawBuildingAxes();

			// If font is not yet loaded, make sure we'll redraw axes once it is
			if (!isFontLoaded) {
				console.log('Font not yet loaded, axes will be redrawn when font loads');
			}

			// Extract data
			const stories = modelData.Stories;

			// Clear the story name mapping before rebuilding it
			storyNameMapping = {};
			storyLevels = [];
			storeyFilters = {};

			// Build the story name mapping and initialize story filters
			stories.forEach((story: Story, storyIndex: number) => {
				// Get the story name from the Label property if available
				let storyName = '';
				if (story.Label) {
					storyName = story.Label;
				} else {
					// Fallback to old naming convention if no Label is present
					if (storyIndex === 0) {
						storyName = 'Bodrum';
					} else {
						storyName = `Kat ${storyIndex}`;
					}
				}

				// Store the mapping from Story_index to actual story name
				storyNameMapping[`Story_${storyIndex}`] = storyName;

				// Calculate the story level (height from ground)
				let level = 0;
				for (let i = 0; i < storyIndex; i++) {
					level += parseFloat(stories[i].Height as string);
				}

				// Add to story levels array
				storyLevels.push({ name: storyName, level });

				// Initialize story filter to visible
				storeyFilters[storyName] = true;

				console.log(`Mapping Story_${storyIndex} to "${storyName}" at level ${level}`);
			});

			// Render the building structure
			stories.forEach((story: Story, storyIndex: number) => {
				renderStory(story, storyIndex, stories.length);
			});

			// Center camera on model
			centerCameraOnModel();

			// If we're in 2D mode, add borders to all objects
			if (is2DMode) {
				updateBorders(true);
			}
		} catch (error) {
			console.error('Error rendering building model:', error);
		}

		updateMaterialColors();
	}

	// Clear existing models from the scene
	function clearScene() {
		if (!scene) return;

		// Keep only lights and helpers, but be specific about removing axis labels
		const toKeep: THREE.Object3D[] = [];
		scene.traverse((object: THREE.Object3D) => {
			if (object instanceof THREE.Light) {
				toKeep.push(object);
			}
		});

		scene.clear();

		// Add back the lights and helpers
		toKeep.forEach((obj) => scene.add(obj));

		// Clear the edge objects array since we cleared the scene
		edgeObjects.length = 0;
	}

	// Define types for building model elements
	interface Node {
		ID: string;
		X: string | number;
		Y: string | number;
	}

	interface Column {
		NodeID: string;
		B1: string | number;
		B2: string | number;
		Label: string;
		IsSupported?: boolean;
	}

	interface Beam {
		NodeI: string;
		NodeJ: string;
		Width: string | number;
		Depth: string | number;
		Label: string;
	}

	interface Slab {
		Nodes: string[];
		Thickness: string | number;
		Label: string;
		CoatingLoad?: string | number;
		LiveLoad?: string | number;
	}

	interface Spacing {
		Points: Array<{
			X: string | number;
			Y: string | number;
		}>;
	}

	interface Wall {
		NodeI: string;
		NodeJ: string;
		Width: string | number;
		Label: string;
		IsSupported?: boolean;
		Spacings?: Spacing[];
		WallBeam?: string | number;
		WallColumnStart?: string | number;
		WallColumnEnd?: string | number;
	}

	interface Story {
		Height: string | number;
		Nodes?: Node[];
		Columns?: Column[];
		Beams?: Beam[];
		Slabs?: Slab[];
		Walls?: Wall[];
		Label?: string; // The story label (name)
	}

	// Render a single story of the building
	function renderStory(story: Story, storyIndex: number, totalStories: number): void {
		const { Height, Nodes = [], Columns = [], Beams = [], Slabs = [], Walls = [] } = story;

		// Calculate the base height for this story
		let baseHeight = 0;
		for (let i = 0; i < storyIndex; i++) {
			baseHeight += parseFloat(modelData.Stories[i].Height as string);
		}

		// Create a group for this story
		const storyGroup = new THREE.Group();
		storyGroup.name = `Story_${storyIndex}`;

		// Use rendering order that matches the eMemberType2D priority:
		// slab (1) -> beam (2) -> wall (3) -> [masonry wall (5)] -> column (6)

		// 1. Render slabs first (bottom visual layer, has lowest renderOrder)
		Slabs.forEach((slab) => {
			renderSlab(slab, Nodes, baseHeight, Height, storyGroup);
		});

		// 2. Render beams second
		Beams.forEach((beam) => {
			renderBeam(beam, Nodes, baseHeight, Height, storyGroup);
		});

		// 3. Render walls third
		Walls.forEach((wall) => {
			renderWall(wall, Nodes, baseHeight, Height, storyGroup);
		});

		// 4. Render columns last (top layer, has highest renderOrder)
		Columns.forEach((column) => {
			renderColumn(column, Nodes, baseHeight, Height, storyGroup);
		});

		// Add the story group to the scene
		scene.add(storyGroup);
	}

	// Render a beam
	function renderBeam(
		beam: Beam,
		nodes: Node[],
		baseHeight: number,
		storyHeight: string | number,
		parent: THREE.Group
	): void {
		const { NodeI, NodeJ, Width, Depth, Label } = beam;

		// Find the referenced nodes
		const nodeI = nodes.find((n) => n.ID === NodeI);
		const nodeJ = nodes.find((n) => n.ID === NodeJ);
		if (!nodeI || !nodeJ) return;

		// Get beam dimensions with a slight offset to prevent z-fighting
		const width = parseFloat(Width as string) || 25;
		const depth = parseFloat(Depth as string) || 50;

		// Calculate the beam's length and orientation
		const startX = parseFloat(nodeI.X as string);
		const startZ = parseFloat(nodeI.Y as string);
		const endX = parseFloat(nodeJ.X as string);
		const endZ = parseFloat(nodeJ.Y as string);

		const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endZ - startZ, 2));

		// Create beam geometry with better segmentation for longer beams
		const geometry = new THREE.BoxGeometry(
			length,
			depth,
			width,
			Math.max(2, Math.floor(length / 50)),
			2,
			2
		);
		const mesh = new THREE.Mesh(geometry, materials.beam);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.renderOrder = zIndexLayers.beam;

		// Position the beam at midpoint between the nodes
		// Apply a tiny offset to prevent z-fighting with columns
		mesh.position.set(
			(startX + endX) / 2,
			baseHeight + parseFloat(storyHeight as string) - depth / 2 - 0.1, // Tiny offset
			(startZ + endZ) / 2
		);

		// Rotate the beam to align with the nodes
		const angle = Math.atan2(endZ - startZ, endX - startX);
		mesh.rotation.y = angle;

		mesh.name = `Beam_${Label}`;

		// Store beam properties in userData for selection
		mesh.userData = {
			Label,
			Width: width,
			Depth: depth,
			Length: length.toFixed(2),
			NodeI: NodeI,
			NodeJ: NodeJ
		};

		parent.add(mesh);
	}

	function renderColumn(
		column: Column,
		nodes: Node[],
		baseHeight: number,
		storyHeight: string | number,
		parent: THREE.Group
	): void {
		const { NodeID, B1, B2, Label, IsSupported = false } = column;

		// Find the referenced node
		const node = nodes.find((n) => n.ID === NodeID);
		if (!node) return;

		// Column dimensions
		const width = parseFloat(B1 as string) || 30;
		const depth = parseFloat(B2 as string) || width;
		const height = parseFloat(storyHeight as string);
		// Create column geometry
		const geometry = new THREE.BoxGeometry(width, height, depth, 2, 4, 2);
		const mesh = new THREE.Mesh(geometry, materials.column);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.renderOrder = zIndexLayers.column;

		// Position the column
		mesh.position.set(
			parseFloat(node.X as string),
			baseHeight + height / 2,
			parseFloat(node.Y as string)
		);
		mesh.name = `Column_${Label}`;

		// Store column properties in userData for selection
		mesh.userData = {
			Label,
			B1: width,
			B2: depth,
			Height: height,
			IsSupported: IsSupported
		};

		parent.add(mesh);
	}

	// Render a slab - Improved implementation based on C# example with proper triangulation
	// Replace the existing renderSlab function with this improved implementation:

	function renderSlab(
		slab: Slab,
		nodes: Node[],
		baseHeight: number,
		storyHeight: string | number,
		parent: THREE.Group
	): void {
		const { Nodes: slabNodes, Thickness, Label, CoatingLoad = 0, LiveLoad = 0 } = slab;

		if (!slabNodes || slabNodes.length < 3) return;

		// Find the referenced nodes
		const nodeObjects = slabNodes
			.map((nodeId) => nodes.find((n) => n.ID === nodeId))
			.filter((n): n is Node => n !== undefined);

		if (nodeObjects.length < 3) return;

		// Get slab dimensions with an offset to prevent z-fighting
		const thickness = parseFloat(Thickness as string) || 15;
		const storyHeightNum = parseFloat(storyHeight as string);

		// Apply a slight inset to avoid exact edge overlap with beams/columns
		const insetFactor = 0.998; // Slight inset factor for edges

		try {
			// Create points for top and bottom faces
			const points2D: Array<{ x: number; z: number }> = [];
			const flatCoords: number[] = [];
			const holeIndices: number[] = [];

			// Calculate centroid for inset
			let centroidX = 0,
				centroidZ = 0;
			nodeObjects.forEach((node) => {
				centroidX += parseFloat(node.X as string);
				centroidZ += parseFloat(node.Y as string);
			});
			centroidX /= nodeObjects.length;
			centroidZ /= nodeObjects.length;

			// Collect points with inset
			for (const node of nodeObjects) {
				let x = parseFloat(node.X as string);
				let z = parseFloat(node.Y as string);

				// Apply inset toward centroid to avoid exact edge overlap
				x = centroidX + (x - centroidX) * insetFactor;
				z = centroidZ + (z - centroidZ) * insetFactor;

				// Store 2D point for calculations
				points2D.push({ x, z });

				// Add to flat coordinates array for triangulation
				flatCoords.push(x, z);
			}

			// Check if the polygon points are clockwise using improved shoelace formula
			const isClockwise = calculateIsClockwise(points2D);

			// Earcut expects counter-clockwise vertices for exterior rings
			// If our points are clockwise, we need to reverse them
			let triangulationCoords = flatCoords;
			if (isClockwise) {
				// Build new coordinates in reversed order
				triangulationCoords = [];
				for (let i = points2D.length - 1; i >= 0; i--) {
					triangulationCoords.push(points2D[i].x, points2D[i].z);
				}
			}

			// Triangulate the polygon
			const triangleIndices = earcut(triangulationCoords, holeIndices);

			// If triangulation failed or returned invalid results
			if (!triangleIndices || triangleIndices.length < 3) {
				console.error(`Failed to triangulate slab ${Label}`);
				return;
			}

			// Create 3D points for geometry
			const topPoints: THREE.Vector3[] = [];
			const bottomPoints: THREE.Vector3[] = [];

			// Build points in the correct order (if we had to reverse for triangulation)
			// we still want to maintain the original data order
			const orderedPoints = isClockwise ? [...points2D].reverse() : points2D;

			orderedPoints.forEach((p) => {
				// Top face points (at story height minus a tiny offset to prevent z-fighting)
				topPoints.push(new THREE.Vector3(p.x, baseHeight + storyHeightNum - 0.1, p.z));

				// Bottom face points (offset by thickness plus a tiny offset)
				bottomPoints.push(
					new THREE.Vector3(p.x, baseHeight + storyHeightNum - thickness + 0.1, p.z)
				);
			});

			// Create geometry
			const geometry = new THREE.BufferGeometry();
			const vertices: number[] = [];
			const indices: number[] = [];
			const numPoints = topPoints.length;

			// Add vertices to buffer - first top face, then bottom face
			for (const point of topPoints) {
				vertices.push(point.x, point.y, point.z);
			}

			for (const point of bottomPoints) {
				vertices.push(point.x, point.y, point.z);
			}

			// Add top face triangles - need to account for possible reversal
			for (let i = 0; i < triangleIndices.length; i += 3) {
				// Map the earcut indices to our vertex indices
				const a = triangleIndices[i];
				const b = triangleIndices[i + 1];
				const c = triangleIndices[i + 2];

				// For consistent winding order
				indices.push(a, b, c);
			}

			// Add bottom face triangles with reversed winding for correct normal orientation
			for (let i = 0; i < triangleIndices.length; i += 3) {
				const a = triangleIndices[i];
				const b = triangleIndices[i + 1];
				const c = triangleIndices[i + 2];

				// Add with reverse winding (opposite to top face)
				indices.push(a + numPoints, c + numPoints, b + numPoints);
			}

			// Add side faces - connect adjacent vertices between top and bottom faces
			for (let i = 0; i < numPoints; i++) {
				const next = (i + 1) % numPoints;

				// First triangle of quad
				indices.push(i, next, i + numPoints);

				// Second triangle of quad
				indices.push(next, next + numPoints, i + numPoints);
			}

			// Set vertices and indices
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
			geometry.setIndex(indices);

			// Calculate normals
			geometry.computeVertexNormals();

			// Create mesh with material
			const mesh = new THREE.Mesh(geometry, materials.slab);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.renderOrder = zIndexLayers.slab;
			mesh.name = `Slab_${Label}`;

			// Store slab properties in userData for selection
			mesh.userData = {
				Label,
				Thickness: thickness,
				CoatingLoad: CoatingLoad,
				LiveLoad: LiveLoad
			};

			parent.add(mesh);
		} catch (error) {
			console.error(`Error rendering slab ${Label}:`, error);
		}
	}

	// Improved helper function for clockwise detection using shoelace formula
	function calculateIsClockwise(points: Array<{ x: number; z: number }>): boolean {
		let area = 0;
		for (let i = 0; i < points.length; i++) {
			const j = (i + 1) % points.length;
			// Use correct shoelace formula: (x2-x1)(y2+y1)
			area += (points[j].x - points[i].x) * (points[j].z + points[i].z);
		}
		return area > 0;
	}

	// Helper function to check if points are in clockwise order
	// Implementation matches the C# version provided
	function isClockwise(points: THREE.Vector3[]): boolean {
		let sum = 0;
		for (let i = 0; i < points.length; i++) {
			const current = points[i];
			const next = points[(i + 1) % points.length];
			sum += (next.x - current.x) * (next.z + current.z); // Using z as y in 2D projection
		}
		return sum > 0;
	}

	// Render a wall
	function renderWall(
		wall: Wall,
		nodes: Node[],
		baseHeight: number,
		storyHeight: string | number,
		parent: THREE.Group
	): void {
		const { NodeI, NodeJ, Width, Label, IsSupported = false } = wall;

		// Find the referenced nodes
		const nodeI = nodes.find((n) => n.ID === NodeI);
		const nodeJ = nodes.find((n) => n.ID === NodeJ);
		if (!nodeI || !nodeJ) return;

		// Get wall dimensions
		const width = parseFloat(Width as string) || 20;
		const height = parseFloat(storyHeight as string);

		// Calculate the wall's length and orientation
		const startX = parseFloat(nodeI.X as string);
		const startZ = parseFloat(nodeI.Y as string);
		const endX = parseFloat(nodeJ.X as string);
		const endZ = parseFloat(nodeJ.Y as string);

		const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endZ - startZ, 2));

		// Check if the wall has openings
		let openings: Array<{
			startX: number;
			endX: number;
			startY: number;
			endY: number;
		}> = [];

		if (wall.Spacings && wall.Spacings.length > 0) {
			openings = wall.Spacings.map((spacing) => {
				if (!spacing.Points || spacing.Points.length < 4) return null;

				return {
					startX: parseFloat(spacing.Points[0].X as string),
					endX: parseFloat(spacing.Points[3].X as string),
					startY: parseFloat(spacing.Points[0].Y as string),
					endY: parseFloat(spacing.Points[1].Y as string)
				};
			}).filter(
				(opening): opening is { startX: number; endX: number; startY: number; endY: number } =>
					opening !== null
			);
		}

		if (openings.length === 0) {
			// Simple wall without openings
			const geometry = new THREE.BoxGeometry(
				length,
				height,
				width,
				Math.max(2, Math.floor(length / 50)),
				Math.max(2, Math.floor(height / 50)),
				2
			);
			const mesh = new THREE.Mesh(geometry, materials.wall);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.renderOrder = zIndexLayers.wall;

			// Position with slight offset to prevent z-fighting
			mesh.position.set((startX + endX) / 2, baseHeight + height / 2, (startZ + endZ) / 2);

			// Rotate the wall to align with the nodes
			const angle = Math.atan2(endZ - startZ, endX - startX);
			mesh.rotation.y = angle;

			mesh.name = `Wall_${Label}`;

			// Store wall properties in userData for selection
			mesh.userData = {
				Label,
				Width: width,
				Length: length.toFixed(2),
				Height: height,
				IsSupported: IsSupported
			};

			parent.add(mesh);
		} else {
			// Complex wall with openings - use existing implementation
			renderComplexWall(wall, nodeI, nodeJ, width, height, baseHeight, openings, parent);
		}
	}

	// Render a wall with openings
	function renderComplexWall(
		wall: Wall,
		nodeI: Node,
		nodeJ: Node,
		width: number,
		height: number,
		baseHeight: number,
		openings: Array<{ startX: number; endX: number; startY: number; endY: number }>,
		parent: THREE.Group
	): void {
		const { Label, IsSupported = false } = wall;

		const startX = parseFloat(nodeI.X as string);
		const startZ = parseFloat(nodeI.Y as string);
		const endX = parseFloat(nodeJ.X as string);
		const endZ = parseFloat(nodeJ.Y as string);

		// Calculate direction vector
		const dirX = endX - startX;
		const dirZ = endZ - startZ;
		const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
		const normalizedDirX = dirX / length;
		const normalizedDirZ = dirZ / length;

		// Calculate perpendicular vector for wall width
		const perpX = -normalizedDirZ;
		const perpZ = normalizedDirX;

		// Sort openings by start position
		openings.sort((a, b) => a.startX - b.startX);

		// Create a group for this wall
		const wallGroup = new THREE.Group();
		wallGroup.name = `Wall_${Label}`;
		wallGroup.renderOrder = zIndexLayers.wall;

		// Store wall properties in userData for the group
		wallGroup.userData = {
			Label,
			Width: width,
			Length: length.toFixed(2),
			Height: height,
			IsSupported: IsSupported,
			Openings: openings.length
		};

		// Create wall segments between openings
		let currentX = 0;
		openings.forEach((opening) => {
			// Add wall segment before the opening
			if (opening.startX > currentX) {
				addWallSegment(
					wallGroup,
					startX,
					startZ,
					normalizedDirX,
					normalizedDirZ,
					perpX,
					perpZ,
					width,
					height,
					baseHeight,
					currentX,
					opening.startX - currentX
				);
			}

			// Calculate bottom and top of opening
			const openingBottomY = baseHeight + opening.startY;
			const openingTopY = baseHeight + opening.endY;

			// Add bottom segment
			if (opening.startY > 0) {
				addWallSegment(
					wallGroup,
					startX,
					startZ,
					normalizedDirX,
					normalizedDirZ,
					perpX,
					perpZ,
					width,
					opening.startY,
					baseHeight,
					opening.startX,
					opening.endX - opening.startX
				);
			}

			// Add top segment
			if (opening.endY < height) {
				addWallSegment(
					wallGroup,
					startX,
					startZ,
					normalizedDirX,
					normalizedDirZ,
					perpX,
					perpZ,
					width,
					height - opening.endY,
					baseHeight + opening.endY,
					opening.startX,
					opening.endX - opening.startX
				);
			}

			// Add left side segment
			const leftWidth = 20; // Width of the side segment
			addWallSegment(
				wallGroup,
				startX,
				startZ,
				normalizedDirX,
				normalizedDirZ,
				perpX,
				perpZ,
				width,
				opening.endY - opening.startY,
				baseHeight + opening.startY,
				opening.startX,
				leftWidth
			);

			// Add right side segment
			addWallSegment(
				wallGroup,
				startX,
				startZ,
				normalizedDirX,
				normalizedDirZ,
				perpX,
				perpZ,
				width,
				opening.endY - opening.startY,
				baseHeight + opening.startY,
				opening.endX - leftWidth,
				leftWidth
			);

			currentX = opening.endX;
		});

		// Add final wall segment after the last opening
		if (currentX < length) {
			addWallSegment(
				wallGroup,
				startX,
				startZ,
				normalizedDirX,
				normalizedDirZ,
				perpX,
				perpZ,
				width,
				height,
				baseHeight,
				currentX,
				length - currentX
			);
		}

		// Add the wall group to the parent
		parent.add(wallGroup);

		// Check for special elements (wall beam, wall columns)
		addWallSpecialElements(
			wall,
			startX,
			startZ,
			normalizedDirX,
			normalizedDirZ,
			perpX,
			perpZ,
			width,
			height,
			baseHeight,
			length,
			parent
		);
	}

	// Add a wall segment
	function addWallSegment(
		parent: THREE.Group,
		startX: number,
		startZ: number,
		dirX: number,
		dirZ: number,
		perpX: number,
		perpZ: number,
		width: number,
		height: number,
		baseY: number,
		offsetX: number,
		segmentLength: number
	): void {
		// Use better segmentation for longer wall segments
		const segments = Math.max(2, Math.floor(segmentLength / 50));
		const geometry = new THREE.BoxGeometry(
			segmentLength,
			height,
			width,
			segments,
			Math.max(2, Math.floor(height / 50)),
			2
		);
		const mesh = new THREE.Mesh(geometry, materials.wall);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.renderOrder = zIndexLayers.wall;

		// Position based on offset and direction vectors
		const posX = startX + dirX * (offsetX + segmentLength / 2);
		const posZ = startZ + dirZ * (offsetX + segmentLength / 2);

		mesh.position.set(posX, baseY + height / 2, posZ);

		// Rotate the segment to align with wall direction
		const angle = Math.atan2(dirZ, dirX);
		mesh.rotation.y = angle;

		// Use the parent's name for this segment to make it part of the wall
		mesh.name = parent.name + '_Segment';

		// Copy the wall properties to each segment for selection
		mesh.userData = { ...parent.userData, segmentLength, offsetX };

		parent.add(mesh);
	}

	// Add special elements to a wall (beam and columns)
	function addWallSpecialElements(
		wall: Wall,
		startX: number,
		startZ: number,
		dirX: number,
		dirZ: number,
		perpX: number,
		perpZ: number,
		width: number,
		height: number,
		baseY: number,
		length: number,
		parent: THREE.Group
	): void {
		// Add wall beam if present
		if (wall.WallBeam && parseFloat(wall.WallBeam as string) > 0) {
			const beamHeight = parseFloat(wall.WallBeam as string);
			const geometry = new THREE.BoxGeometry(
				length,
				beamHeight,
				width,
				Math.max(2, Math.floor(length / 50)),
				2,
				2
			);
			const mesh = new THREE.Mesh(geometry, materials.wallBeam);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.renderOrder = zIndexLayers.beam;

			mesh.position.set(
				startX + dirX * (length / 2),
				baseY + height - beamHeight / 2,
				startZ + dirZ * (length / 2)
			);

			const angle = Math.atan2(dirZ, dirX);
			mesh.rotation.y = angle;

			mesh.name = `WallBeam_${wall.Label}`;

			// Store beam properties in userData for selection
			mesh.userData = {
				Label: wall.Label + '_Beam',
				Width: width,
				Depth: beamHeight,
				Length: length.toFixed(2)
			};

			parent.add(mesh);
		}

		// Add wall column at start if present
		if (wall.WallColumnStart && parseFloat(wall.WallColumnStart as string) > 0) {
			const columnWidth = parseFloat(wall.WallColumnStart as string);
			const geometry = new THREE.BoxGeometry(columnWidth, height, width, 2, 4, 2);
			const mesh = new THREE.Mesh(geometry, materials.wallColumn);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.renderOrder = zIndexLayers.column;

			mesh.position.set(
				startX + dirX * (columnWidth / 2),
				baseY + height / 2,
				startZ + dirZ * (columnWidth / 2)
			);

			const angle = Math.atan2(dirZ, dirX);
			mesh.rotation.y = angle;

			mesh.name = `WallColumnStart_${wall.Label}`;

			// Store column properties in userData for selection
			mesh.userData = {
				Label: wall.Label + '_StartColumn',
				Width: columnWidth,
				Depth: width,
				Height: height
			};

			parent.add(mesh);
		}

		// Add wall column at end if present
		if (wall.WallColumnEnd && parseFloat(wall.WallColumnEnd as string) > 0) {
			const columnWidth = parseFloat(wall.WallColumnEnd as string);
			const geometry = new THREE.BoxGeometry(columnWidth, height, width, 2, 4, 2);
			const mesh = new THREE.Mesh(geometry, materials.wallColumn);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.renderOrder = zIndexLayers.column;

			mesh.position.set(
				startX + dirX * (length - columnWidth / 2),
				baseY + height / 2,
				startZ + dirZ * (length - columnWidth / 2)
			);

			const angle = Math.atan2(dirZ, dirX);
			mesh.rotation.y = angle;

			mesh.name = `WallColumnEnd_${wall.Label}`;

			// Store column properties in userData for selection
			mesh.userData = {
				Label: wall.Label + '_EndColumn',
				Width: columnWidth,
				Depth: width,
				Height: height
			};

			parent.add(mesh);
		}
	}

	// Center camera on model - improved for better fitting
	function centerCameraOnModel() {
		if (!scene || !camera) return;

		// Create a bounding box for all objects
		const boundingBox = new THREE.Box3();

		// Get all mesh objects in the scene
		scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				boundingBox.expandByObject(object);
			}
		});

		// Check if bounding box is valid
		if (boundingBox.isEmpty()) return;

		// Get the center of the bounding box
		const center = new THREE.Vector3();
		boundingBox.getCenter(center);

		// Get the size of the bounding box
		const size = new THREE.Vector3();
		boundingBox.getSize(size);

		// Handle differently based on camera type and view mode
		if (is2DMode) {
			// 2D Mode - Orthographic camera
			// Adjust the frustum size to fit the model with some padding
			const padding = 1.2; // 20% padding around the model
			const maxDim = Math.max(size.x, size.z) * padding;
			const aspect = container.clientWidth / container.clientHeight;

			orthographicCamera.left = (-maxDim * aspect) / 2;
			orthographicCamera.right = (maxDim * aspect) / 2;
			orthographicCamera.top = maxDim / 2;
			orthographicCamera.bottom = -maxDim / 2;
			orthographicCamera.updateProjectionMatrix();

			// Position the camera above the center of the model
			orthographicCamera.position.set(center.x, 1000, center.z);
			orthographicCamera.lookAt(center);

			// Update controls target
			controls.target.set(center.x, 0, center.z);
			controls.update();
		} else {
			// 3D Mode - Perspective camera
			// Calculate the distance to fit the entire model in view
			const fov = perspectiveCamera.fov * (Math.PI / 180);
			const maxDim = Math.max(size.x, size.y, size.z);
			let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.1; // Add 10% margin

			// Set a minimum distance
			cameraDistance = Math.max(cameraDistance, 100);

			// Calculate position based on current camera direction
			const direction = new THREE.Vector3()
				.subVectors(perspectiveCamera.position, controls.target)
				.normalize();

			// Position the camera
			perspectiveCamera.position.copy(center).add(direction.multiplyScalar(cameraDistance));
			perspectiveCamera.lookAt(center);

			// Update controls
			controls.target.copy(center);
			controls.update();
		}
	}

	// Export the resetView method to be called from parent components
	export function resetView() {
		// Reset camera to default isometric view
		if (is2DMode) {
			// In 2D mode, reset the orthographic camera
			orthographicCamera.position.set(0, 1000, 0);
			orthographicCamera.lookAt(0, 0, 0);
		} else {
			// In 3D mode, reset the perspective camera to isometric view
			setCubicView('iso');
		}

		// Re-center the model in view
		centerCameraOnModel();
	}

	// Export the getStoryLevels method to allow parent to get story information
	export function getStoryLevels() {
		return storyLevels;
	}

	// Toggle properties panel visibility
	export function togglePropertiesPanel() {
		showProperties = !showProperties;
	}

	// Get formatted member type and label for property panel header
	function getFormattedMemberLabel(): string {
		if (!selectedObjectType || !selectedObjectProperties.Label) {
			return 'Properties';
		}

		return `${selectedObjectType}-${selectedObjectProperties.Label}`;
	}

	// Lifecycle methods
	onMount(() => {
		initScene();
		window.addEventListener('resize', handleResize);
		document.addEventListener('fullscreenchange', handleFullscreenChange);

		// Render model if data is available
		if (modelData) {
			renderBuildingModel();
		}
	});

	onDestroy(() => {
		window.removeEventListener('resize', handleResize);
		container.removeEventListener('mousedown', onMouseDown);
		document.removeEventListener('fullscreenchange', handleFullscreenChange);

		if (animationId) {
			cancelAnimationFrame(animationId);
		}

		// Clean up Three.js resources
		if (renderer) {
			renderer.dispose();
			const element = renderer.domElement;
			if (element && element.parentNode) {
				element.parentNode.removeChild(element);
			}
		}

		if (scene) {
			scene.traverse((object) => {
				if (object instanceof THREE.Mesh) {
					object.geometry.dispose();

					if (object.material) {
						if (Array.isArray(object.material)) {
							object.material.forEach((material) => material.dispose());
						} else {
							object.material.dispose();
						}
					}
				}
			});
		}
	});

	// Watch for changes in modelData
	$: if (isInitialized && modelData) {
		renderBuildingModel();
	}
</script>

<div
	class="building-model-container tooltip"
	bind:this={container}
	style="width: {width}; height: {height};"
>
	{#if !modelData}
		<div class="no-model-message">
			<p>No building model data available</p>
		</div>
	{/if}

	<!-- Controls Panel Toggle Button -->
	<div class="controls-toggle">
		<button class="control-button" on:click={toggleControlsPanel} title="Toggle Controls">
			<span class="material-icons">{isControlsPanelOpen ? 'menu_open' : 'menu'}</span>
		</button>
	</div>

	<!-- Controls Panel -->
	{#if isControlsPanelOpen}
		<div class="controls-panel">
			<div class="controls-group">
				<button
					class="control-button"
					on:click={toggleViewMode}
					title="Switch to {viewModeText} view"
				>
					<span class="material-icons">{is2DMode ? '3d_rotation' : 'view_in_ar'}</span>
				</button>

				<button
					class="control-button"
					on:click={() => (showStoreyFilter = !showStoreyFilter)}
					title="Story Filters"
					disabled={is2DMode}
				>
					<span class="material-icons">{showStoreyFilter ? 'filter_list_off' : 'filter_list'}</span>
				</button>

				<button class="control-button" on:click={resetView} title="Reset View">
					<span class="material-icons">restart_alt</span>
				</button>

				<button class="control-button" on:click={toggleFullscreen} title="Toggle Fullscreen">
					<span class="material-icons">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- Story Filter Panel -->
	{#if showStoreyFilter}
		<div class="story-filter-panel">
			<div class="filter-header">
				<h3>Story Filters</h3>
				<button class="close-button" on:click={() => (showStoreyFilter = false)}>
					<span class="material-icons">close</span>
				</button>
			</div>
			<div class="filter-options">
				{#each storyLevels as story}
					<label class="filter-option">
						<input
							type="checkbox"
							bind:checked={storeyFilters[story.name]}
							on:change={() => {
								// Get all currently selected stories
								const selectedStories = Object.entries(storeyFilters)
									.filter(([_, isVisible]) => isVisible)
									.map(([name]) => name);
								// Apply the filter
								filterStories(selectedStories);
							}}
						/>
						<span>{story.name}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Tree View Panel - MODIFIED: increased height, transparent background -->
	{#if isTreeViewVisible}
		<div class="tree-view-panel" class:with-properties={showProperties}>
			<div class="panel-header">
				<h3>
					Building Elements
					{#if is2DMode}
						<span class="view-mode-indicator">2D Mode: Select a story to view</span>
					{/if}
				</h3>
				<button class="close-button" on:click={toggleTreeView}>
					<span class="material-icons">close</span>
				</button>
			</div>
			<BuildingTreeView
				bind:this={treeViewRef}
				{modelData}
				{scene}
				{selectObject}
				{deselectObject}
				{is2DMode}
				on:storySelected={(e) => selectStoryInTreeView(e.detail.storyName)}
				width="100%"
				height="calc(100% - 40px)"
			/>
		</div>
	{/if}

	<!-- Tree View Toggle Button - only show when tree view is hidden -->
	{#if !isTreeViewVisible}
		<div class="tree-view-toggle">
			<button class="control-button" on:click={toggleTreeView} title="Show Tree View">
				<span class="material-icons">account_tree</span>
			</button>
		</div>
	{/if}

	<BuildingPropertiesPanel
		{selectedObjectType}
		{selectedObjectProperties}
		{showProperties}
		{isTreeViewVisible}
		width="250px"
	/>
</div>

<style>
	.building-model-container {
		position: relative;
		width: 100%;
		height: 100%;
		background-color: #f8fafc;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.no-model-message {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #64748b;
		font-size: 0.9rem;
		text-align: center;
	}

	/* Controls Toggle Button */
	.controls-toggle {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 100;
	}

	.control-button {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.9);
		border: 1px solid #ddd;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
	}

	.control-button:hover {
		background-color: rgba(255, 255, 255, 1);
		transform: scale(1.1);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
	}

	.control-button:active {
		transform: scale(0.9);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.control-button .material-icons {
		font-size: 16px;
		color: #333;
	}

	/* Controls Panel */
	.controls-panel {
		position: absolute;
		top: 52px;
		right: 10px;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
		z-index: 99;
		overflow: hidden;
		padding: 8px 6px;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.controls-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.controls-group .control-button {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.controls-group .control-button:hover {
		transform: scale(1.1);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
	}

	.controls-group .control-button:active {
		transform: scale(0.9);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	/* Story Filter Panel */
	.story-filter-panel {
		position: absolute;
		top: 52px;
		right: 10px;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
		width: 180px;
		z-index: 99;
		overflow: hidden;
		animation: fadeIn 0.25s ease-out;
	}

	.view-mode-indicator {
		font-size: 0.6rem;
		font-weight: normal;
		color: #5c6b7e;
		/* margin-left: 6px; */
		/* padding: 2px 6px; */
		background-color: rgba(241, 245, 249, 0.7);
		border-radius: 4px;
		white-space: nowrap;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background-color: #f1f5f9;
		border-bottom: 1px solid #e2e8f0;
	}

	.filter-header h3 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: #334155;
	}

	.close-button {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background-color: transparent;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.close-button:hover {
		background-color: rgba(0, 0, 0, 0.05);
		transform: rotate(90deg);
	}

	.close-button:active {
		transform: scale(0.9) rotate(90deg);
	}

	.close-button .material-icons {
		font-size: 16px;
		color: #64748b;
	}

	.filter-options {
		padding: 6px;
		max-height: 250px;
		overflow-y: auto;
	}

	.filter-option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		cursor: pointer;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.filter-option:hover {
		background-color: #f1f5f9;
	}

	.filter-option input {
		cursor: pointer;
		width: 14px;
		height: 14px;
	}

	.filter-option span {
		font-size: 12px;
		color: #334155;
	}

	/* MODIFIED: Tree View Panel - Increased height to 70% of viewer, transparent background */
	.tree-view-panel {
		position: absolute;
		top: 10px;
		left: 10px;
		background-color: rgba(255, 255, 255, 0.8); /* Transparent background */
		border-radius: 8px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		width: 250px;
		height: 70vh; /* Increased height to 70% of viewport */
		max-height: 70%; /* Also limit by percentage of container */
		z-index: 100;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		/* animation: slideInLeft 0.3s ease-out; */
		backdrop-filter: blur(5px); /* Adds a nice blur effect for better readability */
	}

	.tree-view-toggle {
		position: absolute;
		top: 10px;
		left: 10px;
		z-index: 100;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background-color: rgba(241, 245, 249, 0.7); /* Semi-transparent header */
		border-bottom: 1px solid rgba(226, 232, 240, 0.8);
	}

	.panel-header h3 {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: #334155;
	}

	@keyframes slideInLeft {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	:global(:fullscreen) .building-model-container {
		width: 100vw !important;
		height: 100vh !important;
		border-radius: 0;
	}
</style>
