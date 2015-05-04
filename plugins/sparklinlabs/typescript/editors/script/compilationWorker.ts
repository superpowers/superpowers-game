import * as ts from "typescript";
import createLanguageService from "../../data/createLanguageService";

onmessage = (event) => {
  let service = createLanguageService(event.data.scriptNames, event.data.scripts, event.data.globalDefs);
  let errors: ts.Diagnostic[];
  try { errors = ts.getPreEmitDiagnostics(service.getProgram()); }
  catch (e) {
    (<any>postMessage)([ { file: "", position: { line: 0, character: 1 }, length: 0, message: e.message } ]);
    return;
  }

  let formatedErrors = errors.map((e: any) => {
    return {
      file: e.file.fileName,
      position: e.file.getLineAndCharacterOfPosition(e.start),
      length: e.length,
      message: e.messageText
      }
    }
  );

  (<any>postMessage)(formatedErrors);
}
