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
    let sprite = player.getOuterAsset(config.spriteAssetId).__inner;
    if (! config.overrideOpacity) component.opacity = sprite.opacity;
    component.setSprite(sprite, config.materialType);

    if (config.animationId != null) {
      // FIXME: should we load sprite with SupCore.data?
      sprite.animations.every((animation: any) => {
        if (animation.id === config.animationId) {
          component.setAnimation(animation.name);
          return false;
        }
        else return true;
      });
    }
  }
}
