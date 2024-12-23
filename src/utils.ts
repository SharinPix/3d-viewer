export class Utils {
  static displayError(message: string): void {
    const error = document.getElementById("error");
    error!.style.display = "block";
    error!.innerText = message;
  }

  static isValidUSDZ(arrayBuffer: ArrayBuffer): boolean {
    let signatureArray = new Array(4);
    for (let i = 0; i < 4; i++)
      signatureArray[i] = new Uint8Array(arrayBuffer)[i].toString(16);
    const signature = signatureArray.join("").toUpperCase();
    if (signature === "504B34") return true;
    return false;
  }

  static roundOff(x: number) {
    return Math.round(x * 100)/100;
  }

  static generateRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }
}
