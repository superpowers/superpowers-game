import * as obj from "./obj";
import * as gltf from "./gltf";

interface ImportCallback {
  (err: Error, result: any): void;
}

interface Importer {
  importModel: (files: File[], callback: ImportCallback) => any;
}

let modelImporters: { [extension: string]: Importer } = { obj, gltf };

export default function(files: File[], callback: ImportCallback) {
  let modelImporter: Importer = null;

  for (let file of files) {
    let filename = file.name;
    let extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    modelImporter = modelImporters[extension]
    if (modelImporter != null) break;
  }

  if (modelImporter == null) { callback(new Error("No compatible importer found"), null); return; }

  modelImporter.importModel(files, callback);
  return
}
