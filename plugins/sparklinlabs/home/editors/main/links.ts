if (SupClient.isApp) {
  let electron: GitHubElectron.Electron = (top as any).global.require("electron");
  document.querySelector(".sidebar .links").addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;

    event.preventDefault();
    electron.shell.openExternal(event.target.href);
  });
}
