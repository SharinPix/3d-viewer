import { Viewer } from "./viewer";
import "./templates/styles.css";
import { Utils } from "./utils";

function getUrlParameter(name: string): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get(name);
}

const url = getUrlParameter("file");

if (url) {
  new Viewer(url);
} else {
  const msg = "No file parameter provided.";
  Utils.displayError(msg);
  throw new Error(msg);
}
