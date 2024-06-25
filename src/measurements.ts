import * as THREE from "three";

export class Measurements {
  private raycaster: THREE.Raycaster;
  private points: THREE.Vector3[];
  private spheres: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  private line?: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private mouse: THREE.Vector2;

  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.points = [];
    this.mouse = new THREE.Vector2();
  }

  placePoints(scene: THREE.Scene, group: THREE.Group, camera: THREE.Camera, event: MouseEvent) {
    if (this.points.length === 2) this.reset(scene);

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObject(group, true);

    if (intersects.length > 0) {
      this.addPoint(scene, intersects[0].point);
      if (this.points.length === 2) {
        this.calculateDistance();
        this.drawLine(scene);
      }
    }
  }

  private reset(scene: THREE.Scene) {
    this.spheres.forEach(sphere => scene.remove(sphere));
    if (this.line) scene.remove(this.line);
    this.spheres = [];
    this.points = [];
    this.updateMeasurementDisplay("");
  }

  private updateMouse(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private addPoint(scene: THREE.Scene, point: THREE.Vector3) {
    this.points.push(point);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    sphere.position.copy(point);
    scene.add(sphere);
    this.spheres.push(sphere);
  }

  private calculateDistance() {
    if (this.points.length === 2) {
      const distance = this.points[0].distanceTo(this.points[1]);
      this.updateMeasurementDisplay(`Distance between the two points = ${distance}`);
    }
  }

  private drawLine(scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
    this.line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xff0000 }));
    scene.add(this.line);
  }

  private updateMeasurementDisplay(text: string) {
    const measurementContainer = document.getElementById("measurementDiv");
    if (measurementContainer) measurementContainer.innerText = text;
  }
}
