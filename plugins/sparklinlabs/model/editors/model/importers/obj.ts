export let mode = "text";

export function importModel(files: File[], callback: (err: Error, result: any) => any) {
  if (files.length > 1) {
    callback(new Error("OBJ importer can only accept one file at a time"), null);
    return;
  }

  let reader = new FileReader;
  reader.onload = (event) => { callback(null, parse((<FileReader>event.target).result)); }
  reader.readAsText(files[0]);
}

function parse(text: string) {
  let arrays: { position: number[]; uv: number[]; normal: number[] } = { position: [], uv: [], normal: [] };

  let positionsByIndex: number[][] = [];
  let uvsByIndex: number[][] = [];
  let normalsByIndex: number[][] = [];

  for (let line of text.split("\n")) {
    // Ignore empty lines and comments
    if (line.length === 0 || line[0] === "#") continue;

    let command = line.substring(0, line.indexOf(" "));
    let valueStrings = line.substring(line.indexOf(" ") + 1).split(" ");

    switch (command) {
      case "v": {
        if (valueStrings.length !== 3) throw new Error(`Invalid v command: found ${valueStrings.length} values, expected 3`);
        let values: number[] = [];
        for (let valueString of valueStrings) values.push(+valueString);
        positionsByIndex.push(values);
        break;
      }

      case "vt": {
        if (valueStrings.length !== 2) throw new Error(`Invalid vt command: found ${valueStrings.length} values, expected 2`);
        let values: number[] = [];
        for (let valueString of valueStrings) values.push(+valueString);
        uvsByIndex.push(values);
        break;
      }

      case "vn": {
        if (valueStrings.length !== 3) throw new Error(`Invalid vn command: found ${valueStrings.length} values, expected 3`);
        let values: number[] = [];
        for (let valueString of valueStrings) values.push(+valueString);
        normalsByIndex.push(values);
        break;
      }

      case "f":
        if (valueStrings.length !== 3 && valueStrings.length !== 4) {
          console.warn(`Ignoring unsupported face with ${valueStrings.length} vertices, only 3 or 4 are supported`);
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
        console.warn(`Ignoring unsupported OBJ command: ${command}`);
    }
  }

  let buffers: { position: ArrayBuffer; uv: ArrayBuffer; normal: ArrayBuffer } = {
    position: new Float32Array(arrays.position).buffer,
    uv: undefined, normal: undefined
  };

  if (arrays.uv.length > 0) buffers.uv = new Float32Array(arrays.uv).buffer;
  if (arrays.normal.length > 0) buffers.normal = new Float32Array(arrays.normal).buffer;

  return { attributes: buffers };
}
