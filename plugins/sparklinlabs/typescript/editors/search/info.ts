import * as querystring from "querystring";

let qs = querystring.parse(window.location.search.slice(1));
let info = { projectId: qs.project, text: qs.text };
export default info;
