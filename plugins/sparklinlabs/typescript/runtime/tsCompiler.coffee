ts = require "typescript"

module.exports = (sourceFileNames, sourceFiles, libSource, compilerOptions={}) ->
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

        files.push( { name, text} )
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
  if !errors.length
    # Type check and get semantic errors
    checker = program.getTypeChecker true
    errors = checker.getDiagnostics()
    # Generate output
    checker.emitFiles()

  return {
    errors: errors.map (e) => "#{e.file.filename}(#{e.file.getLineAndCharacterFromPosition(e.start).line}): #{e.messageText}"
    script
    sourceMaps
    files
  }
