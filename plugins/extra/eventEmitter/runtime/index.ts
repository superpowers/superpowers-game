import { EventEmitter } from "events";

(<any>window)["EventEmitter"] = EventEmitter;
