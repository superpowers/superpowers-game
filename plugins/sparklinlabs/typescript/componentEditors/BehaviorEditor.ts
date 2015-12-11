import BehaviorPropertiesResource, { BehaviorProperty } from "../data/BehaviorPropertiesResource";

interface Config {
  behaviorName: string;
  propertyValues: { [name: string]: { value: any, type: string }; };
}

export default class BehaviorEditor {
  tbody: HTMLTableSectionElement;
  config: Config;
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  behaviorPropertiesResource: BehaviorPropertiesResource;

  behaviorNameField: HTMLSelectElement;
  behaviorPropertiesHeaderRow: HTMLTableRowElement;

  propertySettingsByName: { [name: string]: SupClient.table.RowParts };

  constructor(tbody: HTMLTableSectionElement, config: Config, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.config = config;
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    // Using a <select> rather than <input> + <datalist> because of bugs in Chrome and Electron
    // See https://trello.com/c/jNNRLgdb/651 and https://github.com/atom/electron/issues/360
    let behaviorNameRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:Behavior.class"));
    this.behaviorNameField = SupClient.table.appendSelectBox(behaviorNameRow.valueCell, { "": SupClient.i18n.t("common:none") });
    this.behaviorNameField.addEventListener("change", this.onChangeBehaviorName);

    SupClient.table.appendHeader(this.tbody, SupClient.i18n.t("componentEditors:Behavior.customizableProperties"));

    this.propertySettingsByName = {};

    this.projectClient.subResource("behaviorProperties", this);
  }

  destroy() { this.projectClient.unsubResource("behaviorProperties", this); }

  onResourceReceived = (resourceId: string, resource: BehaviorPropertiesResource) => {
    this.behaviorPropertiesResource = resource;
    this._buildBehaviorPropertiesUI();
  };

  onResourceEdited = (resourceId: string, command: string, ...args: any[]) => {
    if (command === "setScriptBehaviors" || command === "clearScriptBehaviors") this._buildBehaviorPropertiesUI();
  };

  _buildBehaviorPropertiesUI() {
    // Setup behavior list
    while (this.behaviorNameField.childElementCount > 1) this.behaviorNameField.removeChild(this.behaviorNameField.lastElementChild);

    let behaviorNames = Object.keys(this.behaviorPropertiesResource.pub.behaviors);
    behaviorNames.sort();
    for (let behaviorName of behaviorNames) {
      SupClient.table.appendSelectOption(this.behaviorNameField, behaviorName, behaviorName);
    }

    if (this.config.behaviorName.length > 0 && this.behaviorPropertiesResource.pub.behaviors[this.config.behaviorName] == null) {
      SupClient.table.appendSelectOption(this.behaviorNameField, this.config.behaviorName, `(Missing) ${this.config.behaviorName}`);
    }

    this.behaviorNameField.value = this.config.behaviorName;

    // Clear old property settings
    for (let name in this.propertySettingsByName) {
      let propertySetting = this.propertySettingsByName[name];
      propertySetting.row.parentElement.removeChild(propertySetting.row);
    }

    this.propertySettingsByName = {};

    // Setup new property settings
    let behaviorName = this.config.behaviorName;

    let listedProperties: string[] = [];

    while (behaviorName != null) {
      let behavior = this.behaviorPropertiesResource.pub.behaviors[behaviorName];
      if(behavior == null) break;

      for (let property of behavior.properties) {
        if(listedProperties.indexOf(property.name) !== -1) continue;

        listedProperties.push(property.name);
        this._createPropertySetting(property);
      }
      behaviorName = behavior.parentBehavior;
    }

    // TODO: Display and allow cleaning up left-over property values
  }

  _createPropertySetting(property: {name: string; type: string}) {
    let propertySetting = SupClient.table.appendRow(this.tbody, property.name, { checkbox: true, title: `${property.name} (${property.type})` });
    this.propertySettingsByName[property.name] = propertySetting;
    this._createPropertyField(property.name);

    propertySetting.checkbox.checked = this.config.propertyValues[property.name] != null;
    propertySetting.checkbox.addEventListener("change", (event: any) => {
      if (!event.target.checked) {
        this.editConfig("clearBehaviorPropertyValue", property.name);
        return;
      }

      // defaultValue = property.value someday
      let defaultValue: any;
      switch (property.type) {
        case "boolean": defaultValue = false; break;
        case "number": defaultValue = 0; break;
        case "string": defaultValue = ""; break;
        case "Sup.Math.Vector2": defaultValue = { x: 0, y: 0 }; break;
        case "Sup.Math.Vector3": defaultValue = { x: 0, y: 0, z: 0 }; break;
        // TODO: Support more types
        default: defaultValue = null; break;
      }

      this.editConfig("setBehaviorPropertyValue", property.name, property.type, defaultValue);
    });
  }

