ts = require "typescript"

module.exports = (sourceFileNames, sourceFiles, libSource, compilerOptions={}) ->
  compilerOptions.target ?= ts.ScriptTarget.ES5

  script = ""
  sourceMaps = {}
  files = []
  # Create a compilerHost object to allow the compiler to read and write files
  compilerHost =
    getSourceFile: (filename, languageVersion) =>
      if sourceFiles[filename]?
        return ts.createSourceFile filename, sourceFiles[filename], compilerOptions.target, "0"
      if filename == "lib.d.ts"
        return ts.createSourceFile filename, libSource, compilerOptions.target, "0"
      return null
    writeFile: (name, text, writeByteOrderMark) =>
      if name.slice(name.length - 4) == ".map"
        name = name.slice(0, name.length - 7)
        sourceMap = JSON.parse( text )
        sourceMap.sourcesContent = [sourceFiles["#{name}.ts"]]
        sourceMaps[name] = sourceMap
      else
        name = name.slice(0, name.length - 3)
        sourceMapText = "//# sourceMappingURL=#{name}.js.map"
        sourceMapEmpty = ""
        sourceMapEmpty += " " for i in [0...sourceMapText.length]
        text = text.replace( sourceMapText, sourceMapEmpty)

        files.push { name, text }
        script += "\n#{text}"

    getDefaultLibFilename: () => "lib.d.ts"
    useCaseSensitiveFileNames: () => false
    getCanonicalFileName: (filename) => filename
    getCurrentDirectory: () => ""
    getNewLine: () => "\n"

  # Create a program from inputs
  program = ts.createProgram sourceFileNames, compilerOptions, compilerHost
  # Query for early errors
  errors = program.getDiagnostics()
  # Do not generate code in the presence of early errors
  if errors.length == 0
    # Type check and get semantic errors
    typeChecker = program.getTypeChecker true
    errors = typeChecker.getDiagnostics()
    # Generate output
    typeChecker.emitFiles()

  return {
    errors: errors.map (e) => { file: e.file.filename, position: e.file.getLineAndCharacterFromPosition(e.start), length: e.length, message: e.messageText}
    program, typeChecker, script, sourceMaps, files
  }
