import * as ts from "typescript";

export default function createLanguageService(fileNames: string[], files: {[name: string]: string}, libSource: string, compilerOptions: ts.CompilerOptions={}) {
  if (compilerOptions.target == null) compilerOptions.target = ts.ScriptTarget.ES5;

  fileNames.splice(0, 0, "lib.d.ts");
  // Create the language service host to allow the LS to communicate with the host
  const servicesHost: ts.LanguageServiceHost = {
      getScriptFileNames: () => fileNames,
      getScriptVersion: (fileName) => "0",
      getScriptSnapshot: (fileName) => {
        if (fileName === "lib.d.ts") return ts.ScriptSnapshot.fromString(libSource);
        else return ts.ScriptSnapshot.fromString(files[fileName]);
      },
      getCurrentDirectory: () => "",
      getCompilationSettings: () => compilerOptions,
      getDefaultLibFileName: () => "lib.d.ts",
  };

  // Create the language service files
  return ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
}
