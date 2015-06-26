/// <reference path="typings/codemirror/codemirror.d.ts" />

interface EditCallback {
  (text: string, origin: string): void;
}
interface SendOperationCallback {
  (operation: OperationData): void;
}

interface TextEditorWidgetOptions {
  extraKeys: { [name: string]: string|Function };
  editCallback: EditCallback;
  sendOperationCallback: SendOperationCallback;
  saveCallback: Function;
}

declare class TextEditorWidget {
  codeMirrorInstance: CodeMirror.EditorFromTextArea;
  clientId: number;

  constructor(textArea: HTMLTextAreaElement, options: TextEditorWidgetOptions);
  setup(text: string): void;
  receiveEditText(operationData: OperationData): void;
  clear(): void;
}
