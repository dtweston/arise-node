var express = require('express');
var bodyParser = require('body-parser');
var ws = require('nodejs-websocket');

var accountSid = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
var authToken = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
var fromNumber = '+XXXXXXXXXXX';
var twilio = require('twilio')(accountSid, authToken);

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
  res.send('Hello World!');
});

var cxnMap = {};

app.post('/events', function(req, res) {
  var sid = req.body["CallSid"];
  var cxn = cxnMap[sid];
  if (cxn && cxn.readyState == cxn.OPEN) {
    cxn.sendText(JSON.stringify({"status": req.body["CallStatus"]}));
  }
  else {
    console.log("!!! Unable to find connection for sid " + sid);
  }
  res.status(204).end();
});

function call(toNumber, callback) {
  twilio.calls.create({
    url: 'http://demo.twilio.com/docs/voice.xml',
    to: toNumber,
    from: fromNumber,
    statusCallback: 'https://722a135a.ngrok.io/events',
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
  }, callback);
}

app.post('/calls', function(req, res) {
  call(req.body['to'], function(err, call) {
    if (err) {
      console.log('Error creating call: ', err);
    } else {
      console.log('Created new call: ', call.sid);
    }
  });
  res.status(201).send({ "err": "none" });
});

app.listen(3002, function() {
    console.log('Example app listening on port 3002');
});

var server = ws.createServer(function(conn) {
  console.log('New connection');
  conn.on('text', function(str) {
    console.log('Received ' + str);
    var packet = '';
    try {
      packet = JSON.parse(str);
    }
    catch (ex) {
      conn.sendText(JSON.stringify({"error": ex}));
    }
    if (!packet) {
      return;
    }
    if (packet.command == 'dial') {
      call(packet.params.toNumber, function(err, call) {
        if (err) {
          conn.sendText(JSON.stringify({"error": "Unable to create call: " + err}));
        }
        else {
          cxnMap[call.sid] = conn;
          conn.sendText(JSON.stringify({"status": call['CallStatus']}));
        }
      });
      conn.sendText(JSON.stringify({"success": "Calling " + packet.params.toNumber}));
    }
    else {
      conn.sendText(JSON.stringify({"error": "Unable to understand packet: " + str}));
    }
  });
  conn.on('close', function(code, reason) {
    console.log('Connection closed.');
  });
}).listen(3003);

console.log('Started WebSocket server');

module.exports = app;

