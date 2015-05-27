export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.castShadow = config.castShadow;
  component.receiveShadow = config.receiveShadow;
  component.color = config.color;

  if (config.modelAssetId != null) {
    let model = player.getOuterAsset(config.modelAssetId).__inner;
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
