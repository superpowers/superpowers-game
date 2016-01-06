import { ImportCallback, ImportLogEntry, createLogError, createLogWarning, createLogInfo } from "./index";

export let mode = "text";

export function importModel(files: File[], callback: ImportCallback) {
  if (files.length > 1) {
    callback([ createLogError("The OBJ importer only accepts one file at a time") ]);
    return;
  }

  let reader = new FileReader;
  reader.onload = (event) => { parse(files[0].name, (<FileReader>event.target).result, callback); };
  reader.readAsText(files[0]);
}

function parse(filename: string, text: string, callback: ImportCallback) {
  let log: ImportLogEntry[] = [];

  let arrays: { position: number[]; uv: number[]; normal: number[] } = { position: [], uv: [], normal: [] };

  let positionsByIndex: number[][] = [];
  let uvsByIndex: number[][] = [];
  let normalsByIndex: number[][] = [];

  let lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    let line = lines[lineIndex].trim();

    // Ignore empty lines and comments
    if (line.length === 0 || line[0] === "#") continue;

    let [ command, ...valueStrings ] = line.split(/\s+/);

    switch (command) {
      case "v": {
        if (valueStrings.length !== 3) { callback([ createLogError(`Invalid v command: found ${valueStrings.length} values, expected 3`, filename, lineIndex) ]); return; }
        let values: number[] = [];
        for (let valueString of valueStrings) values.push(+valueString);
        positionsByIndex.push(values);
        break;
      }

      case "vt": {
        if (valueStrings.length < 2) { callback([ createLogError(`Invalid vt command: found ${valueStrings.length} values, expected 2`, filename, lineIndex) ]); return; }
        if (valueStrings.length > 2) log.push(createLogWarning(`Ignoring extra texture coordinates (${valueStrings.length} found, using 2), only U and V are supported.`, filename, lineIndex));
        let values: number[] = [];
        for (let i = 0; i < valueStrings.length; i++) values.push(+valueStrings[i]);
        uvsByIndex.push(values);
        break;
      }

      case "vn": {
        if (valueStrings.length !== 3) { callback([ createLogError(`Invalid vn command: found ${valueStrings.length} values, expected 3`, filename, lineIndex) ]); return; }
        let values: number[] = [];
        for (let valueString of valueStrings) values.push(+valueString);
        normalsByIndex.push(values);
        break;
      }

      case "f":
        if (valueStrings.length !== 3 && valueStrings.length !== 4) {
          log.push(createLogWarning(`Ignoring unsupported face with ${valueStrings.length} vertices, only triangles and quads are supported.`, filename, lineIndex));
          break;
        }

        let positions: number[][] = [];
        let uvs: number[][] = [];
        let normals: number[][] = [];

        for (let valueString of valueStrings) {
          let [ posIndexString, uvIndexString, normalIndexString ] = valueString.split("/");

          let posIndex = <any>posIndexString | 0;
          let pos =
            (posIndex >= 0) ? positionsByIndex[posIndex - 1]
            : positionsByIndex[positionsByIndex.length + posIndex];
          positions.push(pos);

          if (uvIndexString != null && uvIndexString.length > 0) {
            let uvIndex = <any>uvIndexString | 0;
            let uv =
              (uvIndex >= 0) ? uvsByIndex[uvIndex - 1]
              : uvsByIndex[uvsByIndex.length + uvIndex];
            uvs.push(uv);
          }

          if (normalIndexString != null) {
            let normalIndex = <any>normalIndexString | 0;
            let normal =
              (normalIndex >= 0) ? normalsByIndex[normalIndex - 1]
              : normalsByIndex[normalsByIndex.length + normalIndex];
            normals.push(normal);
          }
        }

        if (valueStrings.length === 3) {
          // Triangle
          arrays.position.push(positions[0][0], positions[0][1], positions[0][2]);
          arrays.position.push(positions[1][0], positions[1][1], positions[1][2]);
          arrays.position.push(positions[2][0], positions[2][1], positions[2][2]);

          if(uvs.length > 0) {
            arrays.uv.push(uvs[0][0], uvs[0][1]);
            arrays.uv.push(uvs[1][0], uvs[1][1]);
            arrays.uv.push(uvs[2][0], uvs[2][1]);
          }

          if (normals.length > 0) {
            arrays.normal.push(normals[0][0], normals[0][1], normals[0][2]);
            arrays.normal.push(normals[1][0], normals[1][1], normals[1][2]);
            arrays.normal.push(normals[2][0], normals[2][1], normals[2][2]);
          }
        } else {
          // Quad
          arrays.position.push(positions[0][0], positions[0][1], positions[0][2]);
          arrays.position.push(positions[1][0], positions[1][1], positions[1][2]);
          arrays.position.push(positions[2][0], positions[2][1], positions[2][2]);

          arrays.position.push(positions[0][0], positions[0][1], positions[0][2]);
          arrays.position.push(positions[2][0], positions[2][1], positions[2][2]);
          arrays.position.push(positions[3][0], positions[3][1], positions[3][2]);

          if (uvs.length > 0) {
            arrays.uv.push(uvs[0][0], uvs[0][1]);
            arrays.uv.push(uvs[1][0], uvs[1][1]);
            arrays.uv.push(uvs[2][0], uvs[2][1]);

            arrays.uv.push(uvs[0][0], uvs[0][1]);
            arrays.uv.push(uvs[2][0], uvs[2][1]);
            arrays.uv.push(uvs[3][0], uvs[3][1]);
          }

          if (normals.length > 0) {
            arrays.normal.push(normals[0][0], normals[0][1], normals[0][2]);
            arrays.normal.push(normals[1][0], normals[1][1], normals[1][2]);
            arrays.normal.push(normals[2][0], normals[2][1], normals[2][2]);

            arrays.normal.push(normals[0][0], normals[0][1], normals[0][2]);
            arrays.normal.push(normals[2][0], normals[2][1], normals[2][2]);
            arrays.normal.push(normals[3][0], normals[3][1], normals[3][2]);
          }
        }
        break;

      default:
        log.push(createLogWarning(`Ignoring unsupported OBJ command: ${command}`, filename, lineIndex));
    }
  }

  let buffers: { position: ArrayBuffer; uv: ArrayBuffer; normal: ArrayBuffer } = {
    position: new Float32Array(arrays.position).buffer,
    uv: undefined, normal: undefined
  };

  let importedAttributes: string[] = [];
  if (arrays.uv.length > 0) {
    importedAttributes.push("texture coordinates");
    buffers.uv = new Float32Array(arrays.uv).buffer;
  }

  if (arrays.normal.length > 0) {
    importedAttributes.push("normals");
    buffers.normal = new Float32Array(arrays.normal).buffer;
  }

  let importInfo = (importedAttributes.length > 0) ? ` with ${importedAttributes.join(", ")}` : "";
  log.push(createLogInfo(`Imported ${arrays.position.length / 3} vertices${importInfo}.`, filename));

  callback(log, { attributes: buffers });
}
