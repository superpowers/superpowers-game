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
  nearClippingPlaneField: HTMLInputElement;
  farClippingPlaneField: HTMLInputElement;
  viewportFields: { x: HTMLInputElement; y: HTMLInputElement; width: HTMLInputElement; height: HTMLInputElement } =
    { x: null, y: null, width: null, height: null };

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    this.mode = config.mode;
    this.fov = config.fov;
    this.orthographicScale = config.orthographicScale;
    this.viewport = {
      x: config.viewport.x, y: config.viewport.y,
      width: config.viewport.width, height: config.viewport.height,
    };

    let modeRow = SupClient.table.appendRow(tbody, 'Mode');
    this.modeSelectBox = SupClient.table.appendSelectBox(modeRow.valueCell,
      { perspective: "Perspective", orthographic: "Orthographic" }, config.mode);

    let fovRow = SupClient.table.appendRow(tbody, 'Field of view');
    this.fovField = SupClient.table.appendNumberField(fovRow.valueCell, config.fov, 0.1, 179.9);

    let orthographicScaleRow = SupClient.table.appendRow(tbody, 'Orthographic scale');
    this.orthographicScaleField = SupClient.table.appendNumberField(orthographicScaleRow.valueCell, config.orthographicScale, 0.1);

    let nearClippingPlaneRow = SupClient.table.appendRow(tbody, 'Near plane');
    this.nearClippingPlaneField = SupClient.table.appendNumberField(nearClippingPlaneRow.valueCell, config.nearClippingPlane, 0.1);

    let farClippingPlaneRow = SupClient.table.appendRow(tbody, 'Far plane');
    this.farClippingPlaneField = SupClient.table.appendNumberField(farClippingPlaneRow.valueCell, config.farClippingPlane, 0.1);

    let viewportHeaderRow = document.createElement("tr");
    let headerTh = document.createElement("th");
    headerTh.textContent = "Viewport";
    headerTh.colSpan = 2;
    viewportHeaderRow.appendChild(headerTh);
    tbody.appendChild(viewportHeaderRow);

    let viewportXRow = SupClient.table.appendRow(tbody, 'X');
    this.viewportFields.x = SupClient.table.appendNumberField(viewportXRow.valueCell, config.viewport.x, 0, 1);
    this.viewportFields.x.step = "0.1";

    let viewportYRow = SupClient.table.appendRow(tbody, 'Y');
    this.viewportFields.y = SupClient.table.appendNumberField(viewportYRow.valueCell, config.viewport.y, 0, 1);
    this.viewportFields.y.step = "0.1";

    let widthRow = SupClient.table.appendRow(tbody, 'Width');
    this.viewportFields.width = SupClient.table.appendNumberField(widthRow.valueCell, config.viewport.width, 0, 1);
    this.viewportFields.width.step = "0.1";

    let heightRow = SupClient.table.appendRow(tbody, 'Height');
    this.viewportFields.height = SupClient.table.appendNumberField(heightRow.valueCell, config.viewport.height, 0, 1);
    this.viewportFields.height.step = "0.1";

    this.modeSelectBox.addEventListener('change', this._onChangeMode);
    this.fovField.addEventListener('input', this._onChangeFOV);
    this.orthographicScaleField.addEventListener('input', this._onChangeOrthographicScale);
    this.nearClippingPlaneField.addEventListener('change', this._onChangeNearClippingPlane);
    this.farClippingPlaneField.addEventListener('change', this._onChangeFarClippingPlane);
    this.viewportFields.x.addEventListener('input', this._onChangeViewportX);
    this.viewportFields.y.addEventListener('input', this._onChangeViewportY);
    this.viewportFields.width.addEventListener('input', this._onChangeViewportWidth);
    this.viewportFields.height.addEventListener('input', this._onChangeViewportHeight);
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    switch(path) {
      case 'mode': { this.modeSelectBox.value = value; break; }
      case 'fov': { this.fovField.value = value; break; }
      case 'orthographicScale': { this.orthographicScaleField.value = value; break; }
      case 'nearClippingPlane': { this.nearClippingPlaneField.value = value; break; }
      case 'farClippingPlane': { this.farClippingPlaneField.value = value; break; }
      case 'viewport.x': { this.viewportFields.x.value = value; break; }
      case 'viewport.y': { this.viewportFields.y.value = value; break; }
      case 'viewport.width': { this.viewportFields.width.value = value; break; }
      case 'viewport.height': { this.viewportFields.height.value = value; break; }
    }
  }

  _onChangeMode = (event: any) => { this.editConfig('setProperty', 'mode', event.target.value); }
  _onChangeFOV = (event: any) => { this.editConfig('setProperty', 'fov', parseFloat(event.target.value)); }
  _onChangeOrthographicScale = (event: any) => { this.editConfig('setProperty', 'orthographicScale', parseFloat(event.target.value)); }
  _onChangeNearClippingPlane = (event: any) => { this.editConfig('setProperty', 'nearClippingPlane', parseFloat(event.target.value)); }
  _onChangeFarClippingPlane = (event: any) => { this.editConfig('setProperty', 'farClippingPlane', parseFloat(event.target.value)); }
  _onChangeViewportX = (event: any) => { this.editConfig('setProperty', 'viewport.x', parseFloat(event.target.value)); }
  _onChangeViewportY = (event: any) => { this.editConfig('setProperty', 'viewport.y', parseFloat(event.target.value)); }
  _onChangeViewportWidth = (event: any) => { this.editConfig('setProperty', 'viewport.width', parseFloat(event.target.value)); }
  _onChangeViewportHeight = (event: any) => { this.editConfig('setProperty', 'viewport.height', parseFloat(event.target.value)); }
}
