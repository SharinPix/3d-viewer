import { Viewer } from "./viewer";
import "./templates/styles.css";
import { Utils } from "./utils";

function getUrlParameter(name: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

const url = getUrlParameter("file");

if (url) {
  new Viewer(url);
} else {
  const msg = "No file parameter provided.";
  Utils.displayError(msg);
  throw new Error(msg);
}
