import * as THREE from "three";
import { Utils } from "./utils";
import { Loader } from "./loader";
import { DragControlHandler } from "./drag-control-handler";

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
  private dragControlHandler: DragControlHandler;
  private group: THREE.Group;
  private generatedColor: string | undefined = undefined;
  public lastValidPosition: THREE.Vector3 | null = null;
  private camera: THREE.Camera;
  private currentSpheres: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  private listenersAdded: boolean = false;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    group: THREE.Group,
    loader: Loader,
  ) {
    this.scene = scene;
    this.group = group;
    this.camera = camera;

    this.dragControlHandler = new DragControlHandler(
      camera,
      renderer,
      loader,
      this.onSphereDrag.bind(this),
      this.onSphereDragEnd.bind(this),
      this
    );

    this.loadSpherePairs();
  }

  public placePoints(event: MouseEvent) {
    if (!this.generatedColor) {
      this.generatedColor = Utils.generateRandomColor();
    }

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.group, true);
    if (intersects.length > 0) {
      this.addPoint(intersects[0].point, this.generatedColor);
    }
  }

  public updateMouse(event: MouseEvent) {
    this.mouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
  }

  private addPoint(point: THREE.Vector3, color: string) {
    const sphere = this.createSphere(point, color);
    this.dragControlHandler.addObjectToControl(sphere);
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
        this.dragControlHandler.removeObjectFromControl([sphere]);
      })
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
    
    this.addEventListenersOnRemoveLineButton();
    if (!this.listenersAdded) {
      this.addEventListeners();
      this.listenersAdded = true;
    }
  }

  private addEventListeners() {
    document.getElementById("clearButton")?.addEventListener("click", () => this.clearAll());

    document.getElementById("units-dropdown")?.addEventListener("change", () => this.updateMeasurementsDisplay());
  }

  private addEventListenersOnRemoveLineButton() {
    document.querySelectorAll(".removeLine").forEach((button) => {
      const index = parseInt((button as HTMLElement).dataset.index!, 10);
      button.addEventListener("click", () => this.removeLine(index));
    });
  }

  private clearAll() {
    this.currentSpheres.forEach(sphere => {
      this.scene.remove(sphere);
      this.dragControlHandler.removeObjectFromControl([sphere]);
    })
    this.spherePairs.forEach(({ sphere1, sphere2, line }) => {
      [sphere1, sphere2, line].forEach(object => this.scene.remove(object));
      this.dragControlHandler.removeObjectFromControl([sphere1, sphere2]);
    });
    this.spherePairs = [];
    this.currentSpheres = [];
    this.saveSpherePairs();
    this.generatedColor = undefined;
    this.updateMeasurementsDisplay();
  }

  private removeLine(index: number) {
    const pair = this.spherePairs[index];
    if (pair) {
      this.scene.remove(pair.line);
      this.scene.remove(pair.sphere1);
      this.scene.remove(pair.sphere2);
      this.dragControlHandler.removeObjectFromControl([pair.sphere1, pair.sphere2]);
      this.spherePairs.splice(index, 1);
      this.updateMeasurementsDisplay();
      this.saveSpherePairs();
    }
  }

  private onSphereDrag(draggedSphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) {
    const pair = this.spherePairs.find(p => p.sphere1 === draggedSphere || p.sphere2 === draggedSphere);
    if (!pair) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.group, true);
    if (intersects.length > 0) {
      this.lastValidPosition = intersects[0].point;
      draggedSphere.position.copy(this.lastValidPosition);
    } else if (this.lastValidPosition) {
      draggedSphere.position.copy(this.lastValidPosition);
    }

    this.updatePosition(pair);
  }

  private onSphereDragEnd(draggedSphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>, event: any) {
    const pair = this.spherePairs.find(p => p.sphere1 === draggedSphere || p.sphere2 === draggedSphere);
    if (!pair) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.group, true);
    if (intersects.length > 0) {
      draggedSphere.position.copy(intersects[0].point);
    } else if (this.lastValidPosition) {
      draggedSphere.position.copy(this.lastValidPosition);
    }
    this.updatePosition(pair);
    this.saveSpherePairs();
    this.lastValidPosition = null;
  }

  private saveSpherePairs() {
    const dataToSave = this.spherePairs.map(pair => ({
      sphere1: pair.sphere1.position.toArray(),
      sphere2: pair.sphere2.position.toArray(),
      color: pair.color,
      distance: pair.distance
    }));

    const jsonString = JSON.stringify(dataToSave);
    const base64Data = btoa(encodeURIComponent(jsonString));

    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.slice(1));
    hashParams.set("data", base64Data);
    window.location.hash = `#${hashParams.toString()}`;
  }

  private loadSpherePairs() {
    const urlParams = new URLSearchParams(window.location.hash);
    const base64Data = urlParams.get("data");

    if (base64Data) {
      try {
        const jsonString = decodeURIComponent(atob(base64Data));
        const spherePairsData = JSON.parse(jsonString);
        spherePairsData.forEach((data: any) => {
          const sphere1 = this.createSphere(new THREE.Vector3(...data.sphere1), data.color);
          const sphere2 = this.createSphere(new THREE.Vector3(...data.sphere2), data.color);
          this.dragControlHandler.addObjectToControl(sphere1);
          this.dragControlHandler.addObjectToControl(sphere2);
          
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
      } catch (error) {
        console.error("Failed to parse spherePairs data from URL:", error);
      }
    }
  }


  private updatePosition(pair: SpherePair) {
    const positions = pair.line.geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, pair.sphere1.position.x, pair.sphere1.position.y, pair.sphere1.position.z);
    positions.setXYZ(1, pair.sphere2.position.x, pair.sphere2.position.y, pair.sphere2.position.z);
    positions.needsUpdate = true;

    this.calculateDistanceForPair(pair);
    this.updateMeasurementsDisplay();
  }
}
