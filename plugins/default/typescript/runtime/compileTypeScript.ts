import * as ts from "typescript";

export default function compileTypeScript(sourceFileNames: string[], sourceFiles: {[name: string]: string}, libSource: string, compilerOptions: ts.CompilerOptions = {}) {
  if (compilerOptions.target == null) compilerOptions.target = ts.ScriptTarget.ES5;

  let script = "";
  let files: Array<{name: string; text: string}> = [];
  let sourceMaps: { [name: string]: any } = {};
  // Create a compilerHost object to allow the compiler to read and write files
  let compilerHost: ts.CompilerHost = {
    getSourceFile: (filename: string, languageVersion: any) => {
      if (sourceFiles[filename] != null) return ts.createSourceFile(filename, sourceFiles[filename], compilerOptions.target);
      if (filename === "lib.d.ts") return ts.createSourceFile(filename, libSource, compilerOptions.target);
      return null;
    },
    readFile: (path: string, encoding?: string) => {
      if (path === "lib.d.ts") return libSource;
      else return sourceFiles[path];
    },
    writeFile: (name: string, text: string, writeByteOrderMark: any) => {
      if (name.slice(name.length - 4) === ".map") {
        name = name.slice(0, name.length - 7);
        let sourceMap = JSON.parse( text );
        sourceMap.sourcesContent = [sourceFiles[`${name}.ts`]];
        sourceMaps[name] = sourceMap;
      }
      else {
        let filePath = name.slice(0, name.length - 3);
        let fileName = filePath.slice(filePath.lastIndexOf("/") + 1);

        let sourceMapText = `//# sourceMappingURL=${fileName}.js.map`;
        let sourceMapEmpty = new Array(sourceMapText.length).join(" ");
        text = text.replace(sourceMapText, sourceMapEmpty);

        files.push({ name: filePath, text });
        script += `\n${text}`;
      }
    },

    fileExists: (path: string) => { return path === "lib.d.ts" || sourceFiles[path] != null; },
    getDefaultLibFileName: () => "lib.d.ts",
    useCaseSensitiveFileNames: () => false,
    getCanonicalFileName: (filename: string) => filename,
    getCurrentDirectory: () => "",
    getNewLine: () => "\n"
  };

  // Create a program from inputs
  let program = ts.createProgram(sourceFileNames, compilerOptions, compilerHost);
  // Query for earyly errors
  let errors = ts.getPreEmitDiagnostics(program);
  if (errors.length > 0) {
    return {
      errors: errors.map((e) => {
        return {
          file: e.file != null ? e.file.fileName : "internal",
          position: e.file != null ? e.file.getLineAndCharacterOfPosition(e.start) : { line: 0, character: 0 },
          length: e.length,
          message: ts.flattenDiagnosticMessageText(e.messageText, "\n")
        };
      }),
      program, typeChecker: null, script, sourceMaps, files
    };
  }

  // Type check and get semantic errors
  let typeChecker: ts.TypeChecker;
  typeChecker = program.getTypeChecker();
  // Generate output
  errors = program.emit().diagnostics;

  return {
    errors: errors.map((e) => {
      return {
        file: e.file.fileName,
        position: e.file.getLineAndCharacterOfPosition(e.start),
        length: e.length,
        message: ts.flattenDiagnosticMessageText(e.messageText, "\n")
      };
    }),
    program, typeChecker, script, sourceMaps, files
  };
}
