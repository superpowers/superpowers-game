import readFile from "./readFile";
import * as async from "async";
import { ImportCallback, ImportLogEntry, createLogError, createLogWarning, createLogInfo } from "./index";

let THREE = SupEngine.THREE;

let gltfConst = {
  UNSIGNED_SHORT: 5123,
  FLOAT: 5126
}

interface GLTFFile {
  accessors: { [name: string]: GLTFAccessor; };
  animations: { [name: string]: any; };
  asset: GLTFAsset;
  bufferViews: { [name: string]: GLTFBufferView; };
  buffers: { [path: string]: any; };
  materials: { [name: string]: any; };
  meshes: { [name: string]: any; };
  nodes: { [name: string]: GLTFNode; };
  programs: { [name: string]: any; };
  scene: string;
  scenes: { [name: string]: any; };
  shaders: { [path: string]: any; };
  skins: { [name: string]: any; };
  techniques: { [name: string]: any; };
}

interface GLTFAccessor {
  bufferView: string;
  byteOffset: number;
  byteStride: number;
  componentType: number;
  count: number;
  type: string;
}

interface GLTFAsset {
  generator: string;
  premultipliedAlpha: boolean;
  profile: string;
  version: number;
}

interface GLTFBufferView {
  buffer: string;
  byteLength: number;
  byteOffset: number;
  target: number;
}

interface GLTFNode {
  children: string[];
  name: string;
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];

  meshes?: string[];
  instanceSkin?: {
    meshes: string[];
    skeletons: string[];
    skin: string;
  };
  jointName?: string;
}

function convertAxisAngleToQuaternionArray(rotations: Uint8Array, count: number) {
  let q = new THREE.Quaternion;
  let axis = new THREE.Vector3;

  for (let i = 0; i < count; i++) {
    axis.set(rotations[i * 4], rotations[i * 4 + 1], rotations[i * 4 + 2]).normalize();
    let angle = rotations[i * 4 + 3];
    q.setFromAxisAngle(axis, angle);

    rotations[i * 4] = q.x;
    rotations[i * 4 + 1] = q.y;
    rotations[i * 4 + 2] = q.z;
    rotations[i * 4 + 3] = q.w;
  }
}

function convertAxisAngleToQuaternion(rotation: number[]) {
  let q = new THREE.Quaternion;
  let axis = new THREE.Vector3;

  axis.set(rotation[0], rotation[1], rotation[2]).normalize();
  q.setFromAxisAngle(axis, rotation[3]);
  return q;
}

function getNodeMatrix(node: GLTFNode): THREE.Matrix4 {
  let matrix = new THREE.Matrix4;
  if (node.matrix != null) return matrix.fromArray(node.matrix);

  return matrix.compose(
    new THREE.Vector3(node.translation[0], node.translation[1], node.translation[2]),
    convertAxisAngleToQuaternion(node.rotation),
    new THREE.Vector3(node.scale[0], node.scale[1], node.scale[2])
  );
}

