export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.__outer.type = ["ambient", "point", "spot", "directional"].indexOf(config.type)
  component.color = parseInt(config.color, 16);
  component.intensity = config.intensity;
  component.distance = config.distance;
  component.angle = config.angle;
  component.target.set(config.target.x, config.target.y, config.target.z);
  component.castShadow = config.castShadow;
  component.shadowMapWidth = config.shadowMapSize.width;
  component.shadowMapHeight = config.shadowMapSize.height;
  component.shadowBias = config.shadowBias;
  component.shadowDarkness = config.shadowDarkness;
  component.shadowCameraNear = config.shadowCameraNearPlane;
  component.shadowCameraFar = config.shadowCameraFarPlane;
  component.shadowCameraFov = config.shadowCameraFov;
  component.shadowCameraLeft = config.shadowCameraSize.left;
  component.shadowCameraRight = config.shadowCameraSize.right;
  component.shadowCameraTop = config.shadowCameraSize.top;
  component.shadowCameraBottom = config.shadowCameraSize.bottom;

  component.setType(config.type);
}
