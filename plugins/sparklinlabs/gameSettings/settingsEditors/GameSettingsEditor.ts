import GameSettingsResource from "../data/GameSettingsResource";

export default class GameSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: GameSettingsResource;

  startupSceneRow: SupClient.table.RowParts;
  fpsRow: SupClient.table.RowParts;
  ratioRow: SupClient.table.RowParts;
  customLayersRow: SupClient.table.RowParts;
  customLayers: string[];
  layerContainers: HTMLDivElement;

  fields: { [name: string]: HTMLInputElement } = {};

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    let { tbody } = SupClient.table.createTable(container);

    this.startupSceneRow = SupClient.table.appendRow(tbody, "Startup scene");
    this.fields["startupScene"] = SupClient.table.appendTextField(this.startupSceneRow.valueCell, "");

    this.fpsRow = SupClient.table.appendRow(tbody, "Frames per second");
    this.fields["framesPerSecond"] = SupClient.table.appendNumberField(this.fpsRow.valueCell, "");

    this.ratioRow = SupClient.table.appendRow(tbody, "Screen ratio");
    let ratioContainer = document.createElement("div");
    ratioContainer.className = "";
    this.ratioRow.valueCell.appendChild(ratioContainer);

    [ this.fields["ratioNumerator"], this.fields["ratioDenominator"] ] = SupClient.table.appendNumberFields(this.ratioRow.valueCell, [ "", "" ] );
    this.fields["ratioNumerator"].placeholder = "Width";
    this.fields["ratioDenominator"].placeholder = "Height";

    this.customLayersRow = SupClient.table.appendRow(tbody, "Custom layers");
    this.layerContainers = document.createElement("div");
    this.layerContainers.className = "list";
    this.customLayersRow.valueCell.appendChild(this.layerContainers);
    this.fields["defaultLayer"] = SupClient.table.appendTextField(this.layerContainers, "Default");
    this.fields["defaultLayer"].readOnly = true;

    for (let i = 0; i < GameSettingsResource.schema.customLayers.maxLength; i++) {
      let field = this.fields[`customLayer${i}`] = SupClient.table.appendTextField(this.layerContainers, "");
      (<any>field.dataset).customLayerIndex = i;
      field.addEventListener("change", this.onCustomLayerFieldChange);
    }

    this.fields["startupScene"].addEventListener("change", (event: any) => {
      let scene = (event.target.value !== "") ? event.target.value : null;
      this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "startupScene", scene, (err: string) => { if (err != null) alert(err); });
    });

    this.fields["framesPerSecond"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "framesPerSecond", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.fields["ratioNumerator"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "ratioNumerator", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.fields["ratioDenominator"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "ratioDenominator", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.projectClient.subResource("gameSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: GameSettingsResource) => {
    this.resource = resource;

    this._setupCustomLayers();

    for (let setting in resource.pub) {
      if (setting !== "customLayers") {
        this.fields[setting].value = resource.pub[setting];
      }
    }
  }
  
  _setupCustomLayers() {
    this.customLayers = this.resource.pub.customLayers.slice(0);
    for (let i = 0; i < GameSettingsResource.schema.customLayers.maxLength; i++) {
      let field = this.fields[`customLayer${i}`];
      if (i === this.customLayers.length) {
        field.placeholder = "New layer...";
        field.value = "";
      } else {
        field.placeholder = "";
      }
      
      if (i > this.customLayers.length) {
        if (field.parentElement != null) this.layerContainers.removeChild(field);
      } else {
        if (field.parentElement == null) this.layerContainers.appendChild(field);
        if (i < this.customLayers.length) field.value = this.customLayers[i];
      }
    }
  }

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    if (propertyName === "customLayers") this._setupCustomLayers();
    else this.fields[propertyName].value = this.resource.pub[propertyName];
  }
  
  onCustomLayerFieldChange = (event: any) => {
    let index = parseInt(<string>event.target.dataset.customLayerIndex);
    if (index > this.customLayers.length) return;
    
    if (index === this.customLayers.length) {
      if (event.target.value === "") return;
      this.customLayers.push(event.target.value);

    } else {
      if (event.target.value === "") {
        if (index === this.customLayers.length - 1) {
          this.customLayers.pop();
        } else {
          alert("Layer name cannot be empty");
          event.target.value = this.customLayers[index];
          return;
        }
      } else {
        this.customLayers[index] = event.target.value;
      }
    }

    this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "customLayers", this.customLayers, (err: string) => { if (err != null) alert(err); });
  }
}
