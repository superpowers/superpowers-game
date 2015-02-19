ts = require "typescript"

module.exports = (fileNames, files, libSource, compilerOptions={}) ->
  script = ""
  # Create a compilerHost object to allow the compiler to read and write files
  compilerHost =
    getSourceFile: (filename, languageVersion) =>
      if files[filename]?
        return ts.createSourceFile filename, files[filename], compilerOptions.target, "0"
      if filename == "lib.d.ts"
        return ts.createSourceFile filename, libSource, compilerOptions.target, "0"
      return null
    writeFile: (name, text, writeByteOrderMark) => script += text; return
    getDefaultLibFilename: () => "lib.d.ts"
    useCaseSensitiveFileNames: () => false
    getCanonicalFileName: (filename) => filename
    getCurrentDirectory: () => ""
    getNewLine: () => "\n"
    
  # Create a program from inputs
  program = ts.createProgram fileNames, compilerOptions, compilerHost
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
    script: script
  }
