import * as THREE from "three";
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import { Loader } from "./loader";
import { Measurements } from "./measurements";

export class DragControlHandler {
  private control: DragControls;
  private onMouseDown: (mouseEvent: MouseEvent) => void;
  private onMouseMove: (mouseEvent: MouseEvent) => void;
  private isMouseMoveListenerActive: boolean = false;

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
    this.onMouseMove = (mouseEvent: MouseEvent) => measurements.updateMouse(mouseEvent);

    this.control.addEventListener('dragstart', (event: THREE.Event) => this.handleDragStart(event, measurements));
    this.control.addEventListener('drag', (event: THREE.Event) => this.handleOnDrag(event));
    this.control.addEventListener('dragend', (event: THREE.Event) => this.handleDragEnd(event, measurements));
  }

  public addObjectToControl(object: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) {
    this.control.getObjects().push(object);
  }

  public removeObjectFromControl(spheres: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[]) {
    spheres.forEach((sphere) => {
      const objects = this.control.getObjects();
      const index = objects.indexOf(sphere);
      if (index > -1) objects.splice(index, 1);
    });
  }

  private handleDragStart(event: THREE.Event, measurement: Measurements) {
    window.addEventListener('mousedown', this.onMouseDown);
    this.loader.lockRotationAndClick();
		
    measurement.lastIntersectedPosition = event.object.position.clone();
  }

  private handleDragEnd(event: THREE.Event, measurement: Measurements) {
    const onMouseUp = (mouseEvent: MouseEvent) => {
      measurement.updateMouse(mouseEvent);
      this.onDragEnd(event.object, event);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousedown", this.onMouseDown);
      
      if (this.isMouseMoveListenerActive) {
        window.removeEventListener('mousemove', this.onMouseMove);
        this.isMouseMoveListenerActive = false;
      }
    };
    window.addEventListener('mouseup', onMouseUp);
    setTimeout(() => {
      this.loader.unlockRotationAndClick();
    }, 500);
  }

  private handleOnDrag(event: THREE.Event) {
    if (!this.isMouseMoveListenerActive) {
      window.addEventListener('mousemove', this.onMouseMove);
      this.isMouseMoveListenerActive = true;
    }
    this.onDrag(event.object);
  }
}
