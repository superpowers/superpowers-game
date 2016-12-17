/// <reference path="../../../common/textEditorWidget/operational-transform.d.ts" />
/// <reference path="../node_modules/typescript/lib/typescriptServices.d.ts" />
/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as OT from "operational-transform";
import * as fs from "fs";
import * as path from "path";

import BehaviorPropertiesResource from "./BehaviorPropertiesResource";

interface CompilationError {
  file: string;
  position: {line: number; character: number};
  message: string;
}

interface CompileTypeScriptResults {
  errors: CompilationError[];
  program: ts.Program;
  typeChecker: ts.TypeChecker;
  script: string;
  sourceMaps: { [name: string]: any };
  files: Array<{name: string; text: string}>;
}

let ts: any;
let compileTypeScript:
  (sourceFileNames: string[],
  sourceFiles: { [name: string]: string },
  libSource: string, compilerOptions: ts.CompilerOptions)
  => CompileTypeScriptResults;
let globalDefs = "";

if ((<any>global).window == null) {
  const serverRequire = require;
  ts = serverRequire("typescript");
  compileTypeScript = serverRequire("../compiler/compileTypeScript").default;

  SupCore.system.requireForAllPlugins("typescriptAPI/index.js");
  const plugins = SupCore.system.getPlugins<SupCore.TypeScriptAPIPlugin>("typescriptAPI");
  const actorComponentAccessors: string[] = [];
  for (const pluginName in plugins) {
    const plugin = plugins[pluginName];
    if (plugin.defs != null) globalDefs += plugin.defs;
    if (plugin.exposeActorComponent != null) actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
  }

  globalDefs = globalDefs.replace("// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join("\n    "));
}

type EditTextCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, operationData: OperationData, revisionIndex: number) => void);
type ApplyDraftChangesCallback = SupCore.Data.Base.ErrorCallback;

interface ScriptAssetPub {
  text: string;
  draft: string;
  revisionId: number;
}

export default class ScriptAsset extends SupCore.Data.Base.Asset {
  static schema: SupCore.Data.Schema = {
    text: { type: "string" },
    draft: { type: "string" },
    revisionId: { type: "integer" }
  };

  pub: ScriptAssetPub;

  document: OT.Document;
  hasDraft: boolean;

  constructor(id: string, pub: any, server?: ProjectServer) {
    super(id, pub, ScriptAsset.schema, server);
  }

  init(options: any, callback: Function) {
    // Transform "script asset name" into "ScriptAssetNameBehavior"
    let behaviorName = options.name.trim().replace(/[()[\]{}-]/g, "");
    behaviorName = behaviorName.slice(0, 1).toUpperCase() + behaviorName.slice(1);

    if (behaviorName === "Behavior" || behaviorName === "Behaviour") {
      const parentEntry = this.server.data.entries.parentNodesById[this.id];
      if (parentEntry != null) {
        behaviorName = parentEntry.name.slice(0, 1).toUpperCase() + parentEntry.name.slice(1) + behaviorName;
      }
    }

    while (true) {
      const index = behaviorName.indexOf(" ");
      if (index === -1) break;

      behaviorName =
        behaviorName.slice(0, index) +
        behaviorName.slice(index + 1, index + 2).toUpperCase() +
        behaviorName.slice(index + 2);
    }

    if (behaviorName.indexOf("Behavior") === -1 && behaviorName.indexOf("Behaviour") === -1) behaviorName += "Behavior";

    this.server.data.resources.acquire("textEditorSettings", null, (err: Error, textEditorSettings: any) => {
      this.server.data.resources.release("textEditorSettings", null);

      let tab: string;
      if (textEditorSettings.pub.softTab) {
        tab = "";
        for (let i = 0; i < textEditorSettings.pub.tabSize; i++) tab = tab + " ";
      } else tab = "\t";
      const defaultContent =
`class ${behaviorName} extends Sup.Behavior {
${tab}awake() {
${tab}${tab}
${tab}}

${tab}update() {
${tab}${tab}
${tab}}
}
Sup.registerBehavior(${behaviorName});
`;
      this.pub = {
        text: defaultContent,
        draft: defaultContent,
        revisionId: 0
      };

      this.server.data.resources.acquire("behaviorProperties", null, (err: Error, behaviorProperties: BehaviorPropertiesResource) => {
        this.server.data.resources.release("behaviorProperties", null);

        if (behaviorProperties.pub.behaviors[behaviorName] == null) {
          const behaviors: { [behaviorName: string]: { line: number, properties: { name: string; type: string; }[]; parentBehavior: string; } } = {};
          behaviors[behaviorName] = { line: 0, properties: [], parentBehavior: null };
          behaviorProperties.setScriptBehaviors(this.id, behaviors);
        }

        super.init(options, callback);
      });
    });
  }

