const THREE = SupEngine.THREE;

export default class TileLayerGeometry extends THREE.BufferGeometry {
  constructor(width: number, height: number, widthSegments: number, heightSegments: number) {
    super();

    this.type = "TileLayerGeometry";

    const vertices = new Float32Array(widthSegments * heightSegments * 4 * 3);
    const normals  = new Float32Array(widthSegments * heightSegments * 4 * 3);
    const uvs      = new Float32Array(widthSegments * heightSegments * 4 * 2);
    uvs.fill(-1);

    let indices: Uint32Array|Uint16Array;
    if (vertices.length / 3 > 65535) indices = new Uint32Array(widthSegments * heightSegments * 6);
    else indices = new Uint16Array(widthSegments * heightSegments * 6);

    let verticesOffset = 0;
    let indicesOffset = 0;

    for (let iy = 0; iy < heightSegments; iy++) {
      let y = iy * height / heightSegments;

      for (let ix = 0; ix < widthSegments; ix++) {
        let x = ix * width / widthSegments;

        // Left bottom
        vertices[verticesOffset + 0]  = x;
        vertices[verticesOffset + 1]  = y;
        normals[verticesOffset + 2]  = 1;

        // Right bottom
        vertices[verticesOffset + 3]  = x + width / widthSegments;
        vertices[verticesOffset + 4]  = y;
        normals[verticesOffset + 5]  = 1;

        // Right top
        vertices[verticesOffset + 6]  = x + width / widthSegments;
        vertices[verticesOffset + 7]  = y + height / heightSegments;
        normals[verticesOffset + 8]  = 1;

        // Left Top
        vertices[verticesOffset + 9]  = x;
        vertices[verticesOffset + 10] = y + height / heightSegments;
        normals[verticesOffset + 11] = 1;

        const ref = (ix + iy * widthSegments) * 4;
        // Bottom right corner
        indices[indicesOffset + 0] = ref + 0;
        indices[indicesOffset + 1] = ref + 1;
        indices[indicesOffset + 2] = ref + 2;

        // Top left corner
        indices[indicesOffset + 3] = ref + 0;
        indices[indicesOffset + 4] = ref + 2;
        indices[indicesOffset + 5] = ref + 3;

        verticesOffset += 4 * 3;
        indicesOffset += 6;
      }
    }

    this.setIndex(new THREE.BufferAttribute(indices, 1));
    this.addAttribute("position", new THREE.BufferAttribute(vertices, 3));
    this.addAttribute("normal", new THREE.BufferAttribute(normals, 3));
    this.addAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  }
}
