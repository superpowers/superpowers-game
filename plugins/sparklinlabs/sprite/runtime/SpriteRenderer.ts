export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.castShadow = config.castShadow;
  component.receiveShadow = config.receiveShadow;
  if (config.overrideOpacity) component.opacity = config.opacity;
  let hex = parseInt(config.color, 16);
  component.color.r = (hex >> 16 & 255) / 255;
  component.color.g = (hex >> 8 & 255) / 255;
  component.color.b = (hex & 255) / 255;
  component.horizontalFlip = config.horizontalFlip;
  component.verticalFlip = config.verticalFlip;

  if (config.spriteAssetId != null) {
    let sprite = player.getOuterAsset(config.spriteAssetId);
    if (sprite == null) return;

    if (! config.overrideOpacity) component.opacity = sprite.__inner.opacity;

    let shader: any;
    if (config.materialType === "shader" && config.shaderAssetId != null) {
      shader = player.getOuterAsset(config.shaderAssetId);
      if (shader == null) return;
    }
    component.setSprite(sprite.__inner, config.materialType, shader.__inner);

    if (config.animationId != null) {
      // FIXME: should we load sprite with SupCore.data?
      sprite.__inner.animations.every((animation: any) => {
        if (animation.id === config.animationId) {
          component.setAnimation(animation.name);
          return false;
        }
        else return true;
      });
    }
  }
}
