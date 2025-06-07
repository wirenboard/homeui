// Same ChartsControl class as in historyContoller.js but only constructor
class ChartsControl {
  constructor(deviceId, controlId, deviceName, controlName, valueType, groupName, widget) {
    this.name = (deviceName || deviceId) + ' / ' + (controlName || controlId);
    if (widget) {
      this.name = widget.name + ' (' + this.name + ')';
    }
    this.widget = widget;
    this.group = groupName;
    this.deviceId = deviceId;
    this.controlId = controlId;
    this.valueType = valueType;
  }
}

class EventsEditCtrl {
  constructor($scope, $state, uiConfig, eventsConfig, DeviceData, $translate, $locale, $injector) {
    'ngInject';

    this.$state = $state;
    this.$scope = $scope;
    this.uiConfig = uiConfig;
    this.eventsConfig = eventsConfig;
    this.DeviceData = DeviceData;
    this.$translate = $translate;
    this.$locale = $locale;
    this.orderByFilter = $injector.get('orderByFilter');

    this.controls = [];

    // Events init
    this.events = [];
    this.newEvent = { topic: null, condition: '', message: '' };

    // Updating controls
    this.updateTranslations()
      .then(() => this.uiConfig.whenReady())
      .then(data => {
        this.updateControls(data.widgets, DeviceData);
      });

    // Loading events from eventConfig
    this.eventsConfig.whenReady().then(data => {
      console.log("[LOG]: Starting mapping events from file...");
      this.events = data.events.map(event => {
        console.log("[LOG]: Mapping event: %o", event);
        const device = DeviceData.devices[event.topic.deviceId];
        const cellId = event.topic.deviceId + '/' + event.topic.controlId;
        const cell = DeviceData.cell(cellId);

        console.log("[LOG]: Device: %o", device);
        console.log("[LOG]: CellId: %o", cellId);
        console.log("[LOG]: Cell: %o", cell);

        const objToReturn = {
          "topic": this.makeChartsControlFromCell(device, cell, this.allChannelsMsg),
          "condition": event.condition,
          "message": event.message
        };

        console.log("[LOG]: Will map: %o", objToReturn);

        return objToReturn;
      });

      console.log("[LOG]: Events: %o", this.events);
    });

    // Cleanup
    $scope.$on('$destroy', () => {
      console.log("[LOG]: Leaving events edit, saving...")
      this.saveEvents();

      this.$scope = null;
    });
  }

  updateTranslations() {
    var t = this.$translate([
      'events.edit.labels.choose',
      'events.edit.labels.condition',
      'events.edit.labels.message',
      'events.edit.labels.all_channels',
      'events.edit.labels.widget_channels',
      'events.edit.buttons.add_event',
      'events.edit.buttons.save',
      'events.edit.buttons.delete',
      'events.edit.labels.no_events'
    ]);
    t.then(translations => {
      this.allChannelsMsg = translations['events.edit.labels.all_channels'];
      this.widgetChannelsMsg = translations['events.edit.labels.widget_channels'];
      this.translations = translations;
    });
    return t;
  }

  addEvent() {
    if (this.newEvent.topic && this.newEvent.message && this.newEvent.condition) {
      const parsedCondition = this.parseAndValidateCondition(this.newEvent.condition);
      console.log("[LOG]: Parsed condition is %s", parsedCondition);
      if (parsedCondition) {
        this.newEvent.condition = parsedCondition;
        this.events.push({ ...this.newEvent });
        console.log("[LOG]: Event added: %o", this.newEvent);
        const id = this.newEvent.topic.deviceId + '/' + this.newEvent.topic.controlId;
        console.log("[LOG]: DeviceData.cell(id): %o", this.DeviceData.cell(id));
        this.newEvent = { topic: null, condition: '', message: '' };
        this.saveEvents();
      }
      else {
        alert(this.$translate.instant('events.edit.errors.validate_condition'));
      }
    }
    else {
      alert(this.$translate.instant('events.edit.errors.no_topic_message'));
    }
  }

