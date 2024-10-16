import * as THREE from "three";
import { Utils } from "./utils";

interface SpherePair {
  sphere1: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  sphere2: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
}

const METERS_TO_INCHES = 39.3701;
const METERS_TO_FEET = 3.28084;
const METERS_TO_CM = 100;

export class Measurements {
  private raycaster = new THREE.Raycaster();
  private points: THREE.Vector3[] = [];
  private spheres: SpherePair[] = [];
  private lines: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = [];
  private mouse = new THREE.Vector2();
  private distances: number[] = [];
  private spheresForLine: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  private scene: THREE.Scene;
  private colors: string[] = [];
  private generatedColor: string | undefined = undefined;
  private measurementsTable: HTMLTableElement;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.measurementsTable = document.querySelector("#measurements-table-container") as HTMLTableElement;
    if (this.measurementsTable) {
      this.measurementsTable.style.display = "none";
    }
  }

  public placePoints(group: THREE.Group, camera: THREE.Camera, event: MouseEvent) {
    this.generatedColor = this.generatedColor ? this.generatedColor : Utils.generateRandomColor();

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, camera);

    const intersects = this.raycaster.intersectObject(group, true);
    if (intersects.length > 0) {
      this.addPoint(intersects[0].point);
      if (this.points.length === 2) {
        this.drawLine();
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

  private addPoint(point: THREE.Vector3) {
    this.points.push(point);
    const sphere = this.createSphere(point);
    this.spheresForLine.push(sphere);

    if (this.spheresForLine.length === 2) {
      this.spheres.push({ sphere1: this.spheresForLine[0], sphere2: this.spheresForLine[1] });
      this.spheresForLine = [];
    }
  }

  private createSphere(point: THREE.Vector3): THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 32, 32),
      new THREE.MeshBasicMaterial({ color: this.generatedColor })
    );
    sphere.position.copy(point);
    this.scene.add(sphere);
    return sphere;
  }

  private calculateDistance() {
    if (this.points.length === 2) {
      const distance = Utils.roundOff(this.points[0].distanceTo(this.points[1]));
      this.distances.push(distance);
      this.updateMeasurementsDisplay();
    }
  }

  private drawLine() {
    const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: this.generatedColor }));
    if (this.generatedColor) {
      this.colors.push(this.generatedColor);
    }
    this.lines.push(line);
    this.scene.add(line);
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
    const measurementsContainer = document.querySelector("#measurements");
    if (this.lines.length === 0 && this.measurementsTable) {
      this.measurementsTable.style.display = "none";
      return;
    } else {
      this.measurementsTable.style.display = "block";
    }
    const unitsDropdown = document.getElementById("units-dropdown") as HTMLSelectElement;
    if (!measurementsContainer || !unitsDropdown) return;

    const selectedUnit = unitsDropdown.value;

    let rows = this.distances.map((distance, index) => {
      const convertedDistance = this.convertDistance(distance, selectedUnit).toFixed(2);
      return `
        <tr>
          <td style="text-align: center; vertical-align: middle;">
            <div style="width: 60px; height: 25px; background-color: ${this.colors[index]}; border: 1px solid black; margin: 0 auto;"></div>
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

    document.getElementById("units-dropdown")?.addEventListener("change", () => this.updateMeasurementsDisplay());

    document.querySelectorAll(".removeLine").forEach((button) => {
      const index = parseInt((button as HTMLElement).dataset.index!, 10);
      button.addEventListener("click", () => this.removeLine(index));
    });
  }

  private clearAll() {
    this.spheres.forEach(({ sphere1, sphere2 }) => {
      this.scene.remove(sphere1);
      this.scene.remove(sphere2);
    });
    this.lines.forEach(line => this.scene.remove(line));

    this.spheres = [];
    this.distances = [];
    this.lines = [];
    this.colors = [];
    this.updateMeasurementsDisplay();
  }

  private removeLine(index: number) {
    this.scene.remove(this.lines[index]);
    this.spheres[index].sphere1 && this.scene.remove(this.spheres[index].sphere1);
    this.spheres[index].sphere2 && this.scene.remove(this.spheres[index].sphere2);

    this.spheres.splice(index, 1);
    this.lines.splice(index, 1);
    this.colors.splice(index, 1);
    this.distances.splice(index, 1);

    this.updateMeasurementsDisplay();
  }
}
