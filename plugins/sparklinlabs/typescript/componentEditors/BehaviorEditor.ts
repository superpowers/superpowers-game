import BehaviorPropertiesResource from "../data/BehaviorPropertiesResource";

let behaviorEditorDataListIndex = 0;

interface Config {
  behaviorName: string;
  propertyValues: { [name: string]: { value: any, type: string }; }
}

export default class BehaviorEditor {
  tbody: HTMLDivElement;
  config: Config;
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  behaviorName: string;
  behaviorPropertiesResource: BehaviorPropertiesResource

  behaviorNamesDataListElt: HTMLDataListElement;
  behaviorNameField: HTMLInputElement;
  behaviorPropertiesHeaderRow: HTMLTableRowElement;

  propertySettingsByName: {[name: string]: {
    rowElt: HTMLTableRowElement;
    keyElt: HTMLTableHeaderCellElement;
    valueElt: HTMLTableDataCellElement;
    checkboxElt: HTMLInputElement;
  }};

  constructor(tbody: HTMLDivElement, config: Config, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.config = config;
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    this.behaviorName = this.config.behaviorName;

    this.behaviorNamesDataListElt = document.createElement("datalist");
    this.behaviorNamesDataListElt.id = `behavior-editor-datalist-${behaviorEditorDataListIndex++}`;
    this.tbody.appendChild(this.behaviorNamesDataListElt);

    let behaviorNameRow = SupClient.component.createSetting(this.tbody, "Class");
    this.behaviorNameField = SupClient.component.createTextField(behaviorNameRow.valueElt, this.config.behaviorName);
    this.behaviorNameField.setAttribute("list", this.behaviorNamesDataListElt.id);
    this.behaviorNameField.addEventListener("change", this._onChangeBehaviorName);

    this.behaviorPropertiesHeaderRow = document.createElement("tr");
    let headerTh = document.createElement("th");
    headerTh.textContent = "Customizable properties";
    headerTh.colSpan = 2;
    this.behaviorPropertiesHeaderRow.appendChild(headerTh);
    this.tbody.appendChild(this.behaviorPropertiesHeaderRow);

    this.propertySettingsByName = {};

    this.projectClient.subResource("behaviorProperties", this);
  }

  destroy() { this.projectClient.unsubResource("behaviorProperties", this); }

  onResourceReceived = (resourceId: string, resource: BehaviorPropertiesResource) => {
    this.behaviorPropertiesResource = resource
    this._buildBehaviorPropertiesUI()
  }

  onResourceEdited = (resourceId: string, command: string, ...args: any[]) => {
    if (command === "setScriptBehaviors" || command === "clearScriptBehaviors") this._buildBehaviorPropertiesUI()
  }

  _buildBehaviorPropertiesUI() {
    // Setup behavior list
    this.behaviorNamesDataListElt.innerHTML = "";
    for (let behaviorName in this.behaviorPropertiesResource.pub.behaviors) {
      let option = document.createElement("option");
      option.value = behaviorName;
      option.textContent = behaviorName;
      this.behaviorNamesDataListElt.appendChild(option);
    }

    // Clear old property settings
    for (let name in this.propertySettingsByName) {
      let propertySetting = this.propertySettingsByName[name];
      propertySetting.rowElt.parentElement.removeChild(propertySetting.rowElt);
    }

    this.propertySettingsByName = {};

    // Setup new property settings
    let behavior = this.behaviorPropertiesResource.pub.behaviors[this.config.behaviorName]
    if (behavior == null) return;

    for (let property of behavior.properties) this._createPropertySetting(property);

    // TODO: Display and allow cleaning up left-over property values
  }

  _createPropertySetting(property: {name: string; type: string}) {
    let propertySetting = SupClient.component.createSetting(this.tbody, property.name, { checkbox: true, title: `${property.name} (${property.type})` });
    this.propertySettingsByName[property.name] = propertySetting;
    this._createPropertyField(property.name);

    propertySetting.checkboxElt.checked = this.config.propertyValues[property.name] != null;
    propertySetting.checkboxElt.addEventListener("change", (event: any) => {
      if (! event.target.checked) {
        this.editConfig("clearBehaviorPropertyValue", property.name);
        return;
      }

      // defaultValue = property.value someday
      let defaultValue: any;
      switch (property.type) {
        case "boolean": { defaultValue = false; break; }
        case "number": { defaultValue = 0; break; }
        case "string": { defaultValue = ""; break; }
        // TODO: Support more types
        default: { defaultValue = null; break; }
      }

      this.editConfig("setBehaviorPropertyValue", property.name, property.type, defaultValue);
    });
  }

