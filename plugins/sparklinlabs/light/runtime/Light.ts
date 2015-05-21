export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.__outer.type = ["ambient", "point", "spot", "directional"].indexOf(config.type)
  component.setType(config.type);
  component.setColor(config.color);
  component.setIntensity(config.intensity);
  component.setDistance(config.distance);
  component.setAngle(config.angle);
  component.setTarget(config.target.x, config.target.y, config.target.z);
  component.setCastShadow(config.castShadow);
}
