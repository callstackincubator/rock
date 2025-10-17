// eslint-disable-next-line no-undef
module.exports = {
  commands: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports,no-undef
    require('@react-native-oh/react-native-harmony-cli/dist/commands/link-harmony.js')
      .commandLinkHarmony,
    // eslint-disable-next-line @typescript-eslint/no-require-imports,no-undef
    require('@react-native-oh/react-native-harmony-cli/dist/commands/codegen-harmony.js')
      .commandCodegenHarmony,
  ],
};
