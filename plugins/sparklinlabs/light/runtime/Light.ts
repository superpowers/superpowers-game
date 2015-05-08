export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.setType(config.type);
  component.setColor(config.color);
  component.setIntensity(config.intensity);
  component.setDistance(config.distance);
  component.setTarget(config.target.x, config.target.y, config.target.z);
  component.setCastShadow(config.castShadow);
}
