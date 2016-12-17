export const componentClassName = "Sup.TextRenderer";

export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  component.setText(config.text);
  component.setOptions({ alignment: config.alignment, verticalAlignment: config.verticalAlignment, size: config.size, color: config.color });
  if (config.overrideOpacity) component.opacity = config.opacity;

  if (config.fontAssetId != null) {
    const font = player.getOuterAsset(config.fontAssetId).__inner;
    if (!config.overrideOpacity) component.opacity = font.opacity;
    component.setFont(font);
  }
}