export function importModel(files: File[], callback: ImportCallback) {
  let gltfFile: File = null;
  let bufferFiles: { [name: string]: File } = {};
  let imageFiles: { [name: string]: File } = {};
  let buffers: { [name: string]: ArrayBuffer } = {};

  for (let file of files) {
    let filename = file.name;
    let extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();

    switch(extension) {
      case "gltf":
        if (gltfFile != null) { callback([ createLogError(`Cannot import multiple GLTF files at once, already found ${gltfFile.name}`, filename) ]); return; }
        gltfFile = file;
        break;

      case "bin":
        bufferFiles[filename] = file;
        break;

      case "png":
      case "jpg":
        imageFiles[filename] = file;
        break;

      default:
        callback([ createLogError(`Unsupported file type`, filename) ]);
        return;
    }
  }

  let onGLTFRead = (err: Error, gltf: GLTFFile) => {
    if (err != null) { callback([ createLogError("Could not parse as JSON", gltfFile.name) ]); return; }
    if(Object.keys(gltf.meshes).length > 1) { callback([ createLogError("Only a single mesh is supported") ], gltfFile.name); return; }


    let rootNode = gltf.nodes[ gltf.scenes[gltf.scene].nodes[0] ];

    // Check if the model has its up-axis pointing in the wrong direction
    let upAxisMatrix: THREE.Matrix4 = null;

    if(rootNode.name === "Y_UP_Transform") {
      upAxisMatrix = new THREE.Matrix4().fromArray(rootNode.matrix);
      if (gltf.asset.generator === "collada2gltf@abb81d52ce290268fdb67b96f5bc5c620dee5bb5") {
        // The Y_UP_Transform matrix needed to be reversed
        // prior to this pull request: https://github.com/KhronosGroup/glTF/pull/332
        upAxisMatrix.getInverse(upAxisMatrix);
      }
    }

    let meshName: string = null;
    // let rootBoneNames: string[] = null;
    let skin: any = null;
    
    let nodesByJointName: { [jointName: string]: GLTFNode } = {};
    
    let walkNode = (rootNode: GLTFNode) => {
      if (rootNode.jointName != null) nodesByJointName[rootNode.jointName] = rootNode;
            
      if (meshName == null) {
        if(rootNode.instanceSkin != null && rootNode.instanceSkin.meshes != null && rootNode.instanceSkin.meshes.length > 0) {
          meshName = rootNode.instanceSkin.meshes[0];
          // rootBoneNames = rootNode.instanceSkin.skeletons;
          skin = gltf.skins[rootNode.instanceSkin.skin];
        }
        
        else if (rootNode.meshes != null && rootNode.meshes.length > 0) {
          meshName = rootNode.meshes[0];
        }
      }
      
      for (let childName of rootNode.children) {
        walkNode(gltf.nodes[childName]);
      }
    }
    
    for (let rootNodeName of gltf.scenes[gltf.scene].nodes) walkNode(gltf.nodes[rootNodeName]);

    if (meshName == null) { callback([ createLogError("No mesh found", gltfFile.name) ]); return; }

    let meshInfo = gltf.meshes[meshName];
    if (meshInfo.primitives.length !== 1) { callback([ createLogError("Only a single primitive is supported", gltfFile.name) ]); return; }
    if (meshInfo.primitives[0].primitive !== 4) { callback([ createLogError("Only triangles are supported", gltfFile.name) ]); return; }

    async.each(Object.keys(gltf.buffers), (name, cb) => {
      let bufferInfo = gltf.buffers[name];

      // Remove path info from the URI
      let filename = decodeURI(bufferInfo.uri);
      if (filename.indexOf("/") !== -1) filename = filename.substring(filename.lastIndexOf("/") + 1);
      else if (filename.indexOf("\\") !== -1) filename = filename.substring(filename.lastIndexOf("\\") + 1);

      let bufferFile = bufferFiles[filename];
      if (bufferFile == null) { cb(new Error(`Missing buffer file: ${filename} (${bufferInfo.uri})`)); return; }

      readFile(bufferFile, "arraybuffer", (err: Error, buffer: ArrayBuffer) => {
        if (err != null) { cb(new Error(`Could not read buffer file: ${filename} (${bufferInfo.uri})`)); return; }
        buffers[name] = buffer;
        cb(null);
      });
    }, (err) => {
      if (err != null) { callback([ createLogError(err.message) ]); return; }

      let primitive = meshInfo.primitives[0];
      let attributes: { [name: string]: ArrayBuffer } = {};

      // Indices
      let indexAccessor: GLTFAccessor = gltf.accessors[primitive.indices];
      if (indexAccessor.componentType !== gltfConst.UNSIGNED_SHORT) {
        callback([ createLogError(`Unsupported component type for index accessor: ${indexAccessor.componentType}`) ]);
        return;
      }

      {
        let indexBufferView: GLTFBufferView = gltf.bufferViews[indexAccessor.bufferView];
        let start = indexBufferView.byteOffset + indexAccessor.byteOffset;
        attributes["index"] = buffers[indexBufferView.buffer].slice(start, start + indexAccessor.count * 2);
      }

      // Position
      let positionAccessor: GLTFAccessor = gltf.accessors[primitive.attributes.POSITION];
      if (positionAccessor.componentType !== gltfConst.FLOAT) {
        callback([ createLogError(`Unsupported component type for position accessor: ${positionAccessor.componentType}`) ]);
        return
      }

      {
        let positionBufferView: GLTFBufferView = gltf.bufferViews[positionAccessor.bufferView];
        let start = positionBufferView.byteOffset + positionAccessor.byteOffset;
        
        if (skin != null) {
          let bindShapeMatrix = new THREE.Matrix4().fromArray(skin.bindShapeMatrix);
          let positionArray = new Float32Array(buffers[positionBufferView.buffer], start, positionAccessor.count * 3);
          for (let i = 0; i <positionAccessor.count; i++) {
            let pos = new THREE.Vector3(positionArray[i * 3 + 0], positionArray[i * 3 + 1], positionArray[i * 3 + 2]);
            pos.applyMatrix4(bindShapeMatrix);
            positionArray[i * 3 + 0] = pos.x;
            positionArray[i * 3 + 1] = pos.y;
            positionArray[i * 3 + 2] = pos.z;
          }
        }

        attributes["position"] = buffers[positionBufferView.buffer].slice(start, start + positionAccessor.count * positionAccessor.byteStride);
      }

      // Normal
      let normalAccessor: GLTFAccessor = gltf.accessors[primitive.attributes.NORMAL];
      if (normalAccessor != null) {
        if(normalAccessor.componentType !== gltfConst.FLOAT) {
          callback([ createLogError(`Unsupported component type for normal accessor: ${normalAccessor.componentType}`) ]);
          return;
        }

        let normalBufferView: GLTFBufferView = gltf.bufferViews[normalAccessor.bufferView];
        let start = normalBufferView.byteOffset + normalAccessor.byteOffset;
        attributes["normal"] = buffers[normalBufferView.buffer].slice(start, start + normalAccessor.count * normalAccessor.byteStride);
      }

      // UV
      let uvAccessor: GLTFAccessor = gltf.accessors[primitive.attributes.TEXCOORD_0];
      if (uvAccessor != null) {
        if (uvAccessor.componentType !== gltfConst.FLOAT) {
          callback([ createLogError(`Unsupported component type for UV accessor: ${uvAccessor.componentType}`) ]);
          return;
        }

        let uvBufferView: GLTFBufferView = gltf.bufferViews[uvAccessor.bufferView];
        let start = uvBufferView.byteOffset + uvAccessor.byteOffset;
        let uvArray = new Float32Array(buffers[uvBufferView.buffer], start, uvAccessor.count * 2);

        for (let i = 0; i < uvAccessor.count; i++) {
          uvArray[i * 2 + 1] = 1 - uvArray[i * 2 + 1];
        }

        attributes["uv"] = buffers[uvBufferView.buffer].slice(start, start + uvAccessor.count * uvAccessor.byteStride);
      }

      // TODO: support more attributes

      // Skin indices
      let skinIndexAccessor: GLTFAccessor = gltf.accessors[primitive.attributes.JOINT];
      if (skinIndexAccessor != null) {
        if (skinIndexAccessor.componentType !== gltfConst.FLOAT) {
          callback([ createLogError(`Unsupported component type for skin index accessor: ${skinIndexAccessor.componentType}`) ]);
          return;
        }

        let skinIndexBufferView: GLTFBufferView = gltf.bufferViews[skinIndexAccessor.bufferView];
        let start = skinIndexBufferView.byteOffset + skinIndexAccessor.byteOffset;
        attributes["skinIndex"] = buffers[skinIndexBufferView.buffer].slice(start, start + skinIndexAccessor.count * skinIndexAccessor.byteStride);
      }

      // Skin weights
      let skinWeightAccessor: GLTFAccessor = gltf.accessors[primitive.attributes.WEIGHT];
      if (skinWeightAccessor != null) {
        if (skinWeightAccessor.componentType !== gltfConst.FLOAT) {
          callback([ createLogError(`Unsupported component type for skin weight accessor: ${skinWeightAccessor.componentType}`) ]);
          return;
        }

        let skinWeightBufferView: GLTFBufferView = gltf.bufferViews[skinWeightAccessor.bufferView];
        let start = skinWeightBufferView.byteOffset + skinWeightAccessor.byteOffset;
        attributes["skinWeight"] = buffers[skinWeightBufferView.buffer].slice(start, start + skinWeightAccessor.count * skinWeightAccessor.byteStride);
      }

      // Bones
      let bones: { name: string; matrix: number[]; parentIndex: number }[] = null;
      if (skin != null) {
        bones = [];

        for (let i = 0; i < skin.jointNames.length; i++) {
          let jointName = skin.jointNames[i];
          let boneNode = nodesByJointName[jointName];
          let bone = { name: boneNode.jointName, matrix: getNodeMatrix(boneNode).toArray(), parentIndex: <number>null };
          bones.push(bone);
        }

        for (let i = 0; i < skin.jointNames.length; i++) {
          let jointName = skin.jointNames[i];
          for (let childJointName of nodesByJointName[jointName].children) {
            let boneIndex = skin.jointNames.indexOf(childJointName);
            if (boneIndex !== -1) bones[boneIndex].parentIndex = i;
          }
        }
      }

      // Animation
      let animation: { duration: number; keyFrames: { [jointName: string]: any } } = null;
      if (Object.keys(gltf.animations).length > 0) {
        animation = { duration: 0, keyFrames: {} };

        for (let gltfAnimName in gltf.animations) {
          let gltfAnim = gltf.animations[gltfAnimName];
          // gltfAnim.count = keyframe count

          // gltfAnim.channels gives bone name + path (scale, rotation, position)
          for (let gltfChannelName in gltfAnim.channels) {
            let gltfChannel = gltfAnim.channels[gltfChannelName];

            let jointName = gltfChannel.target.id;
            // TODO: get skin.jointNames.indexOf(jointName) and work with IDs instead of jointName?

            let boneAnim = animation.keyFrames[jointName];
            if (boneAnim == null) boneAnim = animation.keyFrames[jointName] = {};

            if (boneAnim[gltfChannel.target.path] != null) {
              callback([ createLogError(`Found multiple animations for ${gltfChannel.target.path} of ${jointName} bone`) ]);
              return;
            }

            let boneTransformAnim = boneAnim[gltfChannel.target.path];
            if (boneTransformAnim == null) boneTransformAnim = boneAnim[gltfChannel.target.path] = [];

            let inputParameterName = gltfAnim.samplers[gltfChannel.sampler].input;
            let timeAccessor: GLTFAccessor = gltf.accessors[gltfAnim.parameters[inputParameterName]];
            if (timeAccessor.componentType !== gltfConst.FLOAT) {
              callback([ createLogError(`Unsupported component type for animation time accessor: ${timeAccessor.componentType}`) ]);
              return;
            }

            let timeBufferView: GLTFBufferView = gltf.bufferViews[timeAccessor.bufferView];
            let timeArray = new Float32Array(buffers[timeBufferView.buffer], timeBufferView.byteOffset + timeAccessor.byteOffset, timeAccessor.count);

            let outputParameterName = gltfAnim.samplers[gltfChannel.sampler].output;
            let outputAccessor: GLTFAccessor = gltf.accessors[gltfAnim.parameters[outputParameterName]];
            if (outputAccessor.componentType !== gltfConst.FLOAT) {
              callback([ createLogError(`Unsupported component type for animation output accessor: ${outputAccessor.componentType}`) ]);
              return;
            }

            let componentsCount = (outputAccessor.type === "VEC3") ? 3 : 4;

            let outputBufferView: GLTFBufferView = gltf.bufferViews[outputAccessor.bufferView];
            let outputArray = new Float32Array(buffers[outputBufferView.buffer], outputBufferView.byteOffset + outputAccessor.byteOffset, outputAccessor.count * componentsCount);

            if (outputParameterName == "rotation") convertAxisAngleToQuaternionArray(outputArray, outputAccessor.count);

            for (let i = 0; i < timeArray.length; i++) {
              let time = timeArray[i];

              let value: number[] = [];
              for (let j = 0; j < componentsCount; j++) value.push(outputArray[i * componentsCount + j]);
              boneTransformAnim.push({ time, value });
              animation.duration = Math.max(animation.duration, time);
            }
          }
        }
      }

      // Maps
      let maps: { [name: string]: ArrayBuffer } = {};

      if(Object.keys(imageFiles).length === 0) {
        callback(null, { attributes, bones, maps, animation, upAxisMatrix: (upAxisMatrix != null) ? upAxisMatrix.toArray() : null });
        return;
      }

      readFile(imageFiles[Object.keys(imageFiles)[0]], "arraybuffer", (err, data) => {
        maps["map"] = data;
        callback(null, { attributes, bones, maps, animation, upAxisMatrix: (upAxisMatrix != null) ? upAxisMatrix.toArray() : null });
      });
    });
  }

  readFile(gltfFile, "json", onGLTFRead);
}
