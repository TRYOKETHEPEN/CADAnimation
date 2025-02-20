import { Injectable } from '@angular/core';
import THREE = require('three');
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { SceneUtilsService } from '../utils/scene.utils.service';
let occtimportjs = require("occt-import/occt-import-js.js");

@Injectable({
  providedIn: 'root'
})
export class ModelloaderService {

  occt: any = undefined;
  wasmUrl = 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.18/dist/occt-import-js.wasm';
  constructor(public SceneUtilsService: SceneUtilsService) { }

  async LoadModel(url: string, fileName: string, obj: THREE.Object3D): Promise<boolean> {
    if (/(.(stp|STEP|step)$)/.test(fileName!)) {
      console.log(/(.(stp|STEP|step)$)/.exec(fileName!)![2]);
      await this.LoadStepModel(url, obj);
      this.SceneUtilsService.fileName = fileName;
      return true;
    }
    else if (/(.(iges|igs)$)/.test(fileName!)) {
      console.log(/(.(iges|igs)$)/.exec(fileName!)![2]);
      await this.LoadIgesModel(url, obj);
      this.SceneUtilsService.fileName = fileName;
      return true;
    }
    else if (/(.(brep|BREP|BRep|Brep)$)/.test(fileName!)) {
      console.log(/(.(brep|BREP|BRep|Brep)$)/.exec(fileName!)![2]);
      await this.LoadBrepModel(url, obj);
      this.SceneUtilsService.fileName = fileName;
      return true;
    }
    else if (/(.(gltf|glb)$)/.test(fileName!)) {
      console.log(/(.(gltf|glb)$)/.exec(fileName!)![2]);
      await this.LoadGLTFModel(url, obj);
      this.SceneUtilsService.fileName = fileName;
      return true;
    }
    else return false;
  }

  async InitOCCT() {
    console.log(this.occt);
    if (this.occt == undefined)
      this.occt = await occtimportjs({
        locateFile: (name: any) => {
          return this.wasmUrl;
        }
      })
  }

  async LoadStepModel(url: string, obj: THREE.Object3D) {
    this.SceneUtilsService.ClearScene();
    await this.InitOCCT();
    let response = await fetch(url);
    let buffer = await response.arrayBuffer();
    let fileBuffer = new Uint8Array(buffer);
    let result = this.occt.ReadStepFile(fileBuffer, null);
    console.log(result);
    let stp = this.CreateModel(result, result.root);
    obj.add(stp);
    console.log(obj);
  }
  async LoadIgesModel(url: string, obj: THREE.Object3D) {
    this.SceneUtilsService.ClearScene();
    this.InitOCCT();
    let response = await fetch(url);
    let buffer = await response.arrayBuffer();
    let fileBuffer = new Uint8Array(buffer);
    let result = this.occt.ReadIgesFile(fileBuffer, null);
    console.log(result);
    let iges = this.CreateModel(result, result.root);
    obj.add(iges);
    console.log(obj);

  }
  async LoadBrepModel(url: string, obj: THREE.Object3D) {
    this.SceneUtilsService.ClearScene();
    this.InitOCCT();
    let response = await fetch(url);
    let buffer = await response.arrayBuffer();
    let fileBuffer = new Uint8Array(buffer);
    let result = this.occt.ReadBrepFile(fileBuffer, null);
    console.log(result);
    let brep = this.CreateModel(result, result.root);
    obj.add(brep);
    console.log(obj);
  }
  CreateModel(res: any, data: any, i = 0, root?: THREE.Object3D): THREE.Object3D {
    i++;
    let obj = new THREE.Object3D();
    if (root != undefined)
      root?.add(obj);
    else root = obj;
    if (data.name != "")
      obj.name = data.name;
    else obj.name = `Object3D_${i}`;
    if (data.meshes.length != 0) {
      for (let j = 0; j < data.meshes.length; j++) {
        i++
        let geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(res.meshes[data.meshes[j]].attributes.position.array, 3));
        if (res.meshes[data.meshes[j]].attributes.normal)
          geom.setAttribute('normal', new THREE.Float32BufferAttribute(res.meshes[data.meshes[j]].attributes.normal.array, 3));
        let index = Uint32Array.from(res.meshes[data.meshes[j]].index.array);
        geom.setIndex(new THREE.BufferAttribute(index, 1));
        let mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.3 });
        if (res.meshes[data.meshes[j]].color != undefined) {
          let color = res.meshes[data.meshes[j]].color;
          mat.color = new THREE.Color(color[0], color[1], color[2]);
        }
        let faceColorArray = new Array(geom.attributes['position'].count).fill(0);
        for (let f = 0; f < res.meshes[data.meshes[j]].brep_faces.length; f++) {
          let faceColor = res.meshes[data.meshes[j]].brep_faces[f];
          if (faceColor.color != null) {
            mat.vertexColors = true;
            geom = geom.toNonIndexed();
            for (let n = faceColor.first; n <= faceColor.last; n++) {
              faceColorArray.splice(Math.floor(n * 9), 9, ...faceColor.color, ...faceColor.color, ...faceColor.color);
            }
          }
        }
        if (mat.vertexColors)
          geom.setAttribute('color', new THREE.Float32BufferAttribute(faceColorArray, 3));
        let mesh = new THREE.Mesh(geom, mat);
        if (res.meshes[data.meshes[j]].name != "")
          mesh.name = res.meshes[data.meshes[j]].name;
        else mesh.name = `Mesh_${mesh.id}`;
        obj.add(mesh);
      }
    }
    if (data.children.length != 0) {
      for (let j = 0; j < data.children.length; j++) {
        this.CreateModel(res, data.children[j], i, obj);
      }
    }
    return root;
  }

  async LoadGLTFModel(url: string, obj: THREE.Object3D) {
    // Создание объекта загрузчика GLTF файлов
    let loader = new GLTFLoader();
    let gltf = await loader.loadAsync(
      url,
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      }
    );
    if (gltf.scene.children.length != 0) {
      this.SceneUtilsService.ClearScene();
      // Добавление модели в контейнер
      obj.add(gltf.scene.children[0].clone());
      // Создание ребер для каждой детали модели
      gltf.scene.traverse(obj => {
        if (obj.type == "Mesh" || obj.type == "LineSegments") {
          (obj as any).geometry.dispose();
          (obj as any).material.dispose();
        }
      });
      console.log(obj);
    }
  }
}
