import * as ts from "typescript";
import createLanguageService from "../../data/createLanguageService";
let fuzzy = require("fuzzy");

onmessage = (event) => {
  let service = createLanguageService(event.data.scriptNames, event.data.scripts, event.data.globalDefs);
  let list: string[] = [];

  if (event.data.tokenString !== "" && event.data.tokenString !== ";") {
    let completions = service.getCompletionsAtPosition(event.data.name, event.data.start);
    if (completions != null) {
      let rawList: string[] = [];
      for (let completion of completions.entries) rawList.push(completion.name);
      rawList.sort();

      event.data.tokenString = (event.data.tokenString !== ".") ? event.data.tokenString : "";
      let results = fuzzy.filter(event.data.tokenString, rawList);
      for (let result of results) list.push(result.original);
    }
  }
  (<any>postMessage)(list);
}