  setup() {
    this.document = new OT.Document(this.pub.draft, this.pub.revisionId);
    this.hasDraft = this.pub.text !== this.pub.draft;
  }

  restore() {
    if (this.hasDraft) this.emit("setBadge", "draft", "info");
  }

  destroy(callback: Function) {
    this.server.data.resources.acquire("behaviorProperties", null, (err: Error, behaviorProperties: BehaviorPropertiesResource) => {
      behaviorProperties.clearScriptBehaviors(this.id);
      this.server.data.resources.release("behaviorProperties", null);
      callback();
    });
  }

  load(assetPath: string) {
    // NOTE: asset.json was removed in Superpowers 0.10
    // The empty callback is required to not fail if the file already doesn't exist
    fs.unlink(path.join(assetPath, "asset.json"), (err) => { /* Ignore */ });

    // NOTE: We must not set this.pub with a temporary value right now, otherwise
    // the asset will be considered loaded by Dictionary.acquire
    // and the acquire callback will be called immediately

    let pub: ScriptAssetPub;

    const finishLoading = () => {
      if (pub.draft != null) pub.draft = pub.draft.replace(/\r\n/g, "\n");
      pub.text = pub.text.replace(/\r\n/g, "\n");

      this._onLoaded(assetPath, pub);
    };

    const readDraft = (text: string) => {
      fs.readFile(path.join(assetPath, "draft.ts"), { encoding: "utf8" }, (err, draft) => {
        // NOTE: draft.txt was renamed to draft.ts in Superpowers 0.11
        if (err != null && err.code === "ENOENT") {
          fs.readFile(path.join(assetPath, "draft.txt"), { encoding: "utf8" }, (err, draft) => {
            pub = { revisionId: 0, text, draft: (draft != null) ? draft : text };
            finishLoading();

            if (draft != null) {
              if (draft !== text) fs.writeFile(path.join(assetPath, "draft.ts"), draft, { encoding: "utf8" });
              fs.unlink(path.join(assetPath, "draft.txt"), (err) => { /* Ignore */ });
            }

          });
        } else {
          pub = { revisionId: 0, text, draft: (draft != null) ? draft : text };
          finishLoading();
        }
      });
    };

    fs.readFile(path.join(assetPath, "script.ts"), { encoding: "utf8" }, (err, text) => {
      // NOTE: script.txt was renamed to script.ts in Superpowers 0.11
      if (err != null && err.code === "ENOENT") {
        fs.readFile(path.join(assetPath, "script.txt"), { encoding: "utf8" }, (err, text) => {
          readDraft(text);
          fs.writeFile(path.join(assetPath, "script.ts"), text, { encoding: "utf8" });
          fs.unlink(path.join(assetPath, "script.txt"), (err) => { /* Ignore */ });
        });
      } else readDraft(text);
    });
  }

