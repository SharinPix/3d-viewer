import * as THREE from "three";
import { Utils } from "./utils";
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { Loader } from "./loader";

interface SpherePair {
  sphere1: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  sphere2: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  color: string;
  distance: number;
}

const METERS_TO_INCHES = 39.3701;
const METERS_TO_FEET = 3.28084;
const METERS_TO_CM = 100;

export class Measurements {
  private raycaster = new THREE.Raycaster();
  private spherePairs: SpherePair[] = [];
  private mouse = new THREE.Vector2();
  private scene: THREE.Scene;
  private control: DragControls;
  private group: THREE.Group;
  private generatedColor: string | undefined = undefined;
  private lastValidPosition: THREE.Vector3 | null = null;
  private camera: THREE.Camera;
  private onMouseDown: (mouseEvent: MouseEvent) => void;

  private currentSpheres: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    group: THREE.Group,
    loader: Loader
  ) {
    this.scene = scene;
    this.group = group;
    this.camera = camera;

    this.control = new DragControls([], camera, renderer.domElement);
    
    this.onMouseDown = (mouseEvent: MouseEvent) => {
      this.updateMouse(mouseEvent);
    };

    this.control.addEventListener('dragstart', (event: any) => {
      window.addEventListener('mousedown', this.onMouseDown);
      loader.lockRotationAndClick();
      this.lastValidPosition = event.object.position.clone();
    });

    this.control.addEventListener('dragend', (event: any) => {
      const onMouseUp = (mouseEvent: MouseEvent) => {
        this.updateMouse(mouseEvent);
        this.onSphereDragEnd(event.object as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("mousedown", this.onMouseDown);
      };
      window.addEventListener('mouseup', onMouseUp);
      setTimeout(() => {
        loader.unlockRotationAndClick();
      }, 500);
    });

    this.control.addEventListener('drag', (event: any) => {
      this.onSphereDrag(event.object as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>);
    });

    this.loadSpherePairs();
  }

  public placePoints(camera: THREE.Camera, event: MouseEvent) {
    if (!this.generatedColor) {
      this.generatedColor = Utils.generateRandomColor();
    }

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, camera);

    const intersects = this.raycaster.intersectObject(this.group, true);
    if (intersects.length > 0) {
      this.addPoint(intersects[0].point, this.generatedColor);
    }
  }

  private updateMouse(event: MouseEvent) {
    this.mouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
  }

  private addPoint(point: THREE.Vector3, color: string) {
    const sphere = this.createSphere(point, color);
    this.control.getObjects().push(sphere);
    this.currentSpheres.push(sphere);

    if (this.currentSpheres.length === 2) {
      const [sphere1, sphere2] = this.currentSpheres;
      const pair: SpherePair = {
        sphere1,
        sphere2,
        line: new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([sphere1.position, sphere2.position]),
          new THREE.LineBasicMaterial({ color })
        ),
        color,
        distance: 0
      };
      this.scene.add(pair.line);
      this.spherePairs.push(pair);
      this.calculateDistanceForPair(pair);
      this.updateMeasurementsDisplay();
      this.saveSpherePairs();
      this.currentSpheres = [];
      this.generatedColor = undefined;
    }
  }

  private createSphere(point: THREE.Vector3, color: string): THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 32, 32),
      new THREE.MeshBasicMaterial({ color })
    );
    sphere.position.copy(point);
    this.scene.add(sphere);
    return sphere;
  }

  private calculateDistanceForPair(pair: SpherePair) {
    const distance = Utils.roundOff(pair.sphere1.position.distanceTo(pair.sphere2.position));
    pair.distance = distance;
  }

  private convertDistance(distanceInMeters: number, unit: string): number {
    switch (unit) {
      case 'm':
        return distanceInMeters;
      case 'inch':
        return distanceInMeters * METERS_TO_INCHES;
      case 'foot':
        return distanceInMeters * METERS_TO_FEET;
      case 'cm':
      default:
        return distanceInMeters * METERS_TO_CM;
    }
  }

  private updateMeasurementsDisplay() {
    const measurementsContainer = document.querySelector("#measurements") as HTMLElement;
    const measurementsTableContainer = document.querySelector("#measurements-table-container") as HTMLElement;
    
    if (this.spherePairs.length === 0 && measurementsTableContainer) {
      measurementsTableContainer.style.display = "none";
      this.currentSpheres.forEach(sphere => {
        this.scene.remove(sphere);
      });
      this.spherePairs = [];
      this.currentSpheres = [];
      this.generatedColor = undefined;
      return;
    } else {
      measurementsTableContainer.style.display = "block";
    }
    const unitsDropdown = document.getElementById("units-dropdown") as HTMLSelectElement;
    if (!measurementsContainer || !unitsDropdown) return;

    const selectedUnit = unitsDropdown.value;

    let rows = this.spherePairs.map((pair, index) => {
      const convertedDistance = this.convertDistance(pair.distance, selectedUnit).toFixed(2);
      return `
        <tr>
          <td style="text-align: center; vertical-align: middle;">
            <div style="width: 60px; height: 25px; background-color: ${pair.color}; border: 1px solid black; margin: 0 auto;"></div>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            ${convertedDistance} ${selectedUnit}
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <button class="removeLine" data-index="${index}">Remove Line</button>
          </td>
        </tr>`;
    }).join("");

    measurementsContainer.innerHTML = rows;
    this.addEventListeners();
  }

  private addEventListeners() {
    const clearButton = document.getElementById("clearButton");
    clearButton?.addEventListener("click", () => this.clearAll());

    const unitDropdown = document.getElementById("unit-dropdown") as HTMLSelectElement;
    unitDropdown?.addEventListener("change", () => this.updateMeasurementsDisplay());

    document.querySelectorAll(".removeLine").forEach((button) => {
      const index = parseInt((button as HTMLElement).dataset.index!, 10);
      button.addEventListener("click", () => this.removeLine(index));
    });
  }

  private clearAll() {
    localStorage.removeItem('spherePairs');
    this.currentSpheres.forEach(sphere => {
      this.scene.remove(sphere);
    });
    this.spherePairs.forEach(pair => {
      this.scene.remove(pair.sphere1);
      this.scene.remove(pair.sphere2);
      this.scene.remove(pair.line);
      const objects = this.control.getObjects();
      const index1 = objects.indexOf(pair.sphere1);
      if (index1 > -1) objects.splice(index1, 1);
      const index2 = objects.indexOf(pair.sphere2);
      if (index2 > -1) objects.splice(index2, 1);
    });
    this.spherePairs = [];
    this.currentSpheres = [];
    this.generatedColor = undefined;
    this.updateMeasurementsDisplay();
  }

  private removeLine(index: number) {
    const pair = this.spherePairs[index];
    if (pair) {
      this.scene.remove(pair.line);
      this.scene.remove(pair.sphere1);
      this.scene.remove(pair.sphere2);
      const objects = this.control.getObjects();
      const index1 = objects.indexOf(pair.sphere1);
      if (index1 > -1) objects.splice(index1, 1);
      const index2 = objects.indexOf(pair.sphere2);
      if (index2 > -1) objects.splice(index2, 1);
      this.spherePairs.splice(index, 1);
      this.updateMeasurementsDisplay();
      this.saveSpherePairs();
    }
  }

  private onSphereDrag(draggedSphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) {
    const pair = this.spherePairs.find(p => p.sphere1 === draggedSphere || p.sphere2 === draggedSphere);
    if (pair) {
      pair.line.geometry.setFromPoints([pair.sphere1.position, pair.sphere2.position]);
    }
  }

  private onSphereDragEnd(
    draggedSphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) {
    const intersects = this.raycaster.intersectObject(this.group, true);
    if (intersects.length > 0) {
      draggedSphere.position.copy(intersects[0].point);
    } else if (this.lastValidPosition) {
      draggedSphere.position.copy(this.lastValidPosition);
    }
    this.lastValidPosition = null;
    this.saveSpherePairs();
  }

  private saveSpherePairs() {
    const dataToSave = this.spherePairs.map(pair => ({
      sphere1: pair.sphere1.position.toArray(),
      sphere2: pair.sphere2.position.toArray(),
      color: pair.color,
      distance: pair.distance
    }));
    localStorage.setItem('spherePairs', JSON.stringify(dataToSave));
  }

  private loadSpherePairs() {
    const savedData = localStorage.getItem('spherePairs');
    if (savedData) {
      const spherePairsData = JSON.parse(savedData);
      spherePairsData.forEach((data: any) => {
        const sphere1 = this.createSphere(new THREE.Vector3(...data.sphere1), data.color);
        const sphere2 = this.createSphere(new THREE.Vector3(...data.sphere2), data.color);
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([sphere1.position, sphere2.position]),
          new THREE.LineBasicMaterial({ color: data.color })
        );
        this.scene.add(line);
        
        const pair: SpherePair = { sphere1, sphere2, line, color: data.color, distance: data.distance };
        this.spherePairs.push(pair);
        this.calculateDistanceForPair(pair);
      });

      this.updateMeasurementsDisplay();
    }
  }
}
