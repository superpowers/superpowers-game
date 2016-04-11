export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.setOrthographicMode(config.mode === "orthographic");
  component.setFOV(config.fov);
  component.setOrthographicScale(config.orthographicScale);
  component.setDepth(config.depth);
  component.setNearClippingPlane(config.nearClippingPlane);
  component.setFarClippingPlane(config.farClippingPlane);
  component.setViewport(config.viewport.x, config.viewport.y, config.viewport.width, config.viewport.height);
}
