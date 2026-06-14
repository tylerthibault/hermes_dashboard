const http = require('http');
const fs = require('fs');
const path = require('path');
const mock = JSON.parse(fs.readFileSync(path.join(__dirname,'mock_connector_response.json'),'utf8'));

const server = http.createServer((req,res)=>{
  if (req.url === '/v1/telemetry'){
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify(mock));
    return;
  }
  if (req.url === '/health'){
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({status:'ok'}));
    return;
  }
  res.writeHead(404, {'Content-Type':'text/plain'});
  res.end('Not Found');
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
server.listen(port, ()=>console.log('mock server listening on', port));

process.on('SIGTERM', ()=>server.close(()=>process.exit(0)));
