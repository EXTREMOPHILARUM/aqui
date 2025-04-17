/**
 * React Native App for SDS011/SDS021 PM Sensor Data
 */

import React, {useEffect, useState} from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  PermissionsAndroid,
  Platform,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import { UsbSerialManager, Parity, Codes } from 'react-native-usb-serialport-for-android';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [devices, setDevices] = useState([]);
  const [connected, setConnected] = useState(false);
  const [pm25, setPm25] = useState<number | null>(null);
  const [pm10, setPm10] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [currentDevice, setCurrentDevice] = useState<null | number>(null);
  const [dataBuffer, setDataBuffer] = useState<number[]>([]);
  const [serialport, setSerialport] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  const addLog = (message: string) => {
    setLog(prevLog => {
      const newLog = [...prevLog, `${new Date().toLocaleTimeString()}: ${message}`];
      // Keep last 50 logs instead of just 10
      return newLog.slice(-50);
    });
  };

  const requestUSBPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'USB Permission',
            message: 'This app needs access to USB devices',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          addLog('USB permission granted');
        } else {
          addLog('USB permission denied');
        }
      } catch (err) {
        addLog(`Error: ${err}`);
      }
    }
  };

  // Initialize USB Serial and set up event listener
  useEffect(() => {
    // Request permissions
    requestUSBPermission();

    // Set up USB device connection monitoring
    if (Platform.OS === 'android') {
      refreshDeviceList();

      // Cleanup function
      return () => {
        // Disconnect if connected
        if (connected && currentDevice && serialport) {
          serialport.close();
          setSerialport(null);
          setConnected(false);
          setCurrentDevice(null);
        }
        
        // Remove subscription if exists
        if (subscription) {
          subscription.remove();
          setSubscription(null);
        }
      };
    }
  }, []);

  // Add this helper function near the top of your App function
  const byteArrayToHexString = (bytes) => {
    return bytes.map(byte => padHex(byte)).join(' ');
  };

  // Modify the processBuffer function to convert hex to decimal values
  const processBuffer = (buffer) => {
    // Only log buffer size occasionally to reduce clutter
    if (buffer.length > 20 && buffer.length % 20 === 0) {
      addLog(`Buffer size: ${buffer.length}`);
    }
    
    // Try to find complete packets in the buffer
    let processedUpTo = 0;
    let packetFound = false;
    
    // Look for a packet that starts with AA and ends with AB (common for SDS sensors)
    for (let i = 0; i < buffer.length - 10; i++) {
      // Check if we have a potential packet
      if (buffer[i] === 0xAA && buffer[i + 9] === 0xAB) {
        // Log the complete packet for debugging
        const packetHex = buffer.slice(i, i + 10).map(b => padHex(b)).join(' ');
        addLog(`Found packet: ${packetHex}`);
        
        try {
          // Extract data bytes - need to convert from hex to decimal
          // PM2.5 is typically in bytes 2-3
          // PM10 is typically in bytes 4-5
          const pm25Low = parseInt(buffer[i + 2], 10);  // Convert to decimal
          const pm25High = parseInt(buffer[i + 3], 10); // Convert to decimal
          const pm10Low = parseInt(buffer[i + 4], 10);  // Convert to decimal
          const pm10High = parseInt(buffer[i + 5], 10); // Convert to decimal
          
          // Debug the raw decimal values
          addLog(`Raw decimal: PM2.5 bytes: ${pm25Low},${pm25High}, PM10 bytes: ${pm10Low},${pm10High}`);
          
          // Calculate PM values according to SDS011/SDS021 formula:
          // PM value = ((high_byte * 256) + low_byte) / 10
          const pm25Value = ((pm25High * 256) + pm25Low) / 10;
          const pm10Value = ((pm10High * 256) + pm10Low) / 10;
          
          addLog(`Calculated: PM2.5=${pm25Value.toFixed(1)}, PM10=${pm10Value.toFixed(1)}`);
          
          // Only update if values seem reasonable (PM values typically 0-999)
          if (pm25Value >= 0 && pm25Value < 1000 && pm10Value >= 0 && pm10Value < 1000) {
            setPm25(pm25Value);
            setPm10(pm10Value);
            setLastUpdate(new Date().toLocaleTimeString());
            addLog(`✓ Updated sensor values: PM2.5=${pm25Value.toFixed(1)}, PM10=${pm10Value.toFixed(1)}`);
          } else {
            addLog(`✗ Values out of range, ignoring this packet`);
          }
          
          // Mark as processed
          processedUpTo = i + 10;
          packetFound = true;
          break;
        } catch (error) {
          addLog(`Error parsing packet: ${error.message}`);
        }
      }
    }
    
    // Keep any unprocessed data in the buffer
    if (processedUpTo > 0) {
      setDataBuffer(buffer.slice(processedUpTo));
    } else if (buffer.length > 100) {
      // If buffer gets too large without finding valid packets, trim it
      setDataBuffer(buffer.slice(buffer.length - 50));
    } else {
      setDataBuffer(buffer);
    }
  };

  // Get list of USB devices
  const refreshDeviceList = async () => {
    try {
      const deviceList = await UsbSerialManager.list();
      setDevices(deviceList || []);
      addLog(`Found ${deviceList.length} device(s)`);
    } catch (error) {
      addLog(`Error getting device list: ${error}`);
      setDevices([]);
    }
  };

  // Connect to USB device
  const connectDevice = async (deviceId) => {
    try {
      // First request permission
      await UsbSerialManager.tryRequestPermission(deviceId);
      
      // SDS011/SDS021 uses 9600 baud rate
      const port = await UsbSerialManager.open(deviceId, {
        baudRate: 9600,
        parity: Parity.None,
        stopBits: 1,
        dataBits: 8,
      });
      
      setSerialport(port);
      setConnected(true);
      setCurrentDevice(deviceId);
      addLog(`Connected to device ${deviceId}`);
      
      // Set up data listener
      const sub = port.onReceived((event) => {
        try {
          // Convert received data to array of numbers
          const newData = Array.from(event.data || []);
          
          // Log the raw data for debugging
          if (newData.length > 0) {
            addLog(`Raw data: ${byteArrayToHexString(newData)}`);
          }
          
          // Add to buffer
          const buffer = [...dataBuffer, ...newData];
          
          // Process SDS011/SDS021 data
          processBuffer(buffer);
        } catch (error) {
          addLog(`Error parsing data: ${error}`);
        }
      });
      
      // Save subscription for cleanup
      setSubscription(sub);
      
    } catch (error) {
      addLog(`Error connecting: ${error}`);
      if (error.code === Codes.DEVICE_NOT_FOUND) {
        addLog('Device not found or permission denied');
      }
    }
  };

  // Disconnect from USB device
  const disconnectDevice = async () => {
    try {
      if (serialport) {
        // Remove event listener
        if (subscription) {
          subscription.remove();
          setSubscription(null);
        }
        
        // Close connection
        serialport.close();
        setSerialport(null);
        setConnected(false);
        setCurrentDevice(null);
        addLog('Disconnected from device');
      }
    } catch (error) {
      addLog(`Error disconnecting: ${error}`);
    }
  };

  // Render connected devices list
  const renderDeviceList = () => {
    if (devices.length === 0) {
      return (
        <Text style={styles.noDevicesText}>No USB devices found</Text>
      );
    }

    return devices.map((device, index) => (
      <View key={index} style={styles.deviceItem}>
        <Text style={styles.deviceName}>
          {device.productName || device.manufacturer || `Device ${device.deviceId}`}
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            (connected && currentDevice === device.deviceId) ? styles.disconnectButton : styles.connectButton
          ]}
          onPress={() => {
            if (connected && currentDevice === device.deviceId) {
              disconnectDevice();
            } else {
              connectDevice(device.deviceId);
            }
          }}>
          <Text style={styles.buttonText}>
            {(connected && currentDevice === device.deviceId) ? 'Disconnect' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>
    ));
  };

  // Modify renderSensorData to directly convert and display values from dataBuffer
  const renderSensorData = () => {
    // Extract and convert values directly from dataBuffer if available
    let calculatedPM25 = null;
    let calculatedPM10 = null;
    
    // Look for a valid packet in the dataBuffer (starting with AA, ending with AB)
    if (dataBuffer.length >= 10) {
      for (let i = 0; i < dataBuffer.length - 10; i++) {
        if (dataBuffer[i] === 0xAA && dataBuffer[i + 9] === 0xAB) {
          // Extract bytes for PM2.5 and PM10
          const pm25Low = dataBuffer[i + 2];
          const pm25High = dataBuffer[i + 3];
          const pm10Low = dataBuffer[i + 4];
          const pm10High = dataBuffer[i + 5];
          
          // Calculate values using SDS011/SDS021 formula
          calculatedPM25 = ((pm25High * 256) + pm25Low) / 10;
          calculatedPM10 = ((pm10High * 256) + pm10Low) / 10;
          
          // Only use reasonable values
          if (calculatedPM25 < 0 || calculatedPM25 > 1000 || 
              calculatedPM10 < 0 || calculatedPM10 > 1000) {
            calculatedPM25 = null;
            calculatedPM10 = null;
          }
          
          break;
        }
      }
    }
    
    // Use calculated values from buffer or fall back to state values
    const displayPM25 = calculatedPM25 !== null ? calculatedPM25 : pm25;
    const displayPM10 = calculatedPM10 !== null ? calculatedPM10 : pm10;
    
    return (
      <View style={styles.sensorDataContainer}>
        {displayPM25 === null || displayPM10 === null ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No valid data packets detected</Text>
            <Text style={styles.noDataSubtext}>
              {connected ? 'Sensor connected. Waiting for valid data...' : 'Connect to a device to start reading'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.sensorRow}>
              <View style={styles.sensorValue}>
                <Text style={styles.sensorLabel}>PM2.5</Text>
                <Text style={[
                  styles.sensorReading, 
                  displayPM25 <= 12 ? styles.goodReading : 
                  displayPM25 <= 35 ? styles.moderateReading : 
                  displayPM25 <= 55 ? styles.unhealthySensitiveReading :
                  displayPM25 <= 150 ? styles.unhealthyReading :
                  displayPM25 <= 250 ? styles.veryUnhealthyReading : 
                  styles.hazardousReading
                ]}>
                  {displayPM25.toFixed(1)}
                </Text>
                <Text style={styles.sensorUnit}>µg/m³</Text>
                <Text style={styles.sensorInfo}>
                  {displayPM25 <= 12 ? 'Good' : 
                  displayPM25 <= 35 ? 'Moderate' : 
                  displayPM25 <= 55 ? 'Unhealthy for Sensitive Groups' :
                  displayPM25 <= 150 ? 'Unhealthy' :
                  displayPM25 <= 250 ? 'Very Unhealthy' : 
                  'Hazardous'}
                </Text>
              </View>
              
              <View style={styles.sensorValue}>
                <Text style={styles.sensorLabel}>PM10</Text>
                <Text style={[
                  styles.sensorReading,
                  displayPM10 <= 54 ? styles.goodReading : 
                  displayPM10 <= 154 ? styles.moderateReading : 
                  displayPM10 <= 254 ? styles.unhealthySensitiveReading :
                  displayPM10 <= 354 ? styles.unhealthyReading :
                  displayPM10 <= 424 ? styles.veryUnhealthyReading : 
                  styles.hazardousReading
                ]}>
                  {displayPM10.toFixed(1)}
                </Text>
                <Text style={styles.sensorUnit}>µg/m³</Text>
                <Text style={styles.sensorInfo}>
                  {displayPM10 <= 54 ? 'Good' : 
                  displayPM10 <= 154 ? 'Moderate' : 
                  displayPM10 <= 254 ? 'Unhealthy for Sensitive Groups' :
                  displayPM10 <= 354 ? 'Unhealthy' :
                  displayPM10 <= 424 ? 'Very Unhealthy' : 
                  'Hazardous'}
                </Text>
              </View>
            </View>
            <Text style={styles.lastUpdate}>
              Data from: {calculatedPM25 !== null ? 'Live buffer' : 'Last valid packet'}
            </Text>
            {lastUpdate && (
              <Text style={styles.lastUpdate}>Last updated: {lastUpdate}</Text>
            )}
          </>
        )}
      </View>
    );
  };

  // Render logs
  const renderLogs = () => {
    return (
      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Log (Last {log.length} entries)</Text>
        <ScrollView style={styles.logScroll}>
          {log.map((entry, index) => (
            <Text key={index} style={styles.logEntry}>{entry}</Text>
          ))}
        </ScrollView>
        
        {/* Add clear log button */}
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={() => setLog([])}
        >
          <Text style={styles.buttonText}>Clear Log</Text>
        </TouchableOpacity>
        
        {/* Add manual command sending for testing */}
        {connected && serialport && (
          <View style={styles.commandSection}>
            <Text style={styles.commandTitle}>Test Commands</Text>
            <View style={styles.commandButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.commandButton]} 
                onPress={() => sendSensorCommand('wake')}
              >
                <Text style={styles.buttonText}>Wake</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.commandButton]} 
                onPress={() => sendSensorCommand('read')}
              >
                <Text style={styles.buttonText}>Read</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.commandButton]} 
                onPress={() => sendSensorCommand('sleep')}
              >
                <Text style={styles.buttonText}>Sleep</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Add this function to calculate SDS011/SDS021 command checksum
  const calculateChecksum = (data) => {
    // Calculate checksum - the sum of all bytes from index 2 to 15 modulo 256
    let checksum = 0;
    for (let i = 2; i < 16; i++) {
      checksum += data[i];
    }
    return checksum % 256;
  };

  // Fix the sendSensorCommand function to properly calculate checksums
  const sendSensorCommand = async (command) => {
    if (!serialport) {
      addLog('No device connected');
      return;
    }
    
    try {
      // Command structure: 
      // byte 0: header (0xAA)
      // byte 1: command byte (0xB4)
      // byte 2: command type
      // byte 3: command value
      // bytes 4-15: zeros (0x00)
      // bytes 16-17: device ID (0xFF 0xFF for all devices)
      // byte 18: checksum
      // byte 19: tail (0xAB)
      
      // Create command array
      const cmdArray = [
        0xAA, 0xB4, 0x00, 0x00, 
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xFF, 0x00, 0xAB
      ];
      
      // Set command type and value
      switch (command) {
        case 'wake':
          cmdArray[2] = 0x06; // Set sleep/work mode
          cmdArray[3] = 0x01; // 1 = work mode
          break;
        case 'read':
          cmdArray[2] = 0x04; // Request data
          cmdArray[3] = 0x00; // 0 = no argument needed
          break;
        case 'sleep':
          cmdArray[2] = 0x06; // Set sleep/work mode
          cmdArray[3] = 0x00; // 0 = sleep mode
          break;
        default:
          cmdArray[2] = 0x06; // Default to wake
          cmdArray[3] = 0x01;
      }
      
      // Calculate checksum
      cmdArray[18] = calculateChecksum(cmdArray);
      
      // Convert to hex string
      const hexData = cmdArray.map(byte => ('00' + byte.toString(16)).slice(-2)).join('').toUpperCase();
      
      addLog(`Sending command: ${byteArrayToHexString(cmdArray)}`);
      
      // Send the command
      await serialport.send(hexData);
      addLog(`Command sent successfully`);
    } catch (error) {
      addLog(`Error sending command: ${error}`);
    }
  };

  // Add helper function to padHex
  const padHex = (num) => {
    return num.toString(16).padStart(2, '0');
  };

  // Add a component to display raw data
  const renderRawDataView = () => {
    if (!connected) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Raw Data Monitor</Text>
        <Text style={styles.explanationText}>
          This shows raw hexadecimal data from the sensor. SDS011/SDS021 packets start with AA and end with AB.
        </Text>
        <ScrollView 
          style={styles.rawDataContainer}
          horizontal={true}
        >
          <Text style={styles.rawData}>
            {dataBuffer.length > 0 
              ? dataBuffer.map(byte => padHex(byte)).join(' ')
              : 'No data in buffer'}
          </Text>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerText}>SDS011/SDS021 PM Sensor</Text>
        </View>

        <View style={styles.container}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>USB Connection</Text>
            <Text style={styles.explanationText}>
              Connect your SDS011/SDS021 PM sensor to read air quality data
            </Text>
            <TouchableOpacity 
              style={[styles.button, styles.refreshButton]} 
              onPress={refreshDeviceList}
            >
              <Text style={styles.buttonText}>Refresh Devices</Text>
            </TouchableOpacity>
            
            <View style={styles.deviceListContainer}>
              {renderDeviceList()}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sensor Data</Text>
            {renderSensorData()}
          </View>

          {renderRawDataView()}

          <View style={styles.section}>
            {renderLogs()}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About SDS011/SDS021 PM Sensors</Text>
            <Text style={styles.aboutText}>
              The SDS011 and SDS021 are laser particle sensors that can measure PM2.5 and PM10 
              particulate matter concentrations in the air. These sensors use the principle of 
              light scattering to measure particle concentration between 0.3 to 10μm in diameter.
              {'\n\n'}
              PM2.5 refers to particles smaller than 2.5μm, which can penetrate deep into the lungs.
              PM10 refers to particles smaller than 10μm, which can enter the respiratory system.
              {'\n\n'}
              Air Quality Index (AQI) ranges for PM2.5:
              {'\n'}• 0-12 μg/m³: Good
              {'\n'}• 12-35 μg/m³: Moderate
              {'\n'}• 35-55 μg/m³: Unhealthy for Sensitive Groups
              {'\n'}• 55-150 μg/m³: Unhealthy
              {'\n'}• 150-250 μg/m³: Very Unhealthy
              {'\n'}• 250+ μg/m³: Hazardous
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#007AFF',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    flex: 0,
    minWidth: 100,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    flex: 0,
    minWidth: 100,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deviceListContainer: {
    marginTop: 10,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceName: {
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  noDevicesText: {
    textAlign: 'center',
    padding: 16,
    color: '#666',
  },
  sensorDataContainer: {
    alignItems: 'center',
    padding: 16,
  },
  sensorValue: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sensorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  sensorReading: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  sensorUnit: {
    fontSize: 14,
    color: '#666',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
  },
  logContainer: {
    padding: 8,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logScroll: {
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    color: '#666',
    paddingVertical: 2,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  clearButton: {
    backgroundColor: '#F44336',
    marginTop: 10,
  },
  commandSection: {
    marginTop: 10,
  },
  commandTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  commandButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commandButton: {
    flex: 1,
    margin: 5,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  rawDataContainer: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
  },
  rawData: {
    fontSize: 12,
    color: '#666',
  },
  sensorInfo: {
    fontSize: 12,
    color: '#999',
  },
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goodReading: {
    color: '#4CAF50',
  },
  moderateReading: {
    color: '#FFA500',
  },
  unhealthySensitiveReading: {
    color: '#FF5733',
  },
  unhealthyReading: {
    color: '#FF3333',
  },
  veryUnhealthyReading: {
    color: '#FF33FF',
  },
  hazardousReading: {
    color: '#FF3333',
  },
});

export default App;
