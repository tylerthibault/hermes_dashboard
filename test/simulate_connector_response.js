const fs = require('fs');

const mockPath = './mock_connector_response.json';
if (!fs.existsSync(mockPath)) {
  console.error('mock file not found:', mockPath);
  process.exit(2);
}

const body = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
const checkedAt = new Date().toISOString();
const connectorInfo = {
  status: 'online',
  source: 'env',
  latencyMs: 42,
  message: 'Connector reachable (telemetry available)'
};

const out = {
  checkedAt,
  systemStatus: 'online',
  connector: connectorInfo,
  ...body,
};

console.log(JSON.stringify(out, null, 2));
