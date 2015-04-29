export default class CameraEditor {
  projectClient: SupClient.ProjectClient
  editConfig: any

  mode: string;
  fov: number;
  orthographicScale: number;
  viewport: { x: number; y: number; width: number; height: number; };

  modeSelectBox: HTMLSelectElement;
  fovField: HTMLInputElement;
  orthographicScaleField: HTMLInputElement;

  constructor(tbody: HTMLDivElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    this.mode = config.mode;
    this.fov = config.fov;
    this.orthographicScale = config.orthographicScale;
    this.viewport = {
      x: config.viewport.x, y: config.viewport.y,
      width: config.viewport.width, height: config.viewport.height,
    };

    let modeRow = SupClient.component.createSetting(tbody, 'Mode');
    this.modeSelectBox = SupClient.component.createSelectBox(modeRow.valueElt,
      { perspective: "Perspective", orthographic: "Orthographic" }, config.mode);

    let fovRow = SupClient.component.createSetting(tbody, 'Field of view');
    this.fovField = SupClient.component.createNumberField(fovRow.valueElt, config.fov, 0.1, 179.9);

    let orthographicScaleRow = SupClient.component.createSetting(tbody, 'Orthographic scale');
    this.orthographicScaleField = SupClient.component.createNumberField(orthographicScaleRow.valueElt, config.orthographicScale, 0.1);

    this.modeSelectBox.addEventListener('change', this._onChangeMode);
    this.fovField.addEventListener('change', this._onChangeFOV);
    this.orthographicScaleField.addEventListener('change', this._onChangeOrthographicScale);
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    switch(path) {
      case 'mode': { this.modeSelectBox.value = value; break }
      case 'fov': { this.fovField.value = value; break }
      case 'orthographicScale': { this.orthographicScaleField.value = value; break }
    }
  }

  _onChangeMode = (event: any) => { this.editConfig('setProperty', 'mode', event.target.value); }
  _onChangeFOV = (event: any) => { this.editConfig('setProperty', 'fov', parseFloat(event.target.value)); }
  _onChangeOrthographicScale = (event: any) => { this.editConfig('setProperty', 'orthographicScale', parseFloat(event.target.value)); }
}
