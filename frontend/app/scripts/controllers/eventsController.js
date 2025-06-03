class EventsCtrl {
  constructor($rootScope, $scope, $stateParams, $state, uiConfig, $translate, DeviceData) {
    'ngInject';

    this.$state = $state;
    this.$scope = $scope;
    this.uiConfig = uiConfig;
    this.DeviceData = DeviceData;
    this.$translate = $translate;

    this.fullscreen = $stateParams.fullscreen || false;

    // Initialization of triggered events array
    this.triggeredEvents = [];

    // Array of events retrieved from eventsEditCtrl
    // Read-only in this file
    this.events = [];

    // Events initialization
    this.uiConfig.whenReady().then(data => {
      if (!data.hasOwnProperty('triggeredEvents')) {
        data.triggeredEvents = [];
      }
      if (!data.hasOwnProperty('events')) {
        data.events = [];
      }
      this.triggeredEvents = data.triggeredEvents;
      this.events = data.events;
      console.log("[LOG]: Events in EventsCtrl: %o", this.events);
      console.log("[LOG]: Triggered Events: %o", this.triggeredEvents);

      this.updateTranslations();
      this.updateEvents();
      this.trimEvents();
    });

    // Allow table to save events on page load
    $rootScope.firstBootstrap = false;

    // Clean up
    $scope.$on('$destroy', () => {
      console.log("[LOG]: Scope destroy called in EventsCtrl");
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
          const triggeredEvent = {
            "topic": {
              "name": event.topic.name,
              "deviceId": event.topic.deviceId,
              "controlId": event.topic.controlId,
            },
            "message": event.message,
            "timestamp": this.formatTimestamp(Date.now()),
          };
          this.triggeredEvents.unshift(triggeredEvent);
        }
      }
    );

    console.log("[LOG]: Done checking events, initiating saving...");
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
      this.saveEvents();
    }
  }

  clearEvents() {
    this.triggeredEvents = [];
    console.log("[LOG]: Events were cleared");
    this.saveEvents();
  }

  deleteEvent(index) {
    this.triggeredEvents.splice(index, 1);
  }

  saveEvents() {
    this.uiConfig.whenReady().then(data => {
      // structuredClone in case shallow operation was used
      // but data needs to be saved to file
      data.triggeredEvents = structuredClone(this.triggeredEvents);
    });
    console.log("[LOG]: Events saved by method: %o", this.triggeredEvents);
  }

  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
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
