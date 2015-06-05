export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.castShadow = config.castShadow;
  component.receiveShadow = config.receiveShadow;
  if (config.overrideOpacity) component.opacity = config.opacity;
  let hex = parseInt(config.color, 16);
  component.color.r = (hex >> 16 & 255) / 255;
  component.color.g = (hex >> 8 & 255) / 255;
  component.color.b = (hex & 255) / 255;

  if (config.modelAssetId != null) {
    let model = player.getOuterAsset(config.modelAssetId).__inner;
    if (! config.overrideOpacity) component.opacity = model.opacity;
    component.setModel(model, config.materialType);

    if (config.animationId != null) {
      // FIXME: should we load model with SupCore.data?
      for (let animation of model.animations) {
        if (animation.id === config.animationId) {
          component.setAnimation(animation.name);
          break;
        }
      }
    }
  }
}
