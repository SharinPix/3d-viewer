import * as THREE from "three";
import { Utils } from "./utils";

interface SpherePair {
  sphere1: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  sphere2: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
}

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
  private color: string = "";
  private getRandomColor: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public placePoints(group: THREE.Group, camera: THREE.Camera, event: MouseEvent) {
    this.color = this.getRandomColor ? Utils.generateRandomColor() : this.color;
    this.getRandomColor = false;

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, camera);

    const intersects = this.raycaster.intersectObject(group, true);
    if (intersects.length > 0) {
      this.addPoint(intersects[0].point);
      if (this.points.length === 2) {
        this.drawLine();
        this.calculateDistance();
        this.resetPoints();
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
      new THREE.MeshBasicMaterial({ color: this.color })
    );
    sphere.position.copy(point);
    this.scene.add(sphere);
    return sphere;
  }

  private calculateDistance() {
    if (this.points.length === 2) {
      const distance = Utils.roundOff(this.points[0].distanceTo(this.points[1]));
      this.distances.push(distance);
      this.updateMeasurementDisplay();
    }
  }

  private drawLine() {
    const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: this.color }));
    this.colors.push(this.color);
    this.lines.push(line);
    this.scene.add(line);
  }

  private resetPoints() {
    this.points = [];
    this.getRandomColor = true;
  }

  private convertDistance(distanceInMeters: number, unit: string): number {
    switch (unit) {
      case 'm':
        return distanceInMeters;
      case 'inch':
        return distanceInMeters * 39.3701;
      case 'foot':
        return distanceInMeters * 3.28084;
      case 'cm':
      default:
        return distanceInMeters * 100;
    }
  }

  private updateMeasurementDisplay() {
    const measurementContainer = document.querySelector("#measurements");
    const measurementTable = document.querySelector("#table") as HTMLTableElement;
    if (this.lines.length === 0 && measurementTable) {
      measurementTable.style.display = "none";
      return;
    } else {
      measurementTable.style.display = "block";
    }
    const unitSelect = document.getElementById("unit-select") as HTMLSelectElement;
    if (!measurementContainer || !unitSelect) return;

    const selectedUnit = unitSelect.value;

    let rows = this.distances.map((distance, index) => {
      const convertedDistance = this.convertDistance(distance, selectedUnit).toFixed(2);
      return `
        <tr>
          <td style="text-align: center; vertical-align: middle;">
            <div style="width: 60px; height: 25px; background-color: ${this.colors[index]}; border: 1px solid black;"></div>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            ${convertedDistance} ${selectedUnit}
          </td>
          <td style="text-align: center; vertical-align: middle;">
            <button class="removeLine" data-index="${index}">Remove Line</button>
          </td>
        </tr>`;
    }).join("");

    measurementContainer.innerHTML = rows;
    this.addEventListeners();
  }

  private addEventListeners() {
    const clearButton = document.getElementById("clearButton");
    clearButton?.addEventListener("click", () => this.clearAll());

    document.getElementById("unit-select")?.addEventListener("change", () => this.updateMeasurementDisplay());

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

    this.resetMeasurements();
    this.updateMeasurementDisplay();
  }

  private resetMeasurements() {
    this.spheres = [];
    this.distances = [];
    this.lines = [];
    this.colors = [];
  }

  private removeLine(index: number) {
    this.scene.remove(this.lines[index]);
    this.spheres[index].sphere1 && this.scene.remove(this.spheres[index].sphere1);
    this.spheres[index].sphere2 && this.scene.remove(this.spheres[index].sphere2);

    this.spheres.splice(index, 1);
    this.lines.splice(index, 1);
    this.colors.splice(index, 1);
    this.distances.splice(index, 1);

    this.updateMeasurementDisplay();
  }
}
