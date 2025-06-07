class EventsCtrl {
  constructor($rootScope, $scope, $stateParams, $state, eventsConfig, $translate, $locale, DeviceData) {
    'ngInject';

    this.$state = $state;
    this.$scope = $scope;
    this.$locale = $locale;
    this.eventsConfig = eventsConfig;
    this.DeviceData = DeviceData;
    this.$translate = $translate;

    // Allow table to save events on page load
    $rootScope.firstBootstrap = false;

    this.fullscreen = $stateParams.fullscreen || false;

    // Initialization of triggered events array
    this.triggeredEvents = [];

    // Array of events retrieved from eventsEditCtrl
    // Read-only in this file
    this.events = [];

    // Events initialization from file
    this.eventsConfig.whenReady().then(data => {
      this.triggeredEvents = data.triggeredEvents.map(event => this.transformEvent(event));
      this.events = data.events;
      console.log("[LOG]: Events in EventsCtrl: %o", this.events);
      console.log("[LOG]: Triggered Events: %o", this.triggeredEvents);

      this.updateTranslations();
      this.updateEvents();
    });

    // Clean up
    $scope.$on('$destroy', () => {
      console.log("[LOG]: Leaving events, saving...");
      this.saveEvents();

      this.$scope = null;
    });
  }

  updateEvents() {
    if (!this.events.length) return;

    console.log("[LOG]: Updating events...");
    this.events.map(
      event => {
        console.log("[LOG]: Now processing event: %o", event);
        if (this.checkCondition(event)) {
          console.log("[LOG]: Condition passed");
          console.log("[LOG]: New event triggered, pushing to triggeredEvents");
          this.triggeredEvents.unshift(this.transformEvent(event));
        }
      }
    );


    // Post-checking work
    console.log("[LOG]: Done checking events, saving...");
    this.trimEvents();
    this.saveEvents();
  }

  checkCondition(event) {
    const parts = event.condition.split(' ').filter(p => p);
    const sign = parts[0] == "=" ? "==" : parts[0];
    const comparable = parts[1];
    const eventCellId = event.topic.deviceId + '/' + event.topic.controlId;
    const eventValue = this.DeviceData.cell(eventCellId)._value;

    console.log("[LOG]: Parts of the condition: %o", parts);
    console.log("[LOG]: Event value: %s", eventValue);
    console.log("[LOG]: Will eval: %s", eventValue + sign + comparable);

    return eval(eventValue + sign + comparable);
  }

  trimEvents() {
    const maxEvents = 2000;
    if (this.triggeredEvents.length > maxEvents) {
      this.triggeredEvents = this.triggeredEvents.slice(0, maxEvents);
      console.log(`[LOG]: Events were trimmed to ${maxEvents}`);
    }
  }

  clearEvents() {
    this.triggeredEvents = [];
    console.log("[LOG]: Events were cleared");
    this.saveEvents();
  }

  deleteEvent(index) {
    console.log("[LOG]: Deleting event: %o", this.triggeredEvents[index]);
    this.triggeredEvents.splice(index, 1);
    this.saveEvents();
  }

  saveEvents() {
    this.eventsConfig.whenReady().then(data => {
      data.triggeredEvents = this.triggeredEvents.map(event => {
        // Saving without name so it's calcuated during runtime
        const triggeredEvent = {
          "topic": {
            "deviceId": event.topic.deviceId,
            "controlId": event.topic.controlId,
          },
          "message": event.message,
          "timestamp": event.timestamp ? event.timestamp : this.formatTimestamp(Date.now()),
        };

        return triggeredEvent;
      });
    });
    console.log("[LOG]: Events saved by method: %o", this.triggeredEvents);
  }

  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  transformEvent(event) {
    const name = this.getTranslatedControlName(event.topic.deviceId, event.topic.controlId);
    const triggeredEvent = {
      "topic": {
        "name": name,
        "deviceId": event.topic.deviceId,
        "controlId": event.topic.controlId,
      },
      "message": event.message,
      "timestamp": event.timestamp ? event.timestamp : this.formatTimestamp(Date.now()),
    };

    return triggeredEvent;
  }

  getTranslatedControlName(deviceId, controlId) {
    const device = this.DeviceData.devices[deviceId];
    const cellId = deviceId + '/' + controlId;
    const cell = this.DeviceData.cell(cellId);

    const deviceName = device.getName(this.$locale.id);
    const controlName = cell.getName(this.$locale.id);
    return (deviceName || deviceId) + ' / ' + (controlName || controlId);
  }

  updateTranslations() {
    this.$translate([
      'events.labels.name',
      'events.labels.message',
      'events.labels.timestamp',
      'events.labels.no_events',
      'events.labels.actions',
      'events.buttons.clear_events',
      'events.buttons.edit_events'
    ]).then(translations => {
      this.translations = translations;
    });
  }

  uiOnParamsChanged(changedParams, transition) {
    if (!transition.options()?.custom?.noreload) {
      this.$state.reload();
    }
  }
}

export default angular
  .module('homeuiApp.events', [])
  .controller('EventsCtrl', EventsCtrl);
