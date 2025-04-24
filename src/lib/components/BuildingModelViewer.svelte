<!-- src/lib/components/BuildingModelViewer.svelte -->
<script lang="ts">
	// @ts-ignore
	// For polygon triangulation - we'll use Earcut as it's reliable for complex polygons
	import earcut from 'earcut';
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
	import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

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
	let camera: THREE.PerspectiveCamera;
	let controls: OrbitControls;
	let raycaster: THREE.Raycaster;
	let mouse: THREE.Vector2;
	let isInitialized = false;
	let animationId: number;
	let fontLoader: FontLoader;
	let isFontLoaded = false;
	let defaultFont: Font | null = null;
	let zIndexLayers = {
		grid: 0,
		axes: 5,
		slab: 15,
		wall: 20,
		beam: 30,
		column: 40
	};

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

	// Storey filter state
	let storeyFilters: Record<string, boolean> = {};
	let showStoreyFilter = false;
	let storyLevels: { name: string; level: number }[] = [];

	// Store the story name mapping (index to actual name)
	let storyNameMapping: Record<string, string> = {};

	// Materials for different structural elements with improved quality and z-fighting prevention
	const defaultMaterials = {
		column: new THREE.MeshPhongMaterial({
			color: 0x5472d3, // Steel blue for columns - more professional
			transparent: false, // Columns remain opaque
			specular: 0x999999,
			shininess: 60,
			flatShading: false,
			depthWrite: true,
			polygonOffset: true,
			polygonOffsetFactor: 1,
			polygonOffsetUnits: 1
		}),
		beam: new THREE.MeshPhongMaterial({
			color: 0x2e8b57, // Sea green for beams - richer color
			transparent: false,
			// opacity: 0.,
			specular: 0x888888,
			shininess: 55,
			flatShading: false,
			depthWrite: true, // Changed to false for transparent objects
			depthTest: true,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1
		}),
		slab: new THREE.MeshPhongMaterial({
			color: 0xcccccc, // Lighter gray for slabs
			transparent: false,
			// opacity: 0.9, // More transparent
			specular: 0x777777,
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
			logarithmicDepthBuffer: true, // Crucial for z-fighting prevention
			precision: 'highp'
		});

		// Additional renderer settings to improve rendering quality and reduce artifacts
		renderer.setClearColor(0xffffff, 1); // Slightly lighter background
		renderer.sortObjects = true; // Critical for transparent object rendering
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		container.appendChild(renderer.domElement);

		// Create scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xffffff);

		// Create camera with improved near/far plane settings
		const aspect = container.clientWidth / container.clientHeight;
		camera = new THREE.PerspectiveCamera(45, aspect, 5, 9999999999); // Adjusted near plane for better precision
		camera.position.set(500, 500, 500);
		camera.lookAt(0, 0, 0);

		// Add lights for better quality
		// Ambient light for base illumination
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Increased ambient light
		scene.add(ambientLight);

		// Main directional light with shadows
		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
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
		const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
		backLight.position.set(-200, 200, -200);
		scene.add(backLight);

		// Add fill light
		const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
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

	// Mouse down event handler for object selection
	function onMouseDown(event: MouseEvent) {
		// Calculate mouse position in normalized device coordinates
		// (-1 to +1) for both components
		const rect = container.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		mouse.x = (x / container.clientWidth) * 2 - 1;
		mouse.y = -(y / container.clientHeight) * 2 + 1;

		// Update the raycaster with the mouse position and camera
		raycaster.setFromCamera(mouse, camera);

		// Get selectable objects to test for intersection
		const selectableObjects: THREE.Object3D[] = [];

		// Collect all beam, column, wall, and slab meshes
		scene.traverse((object) => {
			if (
				object instanceof THREE.Mesh &&
				(object.name.startsWith('Beam_') ||
					object.name.startsWith('Column_') ||
					object.name.startsWith('Wall_') ||
					object.name.startsWith('Slab_'))
			) {
				// Only include objects from visible stories
				const storyGroup = object.parent;
				if (storyGroup && storyGroup.visible) {
					selectableObjects.push(object);
				}
			}
		});

		// Find intersections
		const intersects = raycaster.intersectObjects(selectableObjects);

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

		console.log('Resizing to', width, 'x', height);

		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		// Re-render the scene
		if (scene) {
			renderer.render(scene, camera);
		}
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

	// Set camera to predefined views
	export function setCubicView(viewType: 'top' | 'front' | 'side' | 'iso') {
		if (!camera || !controls) return;

		// Get the model center for camera targeting
		const center = new THREE.Vector3(0, 0, 0);
		const boundingBox = new THREE.Box3();

		scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				boundingBox.expandByObject(object);
			}
		});

		boundingBox.getCenter(center);

		// Calculate distance based on model size
		const size = new THREE.Vector3();
		boundingBox.getSize(size);
		const maxDim = Math.max(size.x, size.y, size.z);
		const fov = camera.fov * (Math.PI / 180);
		let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2; // Add 20% for better view

		// Set camera position based on view type
		switch (viewType) {
			case 'top': // Y-axis view (top-down)
				camera.position.set(center.x, center.y + cameraDistance, center.z);
				break;
			case 'front': // Z-axis view
				camera.position.set(center.x, center.y, center.z + cameraDistance);
				break;
			case 'side': // X-axis view
				camera.position.set(center.x + cameraDistance, center.y, center.z);
				break;
			case 'iso': // Isometric view
				camera.position.set(
					center.x + cameraDistance * 0.7,
					center.y + cameraDistance * 0.7,
					center.z + cameraDistance * 0.7
				);
				break;
		}

		// Look at center of model
		camera.lookAt(center);

		// Update controls target
		controls.target.copy(center);
		controls.update();

		// Render with new camera position
		renderer.render(scene, camera);
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

		// Modified rendering order to prevent z-fighting:
		// 1. Render slabs first (bottom visual layer, but rendered first)
		Slabs.forEach((slab) => {
			renderSlab(slab, Nodes, baseHeight, Height, storyGroup);
		});

		// 2. Render walls next
		Walls.forEach((wall) => {
			renderWall(wall, Nodes, baseHeight, Height, storyGroup);
		});

		// 3. Render beams
		Beams.forEach((beam) => {
			renderBeam(beam, Nodes, baseHeight, Height, storyGroup);
		});

		// 4. Render columns last (top layer)
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
			.map((nodeId) => {
				return nodes.find((n) => n.ID === nodeId);
			})
			.filter((n): n is Node => n !== undefined);

		if (nodeObjects.length < 3) return;

		// Get slab dimensions with an offset to prevent z-fighting
		const thickness = parseFloat(Thickness as string) || 15;
		const storyHeightNum = parseFloat(storyHeight as string);

		// Apply a slight inset to avoid exact edge overlap with beams/columns
		const insetFactor = 0.998; // Slight inset factor for edges

		try {
			// Create points for top and bottom faces
			const topPoints: THREE.Vector3[] = [];
			const bottomPoints: THREE.Vector3[] = [];
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

				// Top face points (at story height minus a tiny offset to prevent z-fighting with beams)
				topPoints.push(new THREE.Vector3(x, baseHeight + storyHeightNum - 0.1, z));

				// Bottom face points (offset by thickness plus a tiny offset)
				bottomPoints.push(new THREE.Vector3(x, baseHeight + storyHeightNum - thickness + 0.1, z));

				// Add to flat coordinates array for triangulation
				flatCoords.push(x, z);
			}

			if (isClockwise(topPoints)) {
				topPoints.reverse();
				bottomPoints.reverse();

				const tempCoords: number[] = [];
				for (let i = flatCoords.length - 2; i >= 0; i -= 2) {
					tempCoords.push(flatCoords[i], flatCoords[i + 1]);
				}
				flatCoords.length = 0;
				flatCoords.push(...tempCoords);
			}

			// Triangulate the polygon
			const triangleIndices = earcut(flatCoords, holeIndices);

			// Create geometry
			const geometry = new THREE.BufferGeometry();
			const vertices: number[] = [];
			const indices: number[] = [];
			const numPoints = topPoints.length;

			// Add vertices to buffer
			for (const point of topPoints) {
				vertices.push(point.x, point.y, point.z);
			}

			for (const point of bottomPoints) {
				vertices.push(point.x, point.y, point.z);
			}

			// Add top face triangles
			for (let i = 0; i < triangleIndices.length; i += 3) {
				indices.push(triangleIndices[i], triangleIndices[i + 1], triangleIndices[i + 2]);
			}

			// Add bottom face triangles with reversed winding
			for (let i = 0; i < triangleIndices.length; i += 3) {
				indices.push(
					triangleIndices[i] + numPoints,
					triangleIndices[i + 2] + numPoints,
					triangleIndices[i + 1] + numPoints
				);
			}

			// Add side faces
			for (let i = 0; i < numPoints; i++) {
				const next = (i + 1) % numPoints;
				// First triangle
				indices.push(i, next, numPoints + i);
				// Second triangle
				indices.push(next, numPoints + next, numPoints + i);
			}

			// Set vertices and indices
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
			geometry.setIndex(indices);

			// Calculate normals
			geometry.computeVertexNormals();

			// Create mesh with modified material
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

	// Helper function for triangulation - converts Vector3 array to the flat format earcut needs
	function pointsToEarcut(points: THREE.Vector3[]): number[] {
		const result: number[] = [];
		for (const point of points) {
			// Only use X and Z for 2D triangulation (Y is up in THREE.js)
			result.push(point.x, point.z);
		}
		return result;
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

	// Center camera on model
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

		// Calculate the distance to fit the entire model in view
		const maxDim = Math.max(size.x, size.y, size.z);
		const fov = camera.fov * (Math.PI / 180);
		let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2));

		// Set a minimum distance
		cameraDistance = Math.max(cameraDistance, 100);

		// Position the camera
		const direction = new THREE.Vector3(1, 1, 1).normalize();
		camera.position.copy(center).add(direction.multiplyScalar(cameraDistance));
		camera.lookAt(center);

		// Update controls
		if (controls) {
			controls.target.copy(center);
			controls.update();
		}
	}

	// Export the resetView method to be called from parent components
	export function resetView() {
		if (!scene || !camera || !controls) return;

		// Center camera on model
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

	// Lifecycle methods
	onMount(() => {
		initScene();
		window.addEventListener('resize', handleResize);

		// Render model if data is available
		if (modelData) {
			renderBuildingModel();
		}
	});

	onDestroy(() => {
		window.removeEventListener('resize', handleResize);
		container.removeEventListener('mousedown', onMouseDown);

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
	class="building-model-container"
	bind:this={container}
	style="width: {width}; height: {height};"
>
	{#if !modelData}
		<div class="no-model-message">
			<p>No building model data available</p>
		</div>
	{/if}

	<!-- View Controls -->
	<div class="view-controls">
		<button class="view-button" on:click={() => setCubicView('top')} title="Top View">
			<span class="material-icons">arrow_upward</span>
		</button>
		<button class="view-button" on:click={() => setCubicView('front')} title="Front View">
			<span class="material-icons">arrow_forward</span>
		</button>
		<button class="view-button" on:click={() => setCubicView('side')} title="Side View">
			<span class="material-icons">arrow_right_alt</span>
		</button>
		<button class="view-button" on:click={() => setCubicView('iso')} title="Isometric View">
			<span class="material-icons">3d_rotation</span>
		</button>
		<button class="view-button" on:click={resetView} title="Reset View">
			<span class="material-icons">restart_alt</span>
		</button>
	</div>

	<!-- Story Filter Toggle -->
	<div class="story-filter-toggle">
		<button
			class="filter-button"
			on:click={() => (showStoreyFilter = !showStoreyFilter)}
			title="Story Filters"
		>
			<span class="material-icons">{showStoreyFilter ? 'filter_list_off' : 'filter_list'}</span>
		</button>
	</div>

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

	<!-- Properties Panel -->
	{#if showProperties && selectedObject}
		<div class="properties-panel">
			<div class="properties-header">
				<h3>{selectedObjectType} Properties</h3>
				<button class="close-button" on:click={deselectObject}>
					<span class="material-icons">close</span>
				</button>
			</div>
			<div class="properties-content">
				{#if selectedObjectType === 'Beam'}
					<div class="property">
						<span class="property-label">Label:</span>
						<span class="property-value">{selectedObjectProperties.Label || 'N/A'}</span>
					</div>
					<div class="property">
						<span class="property-label">Width:</span>
						<span class="property-value">{selectedObjectProperties.Width || 'N/A'} cm</span>
					</div>
					<div class="property">
						<span class="property-label">Depth:</span>
						<span class="property-value">{selectedObjectProperties.Depth || 'N/A'} cm</span>
					</div>
					<div class="property">
						<span class="property-label">Length:</span>
						<span class="property-value">{selectedObjectProperties.Length || 'N/A'} cm</span>
					</div>
				{:else if selectedObjectType === 'Column'}
					<div class="property">
						<span class="property-label">Label:</span>
						<span class="property-value">{selectedObjectProperties.Label || 'N/A'}</span>
					</div>
					<div class="property">
						<span class="property-label">B1:</span>
						<span class="property-value">{selectedObjectProperties.B1 || 'N/A'} cm</span>
					</div>
					<div class="property">
						<span class="property-label">B2:</span>
						<span class="property-value">{selectedObjectProperties.B2 || 'N/A'} cm</span>
					</div>
					<div class="property">
						<span class="property-label">Is Supported:</span>
						<span class="property-value">{selectedObjectProperties.IsSupported ? 'Yes' : 'No'}</span
						>
					</div>
				{:else if selectedObjectType === 'Wall'}
					<div class="property">
						<span class="property-label">Label:</span>
						<span class="property-value">{selectedObjectProperties.Label || 'N/A'}</span>
					</div>
					<div class="property">
						<span class="property-label">Width:</span>
						<span class="property-value">{selectedObjectProperties.Width || 'N/A'} cm</span>
					</div>
					<div class="property">
						<span class="property-label">Length:</span>
						<span class="property-value">{selectedObjectProperties.Length || 'N/A'} cm</span>
					</div>
					<div class="property">
						<span class="property-label">Is Supported:</span>
						<span class="property-value">{selectedObjectProperties.IsSupported ? 'Yes' : 'No'}</span
						>
					</div>
					{#if selectedObjectProperties.Openings}
						<div class="property">
							<span class="property-label">Openings:</span>
							<span class="property-value">{selectedObjectProperties.Openings}</span>
						</div>
					{/if}
				{:else if selectedObjectType === 'Slab'}
					<div class="property">
						<span class="property-label">Label:</span>
						<span class="property-value">{selectedObjectProperties.Label || 'N/A'}</span>
					</div>
					<div class="property">
						<span class="property-label">Thickness:</span>
						<span class="property-value">{selectedObjectProperties.Thickness || 'N/A'} cm</span>
					</div>
					<div class="property">
						<span class="property-label">Coating Load:</span>
						<span class="property-value">{selectedObjectProperties.CoatingLoad || '0'} kN/m²</span>
					</div>
					<div class="property">
						<span class="property-label">Live Load:</span>
						<span class="property-value">{selectedObjectProperties.LiveLoad || '0'} kN/m²</span>
					</div>
				{:else}
					<div class="property">
						<span class="property-label">Type:</span>
						<span class="property-value">{selectedObjectType}</span>
					</div>
					{#each Object.entries(selectedObjectProperties) as [key, value]}
						<div class="property">
							<span class="property-label">{key}:</span>
							<span class="property-value">{value}</span>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
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

	/* View Controls */
	.view-controls {
		position: absolute;
		top: 10px;
		left: 10px;
		display: flex;
		flex-direction: column;
		gap: 5px;
		z-index: 100;
	}

	.view-button {
		width: 32px;
		height: 32px;
		border-radius: 4px;
		background-color: rgba(255, 255, 255, 0.9);
		border: 1px solid #ddd;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.view-button:hover {
		background-color: rgba(255, 255, 255, 1);
		transform: translateY(-1px);
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
	}

	.view-button .material-icons {
		font-size: 16px;
		color: #333;
	}

	/* Story Filter Toggle */
	.story-filter-toggle {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 100;
	}

	.filter-button {
		width: 32px;
		height: 32px;
		border-radius: 4px;
		background-color: rgba(255, 255, 255, 0.9);
		border: 1px solid #ddd;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.filter-button:hover {
		background-color: rgba(255, 255, 255, 1);
		transform: translateY(-1px);
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
	}

	.filter-button .material-icons {
		font-size: 16px;
		color: #333;
	}

	/* Story Filter Panel */
	.story-filter-panel {
		position: absolute;
		top: 50px;
		right: 10px;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
		width: 200px;
		z-index: 100;
		overflow: hidden;
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
		font-size: 14px;
		font-weight: 600;
		color: #334155;
	}

	.close-button {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		background-color: transparent;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.close-button:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}

	.close-button .material-icons {
		font-size: 18px;
		color: #64748b;
	}

	.filter-options {
		padding: 8px;
		max-height: 300px;
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
	}

	.filter-option span {
		font-size: 14px;
		color: #334155;
	}

	/* Properties Panel */
	.properties-panel {
		position: absolute;
		bottom: 10px;
		right: 10px;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
		width: 250px;
		z-index: 100;
		overflow: hidden;
	}

	.properties-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background-color: #f1f5f9;
		border-bottom: 1px solid #e2e8f0;
	}

	.properties-header h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #334155;
	}

	.properties-content {
		padding: 12px;
		max-height: 300px;
		overflow-y: auto;
	}

	.property {
		display: flex;
		justify-content: space-between;
		padding: 4px 0;
		border-bottom: 1px solid #f1f5f9;
	}

	.property:last-child {
		border-bottom: none;
	}

	.property-label {
		font-size: 13px;
		font-weight: 500;
		color: #64748b;
	}

	.property-value {
		font-size: 13px;
		color: #334155;
	}

	:global(:fullscreen) .building-model-container {
		width: 100vw !important;
		height: 100vh !important;
		border-radius: 0;
	}
</style>
