import * as obj from "./obj";
import * as gltf from "./gltf";

export interface ImportLogEntry {
  file: string;
  line: number;
  type: string;
  message: string;
}

export function createLogError(message: string, file?: string, line?: number) { return { file, line, type: "error", message }; }
export function createLogWarning(message: string, file?: string, line?: number) { return { file, line, type: "warning", message }; }
export function createLogInfo(message: string, file?: string, line?: number) { return { file, line, type: "info", message }; }

export interface ImportCallback {
  (log: ImportLogEntry[], result?: any): void;
}

interface Importer {
  importModel: (files: File[], callback: ImportCallback) => any;
}

let modelImporters: { [extension: string]: Importer } = { obj, gltf };

export default function(files: File[], callback: ImportCallback) {
  let modelImporter: Importer = null;

  for (let file of files) {
    let filename = file.name;
    let extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    modelImporter = modelImporters[extension];
    if (modelImporter != null) break;
  }

  if (modelImporter == null) { callback([ createLogError("No compatible importer found") ]); return; }

  modelImporter.importModel(files, callback);
  return
}
