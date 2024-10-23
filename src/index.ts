import { Viewer } from "./viewer";
import "./templates/styles.css";
import { Utils } from "./utils";

function getUrlParameter(name: string): string | null {
  const hash = window.location.hash.substring(1);
  const hashParams = new URLSearchParams(hash);
  const value = hashParams.get(name);
  return value;
}

const url = getUrlParameter("file");

if (url) {
  new Viewer(url);
} else {
  const msg = "No file parameter provided.";
  Utils.displayError(msg);
  throw new Error(msg);
}
