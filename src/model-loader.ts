import * as THREE from "three";
import { USDZLoader } from "three-usdz-loader";
import { USDZInstance } from "three-usdz-loader/lib/USDZInstance";
import { Utils } from "./utils";

export class ModelLoader {
  constructor(
    url: string,
    group: THREE.Group,
    onLoad: (model: USDZInstance) => void
  ) {
    this.addLoading();

    this.createFileFromUrl(url)
      .then((file) => {
        this.loadUSDZ(file, group).then((model) => {
          onLoad(model);
          this.removeLoading();
        });
      })
      .catch((error) => {
        const msg = `${error}`;
        Utils.displayError(msg);
        this.removeLoading();
      });
  }

  async loadUSDZ(file: File, group: THREE.Group): Promise<USDZInstance> {
    const loader = new USDZLoader("wasm");
    return loader.loadFile(file, group);
  }

  async createFileFromUrl(url: string): Promise<File> {
    const response = await fetch(url);
    if (!response.ok) {
      const msg = `Failed to fetch model: ${response.statusText}`;
      throw new Error(msg);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!Utils.isValidUSDZ(arrayBuffer)) {
      const msg = "Invalid model type.";
      throw new Error(msg);
    }
    const blob = new Blob([arrayBuffer], { type: "model/usdz" });
    return new File([blob], "model.usdz", { type: "model/usdz" });
  }

  addLoading(): void {
    const loadingModel = document.getElementById("loading-model");
    if (loadingModel) loadingModel.style.display = "flex";
  }

  removeLoading(): void {
    const loadingModel = document.getElementById("loading-model");
    if (loadingModel) {
      loadingModel.style.display = "none";
      loadingModel.remove();
    }
  }
}