  save(outputPath: string, callback: (err: Error) => void) {
    this.write(fs.writeFile, outputPath, (err) => {
      if (err != null) { callback(err); return; }

      if (this.hasDraft) {
        fs.writeFile(path.join(outputPath, "draft.ts"), this.pub.draft, { encoding: "utf8" }, callback);
      } else {
        fs.unlink(path.join(outputPath, "draft.ts"), (err) => {
          if (err != null && err.code !== "ENOENT") { callback(err); return; }
          callback(null);
        });
      }
    });
  }

  private write(writeFile: Function, outputPath: string, callback: (err: Error) => void) {
    writeFile(path.join(outputPath, "script.ts"), this.pub.text, { encoding: "utf8" }, callback);
  }

  server_editText(client: SupCore.RemoteClient, operationData: OperationData, revisionIndex: number, callback: EditTextCallback) {
    if (operationData.userId !== client.id) { callback("Invalid client id"); return; }

    let operation = new OT.TextOperation();
    if (!operation.deserialize(operationData)) { callback("Invalid operation data"); return; }

    try { operation = this.document.apply(operation, revisionIndex); }
    catch (err) { callback("Operation can't be applied"); return; }

    this.pub.draft = this.document.text;
    this.pub.revisionId++;

    callback(null, null, operation.serialize(), this.document.getRevisionId() - 1);

    if (!this.hasDraft) {
      this.hasDraft = true;
      this.emit("setBadge", "draft", "info");
    }
    this.emit("change");
  }

  client_editText(operationData: OperationData, revisionIndex: number) {
    const operation = new OT.TextOperation();
    operation.deserialize(operationData);
    this.document.apply(operation, revisionIndex);
    this.pub.draft = this.document.text;
    this.pub.revisionId++;
  }

