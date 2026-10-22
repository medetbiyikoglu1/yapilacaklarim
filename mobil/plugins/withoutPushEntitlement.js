// The app only schedules local notifications, which need no entitlement. expo-notifications
// always adds `aps-environment` (remote push), and a free Apple account cannot sign an app
// that has it, so it is removed here. It must be listed before expo-notifications in app.json:
// entitlement mods run in reverse order. Drop this plugin if remote push is ever added.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
