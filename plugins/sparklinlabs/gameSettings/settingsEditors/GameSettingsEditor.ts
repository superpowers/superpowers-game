import GameSettingsResource from "../data/GameSettingsResource";

export default class GameSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: GameSettingsResource;

  fpsRow: SupClient.table.RowParts;
  ratioRow: SupClient.table.RowParts;

  fields: { [name: string]: HTMLInputElement } = {};

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    let { tbody } = SupClient.table.createTable(container);

    this.fpsRow = SupClient.table.appendRow(tbody, "Frames per second");
    this.fields["framesPerSecond"] = SupClient.table.appendNumberField(this.fpsRow.valueCell, "");
    this.fpsRow.valueCell.colSpan = 2;

    this.ratioRow = SupClient.table.appendRow(tbody, "Screen ratio");
    this.fields["ratioNumerator"] = SupClient.table.appendNumberField(this.ratioRow.valueCell, "");
    this.fields["ratioNumerator"].placeholder = "Width";

    let heightValueCell = <HTMLTableDataCellElement>this.ratioRow.row.appendChild(document.createElement("td"));
    this.fields["ratioDenominator"] = SupClient.table.appendNumberField(heightValueCell, "");
    this.fields["ratioDenominator"].placeholder = "Height";

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

    for (let setting in resource.pub) {
      this.fields[setting].value = resource.pub[setting];
    }
  }

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    this.fields[propertyName].value = this.resource.pub[propertyName];
  }
}
