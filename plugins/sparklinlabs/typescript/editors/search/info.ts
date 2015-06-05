import * as querystring from "querystring";

let qs = querystring.parse(window.location.search.slice(1));
let info = { projectId: qs.project };
export default info;
