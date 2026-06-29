const React = require('react');
const { renderToString } = require('react-dom/server');
require('@babel/register')({
  presets: ['next/babel']
});
const SettingsPanel = require('./src/components/SettingsPanel').default;
const ManagementPanel = require('./src/components/ManagementPanel').default;
const DashboardClient = require('./src/components/DashboardClient').default;

try {
  console.log('Rendering ManagementPanel...');
  renderToString(React.createElement(ManagementPanel, { members: [{id: 1, name: 'Test'}], clients: [], currentUser: {role: 'admin'} }));
  console.log('ManagementPanel OK');
} catch (e) {
  console.error('ManagementPanel Error:', e);
}

try {
  console.log('Rendering SettingsPanel...');
  renderToString(React.createElement(SettingsPanel, { members: [{id: 1, name: 'Test'}], clients: [], currentUser: {role: 'admin'} }));
  console.log('SettingsPanel OK');
} catch (e) {
  console.error('SettingsPanel Error:', e);
}
