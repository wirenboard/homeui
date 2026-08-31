/**
 * Whether clicking a cell's name copies its MQTT topic id.
 *
 * On a controller the id is the topic a rule or a dashboard would use, so the
 * copy is worth the click. A host with no broker — the standalone WASM
 * device editor drives cells from an in-browser loopback — has nowhere to
 * paste it, and "copied to clipboard" there is just a puzzling toast. Such a
 * host switches this off once at startup.
 */
export const topicCopyPolicy = {
  enabled: true,
};
