var ws = require('nodejs-websocket')

var client = ws.connect('ws://localhost:8001', function(conn) {
  console.log('New connection')
  client.sendText('test string')
  client.on('text', function(str) {
    console.log('Received ' + str)
  })
})


