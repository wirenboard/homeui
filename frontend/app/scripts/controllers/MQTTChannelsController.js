import mqttChannels from '~/react-directives/mqtt-channels/mqttChannels';

export default angular
  .module('homeuiApp.mqttChannels', [])
  .directive('mqttChannelsPage', mqttChannels);
