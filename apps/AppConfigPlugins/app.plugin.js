const { withInfoPlist } = require('@expo/config-plugins');

module.exports = (config, id) => {
  return withInfoPlist(config, config => {
    console.log('>>>', config);
    return config;
  });
};
