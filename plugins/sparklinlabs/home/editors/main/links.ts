if (SupClient.isApp) {
  document.querySelector(".sidebar .links").addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;

    event.preventDefault();
    window.parent.postMessage({ type: "openLink", content: event.target.href }, window.location.origin)
  });
}
