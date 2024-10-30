import * as THREE from "three";
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { Loader } from "./loader";
import { Measurements } from "./measurements";

export class DragControlHandler {
  private control: DragControls;
  private onMouseDown: (mouseEvent: MouseEvent) => void;

  constructor(
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    private loader: Loader,
    private onDrag: (object: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) => void,
    private onDragEnd: (object: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>, event: any) => void,
    measurements: Measurements
  ) {
    this.control = new DragControls([], camera, renderer.domElement);
    this.onMouseDown = (mouseEvent: MouseEvent) => measurements.updateMouse(mouseEvent);

    this.control.addEventListener('dragstart', (event: any) => this.handleDragStart(event, measurements));
    this.control.addEventListener('drag', (event: any) => this.onDrag(event.object));
    this.control.addEventListener('dragend', (event: any) => this.handleDragEnd(event, measurements));
  }

  public addObjectToControl(object: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) {
    this.control.getObjects().push(object);
  }

  public removeObjectFromControl(spheres: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[]) {
		spheres.forEach((sphere) => {
			const objects = this.control.getObjects();
      const index1 = objects.indexOf(sphere);
      if (index1 > -1) objects.splice(index1, 1);
		}); 
  }

  private handleDragStart(event: any, measurement: Measurements) {
    window.addEventListener('mousedown', this.onMouseDown);
    this.loader.lockRotationAndClick();
		
    measurement.lastValidPosition = event.object.position.clone();
  }

  private handleDragEnd(event: any, measurement: Measurements) {
    const onMouseUp = (mouseEvent: MouseEvent) => {
      measurement.updateMouse(mouseEvent);
      this.onDragEnd(event.object, event);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousedown", this.onMouseDown);
    };
    window.addEventListener('mouseup', onMouseUp);
    setTimeout(() => {
      this.loader.unlockRotationAndClick();
    }, 500);
  }
}