  server_applyDraftChanges(client: SupCore.RemoteClient, options: { ignoreErrors: boolean }, callback: ApplyDraftChangesCallback) {
    const text = this.pub.draft;

    const scriptNames: string[] = [];
    const scripts: { [name: string]: string } = {};
    let ownScriptName = "";

    const finish = (errors: CompilationError[]) => {
      const foundSelfErrors = (errors != null) && errors.some((x) => x.file === ownScriptName);

      if (foundSelfErrors && !options.ignoreErrors) {
        callback("foundSelfErrors");
        return;
      }

      this.pub.text = text;
      callback(null);

      if (this.hasDraft) {
        this.hasDraft = false;
        this.emit("clearBadge", "draft");
      }

      this.emit("change");
    };

    const compile = () => {
      let results: CompileTypeScriptResults;
      try { results = compileTypeScript(scriptNames, scripts, globalDefs, { sourceMap: false }); }
      catch (e) { finish(null); return; }

      if (results.errors.length > 0) { finish(results.errors); return; }

      const libLocals = <ts.SymbolTable>(<any>results.program.getSourceFile("lib.d.ts")).locals;
      const supTypeSymbols: { [fullName: string]: ts.Symbol } = {
        "Sup.Actor": libLocals["Sup"].exports["Actor"],
        "Sup.Behavior": libLocals["Sup"].exports["Behavior"],
        "Sup.Math.Vector2": libLocals["Sup"].exports["Math"].exports["Vector2"],
        "Sup.Math.Vector3": libLocals["Sup"].exports["Math"].exports["Vector3"],
        "Sup.Asset": libLocals["Sup"].exports["Asset"],
      };

      const supportedSupPropertyTypes: ts.Symbol[] = [
        supTypeSymbols["Sup.Math.Vector2"],
        supTypeSymbols["Sup.Math.Vector3"]
      ];

      const behaviors: { [behaviorName: string]: { line: number, properties: Array<{ name: string, type: string }>; parentBehavior: string } } = {};

      const file = results.program.getSourceFile(ownScriptName);
      const ownLocals = <ts.SymbolTable>(<any>file).locals;
      for (const symbolName in ownLocals) {
        const symbol = ownLocals[symbolName];
        if ((symbol.flags & ts.SymbolFlags.Class) !== ts.SymbolFlags.Class) continue;

        const parentTypeNode = (<any>ts).getClassExtendsHeritageClauseElement(symbol.valueDeclaration);
        if (parentTypeNode == null) continue;
        const parentTypeSymbol = results.typeChecker.getSymbolAtLocation(parentTypeNode.expression);

        let baseTypeNode = parentTypeNode;
        let baseTypeSymbol = parentTypeSymbol;
        while (true) {
          if (baseTypeSymbol === supTypeSymbols["Sup.Behavior"]) break;
          baseTypeNode = (<any>ts).getClassExtendsHeritageClauseElement(baseTypeSymbol.valueDeclaration);
          if (baseTypeNode == null) break;
          baseTypeSymbol = results.typeChecker.getSymbolAtLocation(baseTypeNode.expression);
        }

        if (baseTypeSymbol !== supTypeSymbols["Sup.Behavior"]) continue;

        const properties: Array<{ name: string, type: string }> = [];

        let parentBehavior: string = null;
        if (parentTypeSymbol !== supTypeSymbols["Sup.Behavior"])
          parentBehavior = results.typeChecker.getFullyQualifiedName(parentTypeSymbol);
        const line = file.getLineAndCharacterOfPosition(symbol.valueDeclaration.name.pos).line;
        behaviors[symbolName] = { line, properties, parentBehavior };

        for (const memberName in symbol.members) {
          const member = symbol.members[memberName];

          // Skip non-properties
          if ((member.flags & ts.SymbolFlags.Property) !== ts.SymbolFlags.Property) continue;

          // Skip static, private and protected members
          const modifierFlags = (member.valueDeclaration.modifiers != null) ? member.valueDeclaration.modifiers.flags : null;
          if (modifierFlags != null && (modifierFlags & (ts.NodeFlags.Private | ts.NodeFlags.Protected | ts.NodeFlags.Static)) !== 0) continue;

          // TODO: skip members annotated as "non-customizable"

          const type = results.typeChecker.getTypeAtLocation(member.valueDeclaration);
          let typeName: any; // "unknown"
          const typeSymbol = type.getSymbol();
          if (supportedSupPropertyTypes.indexOf(typeSymbol) !== -1) {
            typeName = typeSymbol.getName();
            let parentSymbol = (<any>typeSymbol).parent;
            while (parentSymbol != null) {
              typeName = `${parentSymbol.getName()}.${typeName}`;
              parentSymbol = parentSymbol.parent;
            }
          }
          else if ((<any>type).intrinsicName != null) typeName = (<any>type).intrinsicName;

          if (typeName != null) properties.push({ name: member.name, type: typeName });
        }
      }
      this.server.data.resources.acquire("behaviorProperties", null, (err: Error, behaviorProperties: BehaviorPropertiesResource) => {
        behaviorProperties.setScriptBehaviors(this.id, behaviors);
        this.server.data.resources.release("behaviorProperties", null);
        finish(null);
      });
    };

    let remainingAssetsToLoad = Object.keys(this.server.data.entries.byId).length;
    let assetsLoading = 0;
    this.server.data.entries.walk((entry: SupCore.Data.EntryNode) => {
      remainingAssetsToLoad--;
      if (entry.type !== "script") {
        if (remainingAssetsToLoad === 0 && assetsLoading === 0) compile();
        return;
      }

      const name = `${this.server.data.entries.getPathFromId(entry.id)}.ts`;
      scriptNames.push(name);

      if (entry.id === this.id) {
        ownScriptName = name;
        scripts[name] = text;

        if (remainingAssetsToLoad === 0 && assetsLoading === 0) compile();
        return;
      }

      assetsLoading++;
      this.server.data.assets.acquire(entry.id, null, (err: Error, asset: ScriptAsset) => {
        scripts[name] = asset.pub.text;

        this.server.data.assets.release(entry.id, null);
        assetsLoading--;

        if (remainingAssetsToLoad === 0 && assetsLoading === 0) compile();
      });
    });
  }

  client_applyDraftChanges() { this.pub.text = this.pub.draft; }
}
