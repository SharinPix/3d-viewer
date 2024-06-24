import { Loader } from "./loader";

export class Viewer {
  constructor(url: string) {
    const container = document.getElementById("viewer");
    if (!container) throw new Error("No viewer container found.");

    new Loader(container, url);
  }
}
