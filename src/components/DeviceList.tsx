import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';

interface Device {
  deviceId: number;
  productName?: string;
  manufacturer?: string;
}

interface DeviceListProps {
  devices: Device[];
  connected: boolean;
  currentDevice: number | null;
  autoConnect: boolean;
  autoRefresh: boolean;
  onConnect: (deviceId: number) => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onToggleAutoConnect: () => void;
  onToggleAutoRefresh: () => void;
}

const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  connected,
  currentDevice,
  autoConnect,
  autoRefresh,
  onConnect,
  onDisconnect,
  onRefresh,
  onToggleAutoConnect,
  onToggleAutoRefresh
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>USB Connection</Text>
      <Text style={styles.explanationText}>
        Connect your SDS011/SDS021 PM sensor to read air quality data
      </Text>
      
      <View style={styles.autoOptionsContainer}>
        <View style={styles.toggleOption}>
          <Text style={styles.toggleLabel}>Auto Connect</Text>
          <Switch
            value={autoConnect}
            onValueChange={onToggleAutoConnect}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={autoConnect ? '#007AFF' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.toggleOption}>
          <Text style={styles.toggleLabel}>Auto Refresh</Text>
          <Switch
            value={autoRefresh}
            onValueChange={onToggleAutoRefresh}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={autoRefresh ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, styles.refreshButton]} 
        onPress={onRefresh}
      >
        <Text style={styles.buttonText}>Refresh Devices</Text>
      </TouchableOpacity>
      
      <View style={styles.deviceListContainer}>
        {devices.length === 0 ? (
          <Text style={styles.noDevicesText}>No USB devices found</Text>
        ) : (
          devices.map((device, index) => (
            <View key={index} style={styles.deviceItem}>
              <Text style={styles.deviceName}>
                {device.productName || device.manufacturer || `Device ${device.deviceId}`}
              </Text>
              <TouchableOpacity
                style={[
                  styles.button,
                  (connected && currentDevice === device.deviceId) 
                    ? styles.disconnectButton 
                    : styles.connectButton
                ]}
                onPress={() => {
                  if (connected && currentDevice === device.deviceId) {
                    onDisconnect();
                  } else {
                    onConnect(device.deviceId);
                  }
                }}
              >
                <Text style={styles.buttonText}>
                  {(connected && currentDevice === device.deviceId) 
                    ? 'Disconnect' 
                    : 'Connect'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  autoOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    marginBottom: 16,
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
    color: '#333',
  },
  noDevicesText: {
    textAlign: 'center',
    padding: 16,
    color: '#666',
  },
});

export default DeviceList; 