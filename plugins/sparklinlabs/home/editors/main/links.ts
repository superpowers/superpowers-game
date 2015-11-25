if (SupClient.isApp) {
  let shell: GitHubElectron.Shell = (top as any).global.require("remote").require("shell");
  document.querySelector(".sidebar .links").addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;

    event.preventDefault();
    shell.openExternal(event.target.href);
  });
}
