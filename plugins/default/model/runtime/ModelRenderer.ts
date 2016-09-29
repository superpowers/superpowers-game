export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.castShadow = config.castShadow;
  component.receiveShadow = config.receiveShadow;
  if (config.overrideOpacity) component.opacity = config.opacity;
  const hex = parseInt(config.color, 16);
  component.color.r = (hex >> 16 & 255) / 255;
  component.color.g = (hex >> 8 & 255) / 255;
  component.color.b = (hex & 255) / 255;

  if (config.modelAssetId != null) {
    const model = player.getOuterAsset(config.modelAssetId);
    if (model == null) return;

    if (!config.overrideOpacity) component.opacity = model.__inner.opacity;

    let shader: any;
    if (config.materialType === "shader") {
      if (config.shaderAssetId != null) {
        const shaderAsset = player.getOuterAsset(config.shaderAssetId);
        if (shaderAsset == null) return;
        shader = shaderAsset.__inner;
      }
    }
    component.setModel(model.__inner, config.materialType, shader);

    if (config.animationId != null) {
      // FIXME: should we load model with SupCore.Data?
      for (const animation of model.__inner.animations) {
        if (animation.id === config.animationId) {
          component.setAnimation(animation.name);
          break;
        }
      }
    }
  }
}
