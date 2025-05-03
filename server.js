const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the current directory
app.use(express.static(__dirname));

// Set up serial port (Change COM3 to match your Arduino device)
// Configure Serial Port for COM3
let port;

// Function to connect to COM3
async function connectToPort() {
  try {
    port = new SerialPort({
      path: 'COM3',
      baudRate: 9600,
    });

    // Wait for port to open
    await new Promise((resolve, reject) => {
      port.on('open', resolve);
      port.on('error', reject);
    });

    console.log('Successfully connected to COM3');
    return port;
  } catch (error) {
    console.error('Failed to connect to COM3:', error.message);
    throw error;
  }
}

// Initialize connection
connectToPort().then(port => {
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  parser.on('data', (line) => {
  try {
    // Parse JSON data from Arduino
    const data = JSON.parse(line.trim());
    console.log('Received:', data);

    io.emit('sensorData', data);
  } catch (error) {
    console.error('Parsing error:', error);
    io.emit('error', { message: 'Data parsing error' });
  }
});

  // Handle port errors
  port.on('error', (error) => {
    console.error('Serial port error:', error);
    io.emit('error', { message: 'Serial port connection error' });
    
    // Try to reconnect after a delay
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      connectToPort().catch(err => {
        console.error('Reconnection failed:', err);
      });
    }, 5000);
  });
}).catch(error => {
  console.error('Initial connection failed:', error);
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});