  _createPropertyField(propertyName: string) {
    let behaviorName = this.config.behaviorName;
    let property: BehaviorProperty;
    while (behaviorName != null) {
      let behavior = this.behaviorPropertiesResource.pub.behaviors[behaviorName];

      property = this.behaviorPropertiesResource.propertiesByNameByBehavior[behaviorName][propertyName];
      if (property != null) break;

      behaviorName = behavior.parentBehavior;
    }

    let propertySetting = this.propertySettingsByName[propertyName];

    // TODO: We probably want to collect and display default values?
    // defaultPropertyValue = behaviorProperty?.value

    let propertyValue: any = null;
    let uiType = property.type;

    let propertyValueInfo = this.config.propertyValues[property.name];
    if (propertyValueInfo != null) {
      propertyValue = propertyValueInfo.value;
      if (propertyValueInfo.type !== property.type) uiType = "incompatibleType";
    }

    let propertyFields: HTMLInputElement[];
    switch (uiType) {
      case "incompatibleType": {
        let propertyField = <HTMLInputElement>propertySetting.valueCell.querySelector("input[type=text]");
        if (propertyField == null) {
          propertySetting.valueCell.innerHTML = "";
          propertyField = SupClient.table.appendTextField(propertySetting.valueCell, "");
          propertyField.addEventListener("change", this.onChangePropertyValue);
        }

        propertyField.value = `(Incompatible type: ${propertyValueInfo.type})`;
        propertyField.disabled = true;

        propertyFields = [ propertyField ];
      } break;

      case "boolean": {
        let propertyField = <HTMLInputElement>propertySetting.valueCell.querySelector("input[type=checkbox]");
        if (propertyField == null) {
          propertySetting.valueCell.innerHTML = "";
          propertyField = SupClient.table.appendBooleanField(propertySetting.valueCell, false);
          propertyField.addEventListener("change", this.onChangePropertyValue);
        }

        propertyField.checked = propertyValue;
        propertyField.disabled = propertyValueInfo == null;

        propertyFields = [ propertyField ];
      } break;

      case "number": {
        let propertyField = <HTMLInputElement>propertySetting.valueCell.querySelector("input[type=number]");
        if (propertyField == null) {
          propertySetting.valueCell.innerHTML = "";
          propertyField = SupClient.table.appendNumberField(propertySetting.valueCell, 0);
          propertyField.addEventListener("change", this.onChangePropertyValue);
        }

        propertyField.value = propertyValue;
        propertyField.disabled = propertyValueInfo == null;

        propertyFields = [ propertyField ];
      } break;

      case "string": {
        let propertyField = <HTMLInputElement>propertySetting.valueCell.querySelector("input[type=text]");
        if (propertyField == null) {
          propertySetting.valueCell.innerHTML = "";
          propertyField = SupClient.table.appendTextField(propertySetting.valueCell, "");
          propertyField.addEventListener("change", this.onChangePropertyValue);
        }

        propertyField.value = propertyValue;
        propertyField.disabled = propertyValueInfo == null;

        propertyFields = [ propertyField ];
      } break;

      case "Sup.Math.Vector2":
      case "Sup.Math.Vector3": {
        let vectorContainer = <HTMLDivElement>propertySetting.valueCell.querySelector(".inputs");
        if (vectorContainer == null) {
          propertySetting.valueCell.innerHTML = "";
          let defaultValues = uiType === "Sup.Math.Vector3" ? [ 0, 0, 0 ] : [ 0, 0 ];
          propertyFields = SupClient.table.appendNumberFields(propertySetting.valueCell, defaultValues);

          for (let field of propertyFields) field.addEventListener("change", this.onChangePropertyValue);
        } else {
          propertyFields = Array.prototype.slice.call(vectorContainer.querySelectorAll("input"));
        }

        propertyFields[0].value = (propertyValue != null) ? propertyValue.x : "";
        propertyFields[1].value = (propertyValue != null) ? propertyValue.y : "";
        if (uiType === "Sup.Math.Vector3") propertyFields[2].value = (propertyValue != null) ? propertyValue.z : "";
        for (let field of propertyFields) field.disabled = propertyValueInfo == null;
      } break;

      // TODO: Support more types
      default: {
        propertySetting.valueCell.innerHTML = "";
        console.error(`Unsupported property type: ${property.type}`);
        return;
      }
    }

    for (let field of propertyFields) {
      field.dataset["behaviorPropertyName"] = property.name;
      field.dataset["behaviorPropertyType"] = property.type;
    }
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "behaviorName": {
        this.behaviorNameField.value = value;
        this._buildBehaviorPropertiesUI();
        break;
      }
    }
  }

  config_setBehaviorPropertyValue(name: string, type: string, value: any) {
    this.propertySettingsByName[name].checkbox.checked = true;

    this._createPropertyField(name);
  }

  config_clearBehaviorPropertyValue(name: string) {
    this.propertySettingsByName[name].checkbox.checked = false;
    this._createPropertyField(name);
  }

  private onChangeBehaviorName = (event: any) => { this.editConfig("setProperty", "behaviorName", event.target.value); };

  // private onChangePropertySet = (event: any) => {}

  private onChangePropertyValue = (event: any) => {
    let propertyName = event.target.dataset.behaviorPropertyName;
    let propertyType = event.target.dataset.behaviorPropertyType;
    let propertyValue: any;

    switch (propertyType) {
      case "boolean": propertyValue = event.target.checked; break;
      case "number": propertyValue = parseFloat(event.target.value); break;
      case "string": propertyValue = event.target.value; break;
      case "Sup.Math.Vector2":
      case "Sup.Math.Vector3": {
        let parent =  (<HTMLDivElement>event.target.parentElement);
        propertyValue = {
          x: parseFloat((<HTMLInputElement>parent.children[0]).value),
          y: parseFloat((<HTMLInputElement>parent.children[1]).value)
        };

        if (propertyType === "Sup.Math.Vector3") propertyValue.z = parseFloat((<HTMLInputElement>parent.children[2]).value);
      } break;
      default: console.error(`Unsupported property type: ${propertyType}`); break;
    }

    this.editConfig("setBehaviorPropertyValue", propertyName, propertyType, propertyValue, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  };
}
