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
  private points: THREE.Vector3[] = [];
  private spherePairs: SpherePair[] = [];
  private mouse = new THREE.Vector2();
  private scene: THREE.Scene;
  private control: DragControls;
  private group: THREE.Group;
  private colors: string[] = [];
  private generatedColor: string | undefined = undefined;
  private measurementsTable: HTMLTableElement;

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

    this.measurementsTable = document.querySelector("#measurements-table-container") as HTMLTableElement;
    if (this.measurementsTable) {
      this.measurementsTable.style.display = "none";
    }

    this.control = new DragControls([], camera, renderer.domElement);

    this.control.addEventListener('dragstart', () => {
      loader.lockRotationAndClick();
    });

    this.control.addEventListener('dragend', () => {
      setTimeout(() => {
        loader.unlockRotationAndClick();
      }, 500);
    });

    this.control.addEventListener('drag', (event: any) => {
      this.onSphereDrag(event.object as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>);
    });
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
      if (this.points.length === 2) {
        this.calculateDistance();
        this.points = [];
        this.generatedColor = undefined;
      }
    }
  }

  private updateMouse(event: MouseEvent) {
    this.mouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
  }

  private addPoint(point: THREE.Vector3, color: string) {
    this.points.push(point);
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
      this.currentSpheres = [];
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

  private calculateDistance() {
    this.spherePairs.forEach(pair => {
      this.calculateDistanceForPair(pair);
    });
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
    if (this.spherePairs.length === 0 && this.measurementsTable) {
      this.measurementsTable.style.display = "none";
      return;
    } else {
      this.measurementsTable.style.display = "block";
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
    this.spherePairs.forEach(pair => {
      this.scene.remove(pair.sphere1);
      this.scene.remove(pair.sphere2);
      this.scene.remove(pair.line);
    });
    this.spherePairs = [];
    this.updateMeasurementsDisplay();
  }

  private removeLine(index: number) {
    const pair = this.spherePairs[index];
    if (pair) {
      this.scene.remove(pair.line);
      this.scene.remove(pair.sphere1);
      this.scene.remove(pair.sphere2);
      this.spherePairs.splice(index, 1);
      this.updateMeasurementsDisplay();
    }
  }

  private onSphereDrag(draggedSphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) {
    const pair = this.spherePairs.find(p => p.sphere1 === draggedSphere || p.sphere2 === draggedSphere);
    if (!pair) return;

    const positions = pair.line.geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, pair.sphere1.position.x, pair.sphere1.position.y, pair.sphere1.position.z);
    positions.setXYZ(1, pair.sphere2.position.x, pair.sphere2.position.y, pair.sphere2.position.z);
    positions.needsUpdate = true;

    this.calculateDistanceForPair(pair);

    this.updateMeasurementsDisplay();
  }
}
