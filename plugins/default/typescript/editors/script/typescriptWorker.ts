import * as ts from "typescript";

/* tslint:disable */
const fuzzy = require("fuzzy");
/* tslint:enable */

let scripts: {
  fileNames: string[];
  files: { [name: string]: { id: string; text: string; version: string; } };
};

let compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES5 };
let host: ts.LanguageServiceHost = {
    getScriptFileNames: () => scripts.fileNames,
    getScriptVersion: (fileName) => scripts.files[fileName].version,
    getScriptSnapshot: (fileName) => ts.ScriptSnapshot.fromString(scripts.files[fileName].text),
    getCurrentDirectory: () => "",
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: () => "lib.d.ts"
};

let service: ts.LanguageService;

onmessage = (event: MessageEvent) => {
  if (event.data.type !== "setup" && service == null) return;

  switch (event.data.type) {
    case "setup":
      scripts = { fileNames: event.data.fileNames, files: event.data.files };
      service = ts.createLanguageService(host, ts.createDocumentRegistry());
      break;
    case "updateFile":
      let script = scripts.files[event.data.fileName];
      script.text = event.data.text;
      script.version = event.data.version;
      break;
    case "addFile":
      scripts.fileNames.splice(event.data.index, 0, event.data.fileName);
      scripts.files[event.data.fileName] = event.data.file;
      break;
    case "removeFile":
      scripts.fileNames.splice(scripts.fileNames.indexOf(event.data.fileName), 1);
      delete scripts.files[event.data.fileName];
      break;

    case "checkForErrors":
      let tsErrors: ts.Diagnostic[];
      try { tsErrors = ts.getPreEmitDiagnostics(service.getProgram()); }
      catch (e) {
        (<any>postMessage)({ type: "errors", errors: [ { file: "", position: { line: 0, character: 1 }, length: 0, message: e.message } ] });
        return;
      }

      let errors = tsErrors.map((e) => {
        return {
          file: e.file.fileName, length: e.length,
          message: ts.flattenDiagnosticMessageText(e.messageText, "\n"),
          position: e.file.getLineAndCharacterOfPosition(e.start)
        };
      });

      (<any>postMessage)({ type: "errors", errors });
      break;

    case "getCompletionAt":
      let list: { text: string; kind: string; name: string; info: string }[] = [];

      if (event.data.tokenString !== "" && event.data.tokenString !== ";") {
        let completions = service.getCompletionsAtPosition(event.data.name, event.data.start);
        if (completions != null) {
          let rawList: string[] = [];
          for (let completion of completions.entries) rawList.push(completion.name);
          rawList.sort();

          event.data.tokenString = (event.data.tokenString !== ".") ? event.data.tokenString : "";
          let results: any[] = fuzzy.filter(event.data.tokenString, rawList);

          let exactStartIndex = 0;
          for (let index = 0; index < results.length; index++) {
            let result = results[index];
            let text: string = result.original;
            if (text.slice(0, event.data.tokenString.length) === event.data.tokenString) {
              results.splice(index, 1);
              results.splice(exactStartIndex, 0, result);
              exactStartIndex++;
            }
          }

          for (let result of results) {
            let details = service.getCompletionEntryDetails(event.data.name, event.data.start, result.original);
            let kind = details.kind;
            let info = "";
            if (["class", "module", "namespace", "interface", "keyword"].indexOf(kind) === -1) info = ts.displayPartsToString(details.displayParts);
            list.push({ text: result.original, kind, name: details.name, info });
          }
        }
      }
      (<any>postMessage)({ type: "completion", list });
      break;

    case "getQuickInfoAt":
      let info = service.getQuickInfoAtPosition(event.data.name, event.data.start);
      if (info != null) (<any>postMessage)({ type: "quickInfo", text: ts.displayPartsToString(info.displayParts) });
      break;

    case "getParameterHintAt":
      let texts: { prefix: string; parameters: string[]; suffix: string; }[];
      let selectedItemIndex: number;
      let selectedArgumentIndex: number;

      let help = service.getSignatureHelpItems(event.data.name, event.data.start);
      if (help != null) {
        texts = [];
        selectedItemIndex = help.selectedItemIndex;
        selectedArgumentIndex = help.argumentIndex;

        for (let item of help.items) {
          let prefix = ts.displayPartsToString(item.prefixDisplayParts);
          let parameters: string[] = [];
          for (let parameter of item.parameters) parameters.push(ts.displayPartsToString(parameter.displayParts));
          let suffix = ts.displayPartsToString(item.suffixDisplayParts);

          texts.push({ prefix, parameters, suffix });
        }
      }

      (<any>postMessage)({ type: "parameterHint", texts, selectedItemIndex, selectedArgumentIndex });
      break;

    case "getDefinitionAt":
      let definitions = service.getDefinitionAtPosition(event.data.name, event.data.start);
      if (definitions == null) return;

      let definition = definitions[0];
      if (definition.fileName === "lib.d.ts") {
        // TODO: open the API browser at the proper page
      } else {
        let file = scripts.files[definition.fileName].text;
        let textParts = file.split("\n");
        let line = 0;
        let position = 0;
        while (position + textParts[line].length <= definition.textSpan.start) {
          position += textParts[line].length + 1;
          line += 1;
        }

        let fileName = definition.fileName.slice(0, definition.fileName.length - 3);
        (<any>postMessage)({ type: "definition", fileName, line, ch: definition.textSpan.start - position });
      }
      break;

    default:
      throw new Error(`Unexpected message type: ${event.data.type}`);
  }
};
