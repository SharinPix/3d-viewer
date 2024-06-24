import * as THREE from "three";
import { ModelLoader } from "./model-loader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export class Loader {
  private animationId: number | undefined;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private scene: THREE.Scene;
  private group: THREE.Group;

  constructor(container: HTMLElement, url: string) {
    this.scene = new THREE.Scene();
    this.setSceneAttributes();
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.camera = new THREE.PerspectiveCamera(
      27,
      window.innerWidth / window.innerHeight,
      1,
      3500
    );
    this.setCameraAttributes();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.setRendererAttributes();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.update();

    this.createAmbientLight();
    this.createDirectionalLight();

    this.loadAndSetEnvironmentMap().then(() => {
      const animate = () => {
        this.animationId = requestAnimationFrame(animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };

      new ModelLoader(url, this.group, (model) => {
        animate();
        this.fitCamera();
      });
    });

    container.appendChild(this.renderer.domElement);

    window.addEventListener("resize", this.onWindowResize, false);
    window.addEventListener("beforeunload", this.cleanup);
    window.addEventListener("unload", this.cleanup);
  }

  setSceneAttributes() {
    this.scene.background = new THREE.Color(0xffffff);
  }

  setCameraAttributes() {
    this.camera.position.z = 7;
    this.camera.position.y = 7;
    this.camera.position.x = 0;
  }

  // Reference: https://github.com/ponahoum/usdz-web-viewer/blob/a84e63e4c5c407192b836c21765d5cbdc85d03b0/src/components/Home.ts#L174
  fitCamera(fitOffset = 1.5): void {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    const box = new THREE.Box3();

    box.makeEmpty();
    box.expandByObject(this.group);

    box.getSize(size);
    box.getCenter(center);

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance =
      maxSize / (2 * Math.atan((Math.PI, this.camera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

    const direction = this.controls.target
      .clone()
      .sub(this.camera.position)
      .normalize()
      .multiplyScalar(distance);

    this.controls.maxDistance = distance * 10;
    this.controls.target.copy(center);

    this.camera.near = distance / 100;
    this.camera.far = distance * 100;
    this.camera.updateProjectionMatrix();

    this.camera.position.copy(this.controls.target).sub(direction);

    this.controls.update();
  }

  setRendererAttributes() {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.CineonToneMapping;
    this.renderer.toneMappingExposure = 2;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
  }

  createAmbientLight() {
    const ambientLight = new THREE.AmbientLight(0x111111);
    ambientLight.intensity = 1;
    this.scene.add(ambientLight);
  }

  createDirectionalLight() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5).normalize();
    this.scene.add(directionalLight);
  }

  async loadAndSetEnvironmentMap() {
    return new Promise((resolve) => {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      pmremGenerator.compileCubemapShader();
      new RGBELoader().load(
        // Reference: https://github.com/ponahoum/usdz-web-viewer/blob/a84e63e4c5c407192b836c21765d5cbdc85d03b0/src/components/Home.ts#L76
        "studio_country_hall_1k.hdr",
        (texture: THREE.DataTexture) => {
          const hdrRenderTarget = pmremGenerator.fromEquirectangular(texture);
          texture.mapping = THREE.EquirectangularReflectionMapping;
          texture.needsUpdate = true;
          window.envMap = hdrRenderTarget.texture;
          resolve(true);
        }
      );
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
