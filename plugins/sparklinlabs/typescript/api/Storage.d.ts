declare module Sup {
  module Storage {
    function set(key: string, value: string): void;
    function get(key: string): string;
    function remove(key: string): void;
    function clear(): void;
  }
}
