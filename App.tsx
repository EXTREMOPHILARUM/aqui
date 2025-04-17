/**
 * React Native App for SDS011/SDS021 PM Sensor Data
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  SafeAreaView,
} from 'react-native';

import { Colors } from 'react-native/Libraries/NewAppScreen';
import { SensorCommands } from './src/utils/sensorUtils';

// Import components
import DeviceList from './src/components/DeviceList';
import SensorData from './src/components/SensorData';
import LogView from './src/components/LogView';
import RawDataMonitor from './src/components/RawDataMonitor';
import AboutSensor from './src/components/AboutSensor';

// Import hooks
import useUsbSerial from './src/hooks/useUsbSerial';
import useSensorData from './src/hooks/useSensorData';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [log, setLog] = useState<string[]>([]);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  const addLog = useCallback((message: string) => {
    setLog(prevLog => {
      const newLog = [...prevLog, `${new Date().toLocaleTimeString()}: ${message}`];
      // Keep last 50 logs
      return newLog.slice(-50);
    });
  }, []);

  // Initialize USB Serial with logging
  const { 
    devices,
    connected,
    currentDevice,
    dataBuffer,
    refreshDeviceList,
    connectDevice,
    disconnectDevice,
    sendCommand,
  } = useUsbSerial(addLog);

  // Process sensor data
  const { pm25, pm10, lastUpdate, packetType } = useSensorData({ 
    dataBuffer, 
    onLog: addLog 
  });

  useEffect(() => {
    console.log('[DEBUG] App: USB Connection status changed:', connected);
  }, [connected]);

  useEffect(() => {
    if (dataBuffer && dataBuffer.length > 0) {
      console.log(`[DEBUG] App: Data buffer updated, length: ${dataBuffer.length}`);
    }
  }, [dataBuffer]);

  useEffect(() => {
    if (pm25 !== null && pm10 !== null) {
      console.log(`[DEBUG] App: New sensor readings - PM2.5: ${pm25}, PM10: ${pm10}, Type: ${packetType}`);
    }
  }, [pm25, pm10, packetType]);

  const clearLogs = () => {
    console.log('[DEBUG] App: Clearing logs');
    setLog([]);
  };

  const handleSendCommand = (command: string) => {
    console.log(`[DEBUG] App: Sending command: ${command}`);
    sendCommand(command);
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerText}>SDS011/SDS021 PM Sensor</Text>
        </View>

        <View style={styles.container}>
          {/* Device Connection Section */}
          <DeviceList
            devices={devices}
            connected={connected}
            currentDevice={currentDevice}
            onConnect={connectDevice}
            onDisconnect={disconnectDevice}
            onRefresh={refreshDeviceList}
          />

          {/* Sensor Data Display */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sensor Data</Text>
            <SensorData
              pm25={pm25}
              pm10={pm10}
              lastUpdate={lastUpdate}
              connected={connected}
              packetType={packetType}
            />
          </View>

          {/* Raw Data Monitor
          {connected && (
            <RawDataMonitor dataBuffer={dataBuffer} connected={connected} />
          )} */}

          {/* Log Display */}
          {/* <View style={styles.section}>
            <LogView 
              logs={log} 
              onClearLogs={clearLogs} 
              connected={connected}
              onSendCommand={handleSendCommand}
            />
          </View> */}

          {/* About Section */}
          <AboutSensor />
        </View>
      </ScrollView>
    </SafeAreaView>
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
    marginTop: 30,
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
});

export default App;