  _createPropertyField(propertyName: string) {
    let property = this.behaviorPropertiesResource.propertiesByNameByBehavior[this.config.behaviorName][propertyName];
    let propertySetting = this.propertySettingsByName[propertyName];

    // TODO: We probably want to collect and display default values?
    // defaultPropertyValue = behaviorProperty?.value

    let propertyValue: any = null;
    let uiType = property.type;

    let propertyValueInfo = this.config.propertyValues[property.name];
    if (propertyValueInfo != null) {
      propertyValue = propertyValueInfo.value;
      if (propertyValueInfo.type != property.type) uiType = "incompatibleType";
    }

    let propertyField: HTMLInputElement;
    switch (uiType) {
      case "incompatibleType": {
        propertyField = <HTMLInputElement>propertySetting.valueElt.querySelector("input[type=text]");
        if (propertyField == null) {
          propertySetting.valueElt.innerHTML = "";
          propertyField = SupClient.component.createTextField(propertySetting.valueElt, "");
          propertyField.addEventListener("change", this._onChangePropertyValue);
        }

        propertyField.value = `(Incompatible type: ${propertyValueInfo.type})`;
        propertyField.disabled = true;
        break;
      }

      case "boolean": {
        propertyField = <HTMLInputElement>propertySetting.valueElt.querySelector("input[type=checkbox]");
        if (propertyField == null) {
          propertySetting.valueElt.innerHTML = "";
          propertyField = SupClient.component.createBooleanField(propertySetting.valueElt, false);
          propertyField.addEventListener("change", this._onChangePropertyValue);
        }

        propertyField.checked = propertyValue;
        propertyField.disabled = propertyValueInfo == null;
        break;
      }

      case "number": {
        propertyField = <HTMLInputElement>propertySetting.valueElt.querySelector("input[type=number]");
        if (propertyField == null) {
          propertySetting.valueElt.innerHTML = "";
          propertyField = SupClient.component.createNumberField(propertySetting.valueElt, 0);
          propertyField.addEventListener("change", this._onChangePropertyValue);
        }

        propertyField.value = propertyValue;
        propertyField.disabled = propertyValueInfo == null;
        break;
      }

      case "string": {
        propertyField = <HTMLInputElement>propertySetting.valueElt.querySelector("input[type=text]");
        if (propertyField == null) {
          propertySetting.valueElt.innerHTML = "";
          propertyField = SupClient.component.createTextField(propertySetting.valueElt, "");
          propertyField.addEventListener("change", this._onChangePropertyValue);
        }

        propertyField.value = propertyValue;
        propertyField.disabled = propertyValueInfo == null;
        break;
      }

      // TODO: Support more types
      default: {
        propertySetting.valueElt.innerHTML = "";
        console.error(`Unsupported property type: ${property.type}`);
        return;
      }
    }
    (<any>propertyField.dataset).behaviorPropertyName = property.name;
    (<any>propertyField.dataset).behaviorPropertyType = property.type;
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
    this.propertySettingsByName[name].checkboxElt.checked = true;

    this._createPropertyField(name);
  }

  config_clearBehaviorPropertyValue(name: string) {
    this.propertySettingsByName[name].checkboxElt.checked = false;
    this._createPropertyField(name);
  }

  _onChangeBehaviorName = (event: any) => { this.editConfig("setProperty", "behaviorName", event.target.value); }

  // _onChangePropertySet = (event: any) => {}

  _onChangePropertyValue = (event: any) => {
    let propertyName = event.target.dataset.behaviorPropertyName;
    let propertyType = event.target.dataset.behaviorPropertyType;
    let propertyValue: any;

    switch (propertyType) {
      case "boolean": { propertyValue = event.target.checked; break; }
      case "number": { propertyValue = parseFloat(event.target.value); break }
      case "string": { propertyValue = event.target.value; break }
      default: { console.error(`Unsupported property type: ${propertyType}`); break }
    }

    this.editConfig("setBehaviorPropertyValue", propertyName, propertyType, propertyValue, (err: string) => {
      if (err != null) alert(err);
    });
  }
}
