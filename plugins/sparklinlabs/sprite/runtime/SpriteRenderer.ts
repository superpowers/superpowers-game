export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  if (config.spriteAssetId != null) {
    let sprite = player.getOuterAsset(config.spriteAssetId).__inner;
    component.castShadow = config.castShadow;
    component.receiveShadow = config.receiveShadow;
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