  parseAndValidateCondition(cond) {
    const re = /\s*([><=]|>=|<=)\s*(-?\d+(\.\d+)?)/
    const match = cond.match(re);

    if (match !== null) {
      console.log("[LOG]: Condition is validated: %o", match);
      return match[1] + ' ' + match[2];
    }

    console.log("[LOG]: Condition's format is wrong");
    return '';
  }

  saveEvent(index) {
    if (this.events[index].topic && this.events[index].message && this.events[index].condition) {
      const parsedCondition = this.parseAndValidateCondition(this.events[index].condition);
      console.log("[LOG]: Parsed condition is `%s`, is null: %s", parsedCondition, parsedCondition === null ? "YES" : "NO");
      if (parsedCondition) {
        const id = this.events[index].topic.deviceId + '/' + this.events[index].topic.controlId;
        console.log("[LOG]: DeviceData.cell(id): %o", this.DeviceData.cell(id));
        this.events[index].condition = parsedCondition;
        this.saveEvents();
      }
      else {
        alert(this.$translate.instant('{{ events.edit.errors.validate_condition }}'));
      }
    }
    else {
      alert(this.$translate.instant('{{ events.edit.errors.no_topic_message }}'));
    }
  }

  deleteEvent(index) {
    console.log("[LOG]: Deleting event: %o", this.events[index]);
    this.events.splice(index, 1);
    this.saveEvents();
  }

  saveEvents() {
    this.eventsConfig.whenReady().then(data => {
      data.events = this.events.map(event => {
        return {
          "topic": {
            "deviceId": event.topic.deviceId,
            "controlId": event.topic.controlId
          },
          "condition": event.condition,
          "message": event.message
        };
      });
    });
    console.log("[LOG]: Events saved: %o", this.events);
  }

  clearEvents() {
    this.events = [];
    console.log("[LOG]: Events were cleared");
    this.saveEvents();
  }

  updateControls(widgets, DeviceData) {
    this.controls = this.orderByFilter(
      Array.prototype.concat.apply(
        [],
        widgets.map(widget =>
          widget.cells
            .filter(item => item.id)
            .map(item => {
              try {
                const cell = DeviceData.cell(item.id);
                const device = DeviceData.devices[cell.deviceId];
                return this.makeChartsControlFromCell(device, cell, this.widgetChannelsMsg, widget);
              } catch (er) {
                const deviceControl = item.id.split('/');
                return new ChartsControl(
                  deviceControl[0],
                  deviceControl[1],
                  undefined,
                  undefined,
                  undefined,
                  this.widgetChannelsMsg,
                  widget
                );
              }
            })
        ),
        'name'
      )
    );
    this.controls.push(
      ...Array.prototype.concat.apply(
        [],
        Object.keys(DeviceData.devices)
          .sort()
          .map(deviceId => {
            // console.log("[LOG]: DeviceId: %s", deviceId);
            const device = DeviceData.devices[deviceId];
            return device.cellIds.map(cellId => {
              // console.log("[LOG]: CellId: %o", cellId);
              const cell = DeviceData.cell(cellId);
              // console.log("[LOG]: Device: %o", device);
              // console.log("[LOG]: Cell: %o", cell);
              return this.makeChartsControlFromCell(device, cell, this.allChannelsMsg);
            });
          })
      )
    );
  }

  makeChartsControlFromCell(device, cell, groupName, widget) {
    return new ChartsControl(
      cell.deviceId,
      cell.controlId,
      device.getName(this.$locale.id),
      cell.getName(this.$locale.id),
      cell.valueType,
      groupName,
      widget
    );
  }

  goBack() {
    this.$state.go('events');
  }
}

export default angular
  .module('homeuiApp.eventsEdit', [])
  .controller('EventsEditCtrl', EventsEditCtrl);
