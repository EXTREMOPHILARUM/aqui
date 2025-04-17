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
  Switch,
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

// Set to true for detailed developer logs, false for user-friendly logs
const DEVELOPER_MODE = false;

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [log, setLog] = useState<string[]>([]);
  const [devMode, setDevMode] = useState<boolean>(DEVELOPER_MODE);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  // Simplified helper to create user-friendly messages
  const getUserFriendlyMessage = (message: string): string | null => {
    // Connection-related user messages
    if (message.includes('Found')) {
      return 'Discovered sensor devices';
    }
    if (message.includes('Connected to device')) {
      return 'Connected to sensor successfully';
    }
    if (message.includes('Disconnected')) {
      return 'Disconnected from sensor';
    }
    if (message.includes('Error connecting')) {
      return 'Could not connect to sensor device';
    }
    if (message.includes('Permission denied')) {
      return 'USB permission was denied';
    }

    // Data-related user messages
    if (message.includes('Valid values extracted') || message.includes('Parsed values from cleaned bytes')) {
      // Extract the PM2.5 and PM10 values from the message
      const pm25Match = message.match(/PM2\.5=(\d+\.?\d*)/);
      const pm10Match = message.match(/PM10=(\d+\.?\d*)/);
      const pm25Value = pm25Match ? pm25Match[1] : '?';
      const pm10Value = pm10Match ? pm10Match[1] : '?';
      
      return `Air quality reading: PM2.5=${pm25Value}, PM10=${pm10Value} µg/m³`;
    }
    if (message.includes('Buffer cleared')) {
      return null; // Don't show this to users
    }
    if (message.includes('No valid packets found')) {
      return null; // Don't show this to users
    }
    if (message.includes('[DEBUG]')) {
      return null; // Don't show debug messages to users
    }

    // Default fallback for unmatched messages
    return message.includes('Error') ? 'A sensor error occurred' : null;
  };

  const addLog = useCallback((message: string) => {
    setLog(prevLog => {
      // In dev mode, show all logs, in user mode only show user-friendly ones
      const userMessage = getUserFriendlyMessage(message);
      
      if (!devMode && userMessage === null) {
        return prevLog; // Skip this log in user mode if no user-friendly version
      }

      const displayMessage = devMode ? message : (userMessage || message);
      const newLog = [...prevLog, `${new Date().toLocaleTimeString()}: ${displayMessage}`];
      
      // Keep last 50 logs
      return newLog.slice(-50);
    });
  }, [devMode]);

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
    clearBuffer,
  } = useUsbSerial(addLog);

  // Process sensor data
  const { pm25, pm10, avgPm25, avgPm10, readingsCount, lastUpdate, packetType } = useSensorData({ 
    dataBuffer, 
    onLog: addLog,
    clearBuffer 
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

  const toggleDevMode = () => {
    setDevMode(prev => !prev);
    addLog(devMode ? 'Switching to user-friendly logs' : 'Developer mode enabled');
  };

  const toggleShowLogs = () => {
    setShowLogs(prev => !prev);
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerText}>AQUI</Text>
        </View>

        <View style={styles.container}>
          {/* Sensor Data Display */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sensor Data</Text>
            <SensorData
              pm25={pm25}
              pm10={pm10}
              avgPm25={avgPm25}
              avgPm10={avgPm10}
              readingsCount={readingsCount}
              lastUpdate={lastUpdate}
              connected={connected}
              packetType={packetType}
            />
          </View>
          {/* Device Connection Section */}
          <DeviceList
            devices={devices}
            connected={connected}
            currentDevice={currentDevice}
            onConnect={connectDevice}
            onDisconnect={disconnectDevice}
            onRefresh={refreshDeviceList}
          />

          <AboutSensor />

          {/* Raw Data Monitor
          {connected && (
            <RawDataMonitor dataBuffer={dataBuffer} connected={connected} />
          )} */}

          {/* Log Display Toggle Button */}
          <TouchableOpacity 
            style={styles.logToggleButton} 
            onPress={toggleShowLogs}
          >
            <Text style={styles.logToggleButtonText}>
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </Text>
          </TouchableOpacity>

          {/* Log Display */}
          {showLogs && (
            <View style={styles.section}>
              <View style={styles.devModeToggle}>
                <Text style={styles.devModeText}>Developer Logs</Text>
                <Switch
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={devMode ? '#007AFF' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={toggleDevMode}
                  value={devMode}
                />
              </View>
              <LogView 
                logs={log} 
                onClearLogs={clearLogs} 
                connected={connected}
              />
            </View>
          )}
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
  devModeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  devModeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  logToggleButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  logToggleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default App;
