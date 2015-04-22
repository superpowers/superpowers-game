let nwDispatcher = (<any>window).nwDispatcher;
if (nwDispatcher != null) {
  let gui = nwDispatcher.requireNwGui();

  document.querySelector('.sidebar .links').addEventListener('click', (event: any) => {
    if (event.target.tagName !== 'A') return;

    event.preventDefault();
    gui.Shell.openExternal(event.target.href);
  });
}
