import * as THREE from "three";
import { USDZLoader } from "three-usdz-loader";
import { USDZInstance } from "three-usdz-loader/lib/USDZInstance";

export class ModelLoader {
  constructor(
    url: string,
    group: THREE.Group,
    onLoad: (model: USDZInstance) => void
  ) {
    this.createFileFromUrl(url)
      .then((file) => {
        if (file.type !== "model/usdz")
          throw new Error(`Unsupported model file type: ${file.type}`);
        this.loadUSDZ(file, group).then(onLoad);
      })
      .catch((error) => {
        throw new Error(`Failed to load model: ${error}`);
      });
  }

  async loadUSDZ(file: File, group: THREE.Group): Promise<USDZInstance> {
    const loader = new USDZLoader("/wasm");
    return loader.loadFile(file, group);
  }

  async createFileFromUrl(url: string): Promise<File> {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch model: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "model/usdz" });
    return new File([blob], "model.usdz", { type: "model/usdz" });
  }
}
