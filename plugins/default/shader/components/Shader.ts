const THREE = SupEngine.THREE;
import { ShaderAssetPub } from "../data/ShaderAsset";

export function createShaderMaterial(asset: ShaderAssetPub, textures: { [name: string]: THREE.Texture }, geometry: THREE.BufferGeometry, options = { useDraft: false }) {
  if (asset == null) return null;

  let uniforms: { [name: string]: { type: string; value: any}} = {};
  if (asset.useLightUniforms) {
    uniforms = THREE.UniformsUtils.merge([uniforms, THREE.UniformsUtils.clone(THREE.UniformsLib.lights)]);
  }
  uniforms["time"] = { type: "f", value: 0.0 };

  for (const uniform of asset.uniforms) {
    let value: any;
    switch (uniform.type) {
      case "f":
        value = uniform.value;
        break;
      case "c":
        value = new THREE.Color(uniform.value[0], uniform.value[1], uniform.value[2]);
        break;
      case "v2":
        value = new THREE.Vector2(uniform.value[0], uniform.value[1]);
        break;
      case "v3":
        value = new THREE.Vector3(uniform.value[0], uniform.value[1], uniform.value[2]);
        break;
      case "v4":
        value = new THREE.Vector4(uniform.value[0], uniform.value[1], uniform.value[2], uniform.value[3]);
        break;
      case "t":
        value = textures[uniform.value];
        if (value == null) {
          console.warn(`Texture "${uniform.name}" is null`);
          continue;
        }
        break;
    }

    uniforms[uniform.name] = { type: uniform.type, value };
  }

  for (const attribute of asset.attributes) {
    const values = <any[]>[];
    let itemSize: number;
    switch (attribute.type) {
      case "f":
        itemSize = 1;
        break;
      case "c":
        itemSize = 3;
        break;
      case "v2":
        itemSize = 2;
        break;
      case "v3":
        itemSize = 3;
        break;
      case "v4":
        itemSize = 4;
        break;
    }

    const triangleCount = (<THREE.BufferAttribute>geometry.getAttribute("position")).length / 3;
    for (let v = 0; v < triangleCount; v++) {
      for (let i = 0; i < itemSize; i++) values.push(Math.random());
    }
    geometry.addAttribute(attribute.name, new THREE.BufferAttribute(new Float32Array(values), itemSize));
  }

  const vertexShader = options.useDraft ? asset.vertexShader.draft : asset.vertexShader.text;
  const fragmentShader = options.useDraft ? asset.fragmentShader.draft : asset.fragmentShader.text;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader, fragmentShader,
    transparent: true,
    lights: asset.useLightUniforms
  });
}
