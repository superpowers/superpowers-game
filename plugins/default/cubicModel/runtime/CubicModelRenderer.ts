export const componentClassName = "Sup.CubicModelRenderer";

export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  // component.castShadow = config.castShadow;
  // component.receiveShadow = config.receiveShadow;
  // if (config.overrideOpacity) component.opacity = config.opacity;
  // const hex = parseInt(config.color, 16);
  // component.color.r = (hex >> 16 & 255) / 255;
  // component.color.g = (hex >> 8 & 255) / 255;
  // component.color.b = (hex & 255) / 255;
  // component.horizontalFlip = config.horizontalFlip;
  // component.verticalFlip = config.verticalFlip;

  if (config.cubicModelAssetId != null) {
    const cubicModel = player.getOuterAsset(config.cubicModelAssetId);
    if (cubicModel == null) return;

    if (!config.overrideOpacity) component.opacity = cubicModel.__inner.opacity;

    let shader: any;
    if (config.materialType === "shader") {
      if (config.shaderAssetId != null) {
        const shaderAsset = player.getOuterAsset(config.shaderAssetId);
        if (shaderAsset == null) return;
        shader = shaderAsset.__inner;
      }
    }
    component.setCubicModel(cubicModel.__inner, config.materialType, shader);

    if (config.animationId != null) {
      // FIXME: should we load cubicModel with SupCore.Data?
      cubicModel.__inner.animations.every((animation: any) => {
        if (animation.id === config.animationId) {
          component.setAnimation(animation.name);
          return false;
        }
        else return true;
      });
    }
  }
}
