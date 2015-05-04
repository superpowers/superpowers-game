///<reference path="./operational-transform.d.ts"/>
///<reference path="../node_modules/typescript/bin/typescriptServices.d.ts"/>

import * as OT from "operational-transform";
import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";

import BehaviorPropertiesResource from "./BehaviorPropertiesResource";

interface CompilationError {
  file: string;
  position: {line: number; character: number};
  message: string;
}

interface CompileTypeScriptResults {
  errors: any;
  program: ts.Program;
  typeChecker: ts.TypeChecker;
  script: string;
  sourceMaps: { [name: string]: any };
  files: Array<{name: string; text: string}>;
}

if ((<any>global).window == null) {
  let serverRequire = require;
  var ts = serverRequire("typescript");

  var compileTypeScript: (sourceFileNames: string[], sourceFiles: { [name: string]: string }, libSource: string, compilerOptions: ts.CompilerOptions) => CompileTypeScriptResults = serverRequire("../runtime/compileTypeScript").default;
  var globalDefs = "";

  let actorComponentAccessors: string[] = [];
  for (let pluginName in SupAPI.contexts["typescript"].plugins) {
    let plugin = SupAPI.contexts["typescript"].plugins[pluginName];
    if (plugin.defs != null) globalDefs += plugin.defs;
    if (plugin.exposeActorComponent != null) actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
  }

  globalDefs = globalDefs.replace("// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join("\n    "));
}

export default class ScriptAsset extends SupCore.data.base.Asset {

  static schema = {
    text: { type: "string" },
    draft: { type: "string" },
    revisionId: { type: "integer" }
  };

  pub: {
    text: string;
    draft: string
    revisionId: number;
  }

  document: OT.Document;
  hasDraft: boolean;

  constructor(id: string, pub: any, serverData?: any) {
    this.document = new OT.Document();
    super(id, pub, ScriptAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    // Transform "script asset name" into "ScriptAssetNameBehavior"
    let behaviorName = options.name.trim();
    behaviorName = behaviorName.slice(0, 1).toUpperCase() + behaviorName.slice(1);

    while (true) {
      let index = behaviorName.indexOf(" ")
      if (index === -1) break;

      behaviorName =
        behaviorName.slice(0, index) +
        behaviorName.slice(index + 1, index + 2).toUpperCase() +
        behaviorName.slice(index + 2);
    }

    if (! _.endsWith(behaviorName, "Behavior")) behaviorName += "Behavior";

    let defaultContent = [
      `class ${behaviorName} extends Sup.Behavior {`,
      "  awake() {",
      "    ",
      "  }",
      "  update() {",
      "    ",
      "  }",
     "}",
     `Sup.registerBehavior(${behaviorName});`,
     ""
    ].join("\n");

    this.pub = {
      text: defaultContent,
      draft: defaultContent,
      revisionId: 0
    }

    this.serverData.resources.acquire("behaviorProperties", null, (err: Error, behaviorProperties: BehaviorPropertiesResource) => {
      if (behaviorProperties.pub.behaviors[behaviorName] == null) {
        let behaviors: { [behaviorName: string]: { properties: Array<{name: string; type: string}>; parentBehavior: string; } } = {};
        behaviors[behaviorName] = { properties: [], parentBehavior: null };
        behaviorProperties.setScriptBehaviors(this.id, behaviors);
      }

      this.serverData.resources.release("behaviorProperties", null);
      super.init(options, callback);
    });
  }

  setup() {
    this.document.text = this.pub.draft;
    for (let i = 0; i < this.pub.revisionId; i++) (<any>this.document.operations).push(0);

    this.hasDraft = this.pub.text != this.pub.draft
  }

  restore() {
    if (this.hasDraft) this.emit("setDiagnostic", "draft", "info");
  }

  destroy(callback: Function) {
    this.serverData.resources.acquire("behaviorProperties", null, (err: Error, behaviorProperties: BehaviorPropertiesResource) => {
      behaviorProperties.clearScriptBehaviors(this.id);
      this.serverData.resources.release("behaviorProperties", null);
      callback();
    });
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      this.pub = JSON.parse(json);

      fs.readFile(path.join(assetPath, "script.txt"), { encoding: "utf8" }, (err, text) => {
        this.pub.text = text;

        fs.readFile(path.join(assetPath, "draft.txt"), { encoding: "utf8" }, (err, draft) => {
          // Temporary asset migration
          if (draft == null) draft = this.pub.text;

          this.pub.draft = draft;
          this.setup();
          this.emit("load");
        });
      });
    });
  }

  save(assetPath: string, callback: (err: Error) => any) {
    let text = this.pub.text; delete this.pub.text;
    let draft = this.pub.draft; delete this.pub.draft;

    let json = JSON.stringify(this.pub, null, 2);

    this.pub.text = text
    this.pub.draft = draft

    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, (err) => {
      if (err != null) { callback(err); return; }
      fs.writeFile(path.join(assetPath, "script.txt"), text, { encoding: "utf8" }, (err) => {
        if (err != null) { callback(err); return; }
        fs.writeFile(path.join(assetPath, "draft.txt"), draft, { encoding: "utf8" }, callback);
      });
    });
  }

  server_editText(client: any, operationData: OT.OperationData, revisionIndex: number, callback: (err: string, operationData?: any, revisionIndex?: number) => any) {
    if (operationData.userId !== client.id) { callback("Invalid client id"); return; }

    let operation = new OT.TextOperation();
    if (! operation.deserialize(operationData)) { callback("Invalid operation data"); return; }

    try { operation = this.document.apply(operation, revisionIndex); }
    catch (err) { callback("Operation can't be applied"); return; }

    this.pub.draft = this.document.text;
    this.pub.revisionId++;

    callback(null, operation.serialize(), this.document.operations.length - 1);

    if (! this.hasDraft) {
      this.hasDraft = true;
      this.emit("setDiagnostic", "draft", "info");
    }
    this.emit("change");
  }

  client_editText(operationData: OT.OperationData, revisionIndex: number) {
    let operation = new OT.TextOperation();
    operation.deserialize(operationData);
    this.document.apply(operation, revisionIndex);
    this.pub.draft = this.document.text;
    this.pub.revisionId++;
  }

  server_saveText(client: any, callback: (err: string, errors: CompilationError[]) => any) {
    this.pub.text = this.pub.draft;

    let scriptNames: string[] = [];
    let scripts: {[name: string]: string} = {};
    let ownScriptName = "";

    let finish = (errors: CompilationError[]) => {
      callback(null, errors);

      if (this.hasDraft) {
        this.hasDraft = false;
        this.emit("clearDiagnostic", "draft");
      }

      this.emit("change");
    };

    let compile = () => {
      try { var results = compileTypeScript(scriptNames, scripts, globalDefs, { sourceMap: false} ); }
      catch (e) { finish([ { file: "", position: { line: 1, character: 1 }, message: e.message } ]); return; }

      let ownErrors: CompilationError[] = [];
      for (let error of results.errors) if (error.file == ownScriptName) ownErrors.push(error);
      if (ownErrors.length > 0) { finish(ownErrors); return; }
      // If there were no errors in this script but there are errors in others, report them
      if (results.errors.length > 0) { finish(results.errors); return; }

      let libSourceFile = results.program.getSourceFile("lib.d.ts");
      let supTypeSymbols = {
        "Sup.Actor": libSourceFile.locals["Sup"].exports["Actor"],
        "Sup.Behavior": libSourceFile.locals["Sup"].exports["Behavior"],
        "Sup.Math.Vector3": libSourceFile.locals["Sup"].exports["Math"].exports["Vector3"],
        "Sup.Asset": libSourceFile.locals["Sup"].exports["Asset"],
      };

      let supTypeSymbolsList: ts.Symbol[] = [];
      for (let value in supTypeSymbols) supTypeSymbolsList.push(value);

      let behaviors: {[behaviorName: string]: { properties: Array<{ name: string, type: string }>; parentBehavior: string } } = {};

      for (let symbolName in results.program.getSourceFile(ownScriptName).locals) {
        let symbol = <ts.Symbol>results.program.getSourceFile(ownScriptName).locals[symbolName];
        if ((symbol.flags & ts.SymbolFlags.Class) != ts.SymbolFlags.Class) continue;

        let parentTypeNode = ts.getClassExtendsHeritageClauseElement(symbol.valueDeclaration);
        let parentTypeSymbol = results.typeChecker.getSymbolAtLocation(parentTypeNode.expression);
        if (parentTypeNode == null) continue;

        let baseTypeNode = parentTypeNode;
        let baseTypeSymbol = parentTypeSymbol;
        while (true) {
          if (baseTypeSymbol === supTypeSymbols["Sup.Behavior"]) break;
          baseTypeNode = ts.getClassExtendsHeritageClauseElement(baseTypeSymbol.valueDeclaration);
          if (baseTypeNode == null) break;
          baseTypeSymbol = results.typeChecker.getSymbolAtLocation(baseTypeNode.expression);
        }

        if (baseTypeSymbol !== supTypeSymbols["Sup.Behavior"]) continue;

        let properties: Array<{ name: string, type: string }> = [];

        let parentBehavior: string = null;
        if (parentTypeSymbol !== supTypeSymbols["Sup.Behavior"]) parentBehavior = results.typeChecker.getFullyQualifiedName(parentTypeSymbol);
        behaviors[symbolName] = { properties, parentBehavior };

        for (let memberName in symbol.members) {
          let member = symbol.members[memberName];

          // Skip non-properties
          if ((member.flags & ts.SymbolFlags.Property) != ts.SymbolFlags.Property) continue;

          // Skip static, private and protected members
          let modifierFlags = (member.valueDeclaration.modifiers != null) ? member.valueDeclaration.modifiers.flags : null;
          if (modifierFlags != null && (modifierFlags & (ts.NodeFlags.Private | ts.NodeFlags.Protected | ts.NodeFlags.Static)) != 0) continue;

          // TODO: skip members annotated as "non-customizable"

          let type = results.typeChecker.getTypeAtLocation(member.valueDeclaration);
          let typeName: any; // "unknown"
          let typeSymbol = type.getSymbol();
          if (supTypeSymbolsList.indexOf(typeSymbol) != -1) {
            // TODO: Get full name
            // Until then, we only support intrinsic types
            // typeName = typeSymbol.getName()
          }
          else if ((<ts.IntrinsicType>type).intrinsicName != null) typeName = (<ts.IntrinsicType>type).intrinsicName;

          if (typeName != null) properties.push({ name: member.name, type: typeName });
        }
      }
      this.serverData.resources.acquire("behaviorProperties", null, (err: Error, behaviorProperties: BehaviorPropertiesResource) => {
        behaviorProperties.setScriptBehaviors(this.id, behaviors);
        this.serverData.resources.release("behaviorProperties", null);
        finish([]);
      });
    };

    let remainingAssetsToLoad = Object.keys(this.serverData.entries.byId).length;
    let assetsLoading = 0;
    this.serverData.entries.walk((entry: any) => {
      remainingAssetsToLoad--;
      if (entry.type != "script") {
        if (remainingAssetsToLoad == 0 && assetsLoading == 0) compile();
        return;
      }

      let name = `${this.serverData.entries.getPathFromId(entry.id)}.ts`;
      scriptNames.push(name);
      assetsLoading++;
      this.serverData.assets.acquire(entry.id, null, (err: Error, asset: ScriptAsset) => {
        scripts[name] = asset.pub.text;
        if (asset == this) ownScriptName = name;

        this.serverData.assets.release(entry.id, null);
        assetsLoading--;

        if (remainingAssetsToLoad == 0 && assetsLoading == 0) compile();
      });
    });
  }

  client_saveText() { this.pub.text = this.pub.draft; }
}
