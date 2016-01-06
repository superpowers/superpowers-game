export default function(file: File, type: string, callback: (err: Error, result: any) => any) {
  let reader = new FileReader;

  reader.onload = (event) => {
    let result: any;

    switch (type) {
      case "json":
        try { result = JSON.parse((<FileReader>event.target).result); }
        catch (err) { callback(err, null); return; }
        break;

      default:
        result = (<FileReader>event.target).result;
    }

    callback(null, result);
  };

  switch (type) {
    case "text":
    case "json":
      reader.readAsText(file);
      break;

    case "arraybuffer":
      reader.readAsArrayBuffer(file);
      break;

    default:
      throw new Error(`Unsupported readFile type: ${type}`);
  }
}
