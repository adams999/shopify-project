var SplitFactory = require('@splitsoftware/splitio').SplitFactory;
var commonSettings = require('../config/settings.json')

var factory = SplitFactory({
  core: {
    authorizationKey: commonSettings.split_key,
  }
});

module.exports = factory.client();