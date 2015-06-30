/// <reference path="typings/codemirror/codemirror.d.ts" />
/// <reference path="./operational-transform.d.ts" />

interface EditCallback {
  (text: string, origin: string): void;
}
interface SendOperationCallback {
  (operation: OperationData): void;
}

interface TextEditorWidgetOptions {
  extraKeys?: { [name: string]: string|Function };
  editCallback?: EditCallback;
  mode: string;
  sendOperationCallback: SendOperationCallback;
  saveCallback: Function;
}

declare class TextEditorWidget {
  codeMirrorInstance: CodeMirror.EditorFromTextArea;
  clientId: number;

  constructor(projectClient: SupClient.ProjectClient,textArea: HTMLTextAreaElement, options: TextEditorWidgetOptions);
  setup(text: string): void;
  receiveEditText(operationData: OperationData): void;
  clear(): void;
}
