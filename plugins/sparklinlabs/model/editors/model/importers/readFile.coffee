module.exports = (file, type, callback) ->
  reader = new FileReader

  reader.onload = (event) ->
    switch type
      when 'json'
        try
          result = JSON.parse(event.target.result)
        catch err then callback err; return
      else
        result = event.target.result

    callback null, result; return

  switch type
    when 'text', 'json' then reader.readAsText file
    when 'arraybuffer' then reader.readAsArrayBuffer file
    else throw new Error "Unsupported readFile type: #{type}"

  return
