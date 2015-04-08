export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  if (config.spriteAssetId != null) {
    var sprite = player.getOuterAsset(config.spriteAssetId).__inner;
    component.setSprite(sprite);

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
