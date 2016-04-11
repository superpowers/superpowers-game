let THREE = SupEngine.THREE;

export default class TextRendererGeometry extends THREE.BufferGeometry {
  width: number;
  height: number;

  constructor(width: number, height: number, widthSegments: number, heightSegments: number) {
    super();

    this.type = "TextRendererGeometry";
    this.width = width;
    this.height = height;

    let vertices = new Float32Array(widthSegments * heightSegments * 4 * 3);
    let normals  = new Float32Array(widthSegments * heightSegments * 4 * 3);
    let uvs      = new Float32Array(widthSegments * heightSegments * 4 * 2);
    let indices: Uint32Array|Uint16Array;
    if (vertices.length / 3 > 65535) indices = new Uint32Array(widthSegments * heightSegments * 6);
    else indices = new Uint16Array(widthSegments * heightSegments * 6);

    let offset = 0;
    let offset2 = 0;
    let offset3 = 0;

    for (let iy = 0; iy < heightSegments; iy++) {
      let y = iy * height / heightSegments;

      for (let ix = 0; ix < widthSegments; ix++) {
        let x = ix * width / widthSegments;

        // Left bottom
        vertices[offset + 0]  = x;
        vertices[offset + 1]  = y;
        normals[offset + 2]  = 1;
        uvs[offset2 + 0] = ix / widthSegments;
        uvs[offset2 + 1] = iy / heightSegments;

        // Right bottom
        vertices[offset + 3]  = x + width / widthSegments;
        vertices[offset + 4]  = y;
        normals[offset + 5]  = 1;
        uvs[offset2 + 2] = (ix + 1) / widthSegments;
        uvs[offset2 + 3] = iy / heightSegments;

        // Right top
        vertices[offset + 6]  = x + width / widthSegments;
        vertices[offset + 7]  = y + height / heightSegments;
        normals[offset + 8]  = 1;
        uvs[offset2 + 4] = (ix + 1) / widthSegments;
        uvs[offset2 + 5] = (iy + 1) / heightSegments;

        // Left Top
        vertices[offset + 9]  = x;
        vertices[offset + 10] = y + height / heightSegments;
        normals[offset + 11] = 1;
        uvs[offset2 + 6] = ix / widthSegments;
        uvs[offset2 + 7] = (iy + 1) / heightSegments;

        let ref = (ix + iy * widthSegments) * 4;
        // Bottom right corner
        indices[offset3 + 0] = ref + 0;
        indices[offset3 + 1] = ref + 1;
        indices[offset3 + 2] = ref + 2;

        // Top left corner
        indices[offset3 + 3] = ref + 0;
        indices[offset3 + 4] = ref + 3;
        indices[offset3 + 5] = ref + 2;

        offset  += 4 * 3;
        offset2 += 4 * 2;
        offset3 += 6;
      }
    }
    this.setIndex(new THREE.BufferAttribute(indices, 1));
    this.addAttribute("position", new THREE.BufferAttribute(vertices, 3));
    this.addAttribute("normal", new THREE.BufferAttribute(normals, 3));
    this.addAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  }
}
