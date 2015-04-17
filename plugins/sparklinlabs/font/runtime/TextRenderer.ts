export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.setText(config.text);
  if (config.fontAssetId != null) {
    var font = player.getOuterAsset(config.fontAssetId).__inner;
    component.setFont(font, {align: config.align, size: config.size, color: config.color});
  }
}
