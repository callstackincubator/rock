export const TestPlugin = () => (api) => {
  api.registerCommand({
    name: 'test-command',
    description: 'Test command',
    action: () => {
      console.log('Test command executed');
    },
  });
  return {
    name: 'test-plugin',
  };
};
