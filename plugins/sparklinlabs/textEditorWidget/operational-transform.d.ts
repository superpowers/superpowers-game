declare module "operational-transform" {
  class Document {
    text: string;
    operations: TextOperation[];

    constructor(text: string, revisionId: number);
    apply(operation: TextOperation, revision: number): TextOperation;
    getRevisionId(): number;
  }

  class TextOperation {
    userId: number;
    ops: TextOp[];

    baseLength: number;
    targetLength: number;

    constructor(userId?: number);
    serialize(): OperationData;
    deserialize(data: OperationData): void;
    retain(amount: number): void;
    insert(text: string): void;
    delete(text: string): void;
    apply(text: string): string;
    invert(): TextOperation;
    clone(): TextOperation;
    equal(otherOperation: TextOperation): boolean;
    compose(otherOperation: TextOperation): TextOperation;
    transform(otherOperation: TextOperation): TextOperation[];
    gotPriority(otherId: number): boolean;
  }

  class TextOp {
    type: string;
    attributes: any;

    constructor(type: string, attributes: any);
  }
}

interface OperationData {
  userId: number;
  ops: Array<{type: string; attributes: any}>;
}
