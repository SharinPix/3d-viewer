import { Viewer } from "./viewer";
import "./templates/styles.css";

function getUrlParameter(name: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

const url = getUrlParameter("file");

if (url) {
  new Viewer(url);
} else {
  throw new Error("No file parameter provided.");
}
