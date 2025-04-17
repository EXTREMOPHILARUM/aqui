import { useState, useEffect, useCallback } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { UsbSerialManager, Parity, Codes } from 'react-native-usb-serialport-for-android';
import { generateCommandBytes } from '../utils/sensorUtils';

/**
 * Interface for device information
 */
export interface Device {
  deviceId: number;
  productName?: string;
  manufacturer?: string;
}

/**
 * Hook for interacting with USB Serial devices
 */
export const useUsbSerial = (onLog?: (message: string) => void) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<number | null>(null);
  const [serialport, setSerialport] = useState<any>(null);
  const [dataBuffer, setDataBuffer] = useState<number[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  /**
   * Log a message if a logging function is provided
   */
  const logMessage = useCallback((message: string) => {
    if (onLog) onLog(message);
  }, [onLog]);

  /**
   * Request USB access permission
   */
  const requestUSBPermission = useCallback(async () => {
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
          logMessage('USB permission granted');
        } else {
          logMessage('USB permission denied');
        }
      } catch (err) {
        logMessage(`Error: ${err}`);
      }
    }
  }, [logMessage]);

  /**
   * Refresh the list of USB devices
   */
  const refreshDeviceList = useCallback(async () => {
    try {
      const deviceList = await UsbSerialManager.list();
      setDevices(deviceList || []);
      logMessage(`Found ${deviceList.length} device(s)`);
    } catch (error) {
      logMessage(`Error getting device list: ${error}`);
      setDevices([]);
    }
  }, [logMessage]);

  /**
   * Connect to a USB device
   */
  const connectDevice = useCallback(async (deviceId: number) => {
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
      logMessage(`Connected to device ${deviceId}`);
      
      // Set up data listener
      const sub = port.onReceived((event: any) => {
        try {
          // Convert received data to array of numbers
          const newData = Array.from(event.data || []);
          
          // Add to buffer
          setDataBuffer(prevBuffer => [...prevBuffer, ...newData]);
          
          if (newData.length > 0) {
            logMessage(`Received ${newData.length} bytes`);
          }
        } catch (error) {
          logMessage(`Error parsing data: ${error}`);
        }
      });
      
      // Save subscription for cleanup
      setSubscription(sub);
      
    } catch (error: any) {
      logMessage(`Error connecting: ${error}`);
      if (error.code === Codes.DEVICE_NOT_FOUND) {
        logMessage('Device not found or permission denied');
      }
    }
  }, [logMessage]);

  /**
   * Disconnect from a USB device
   */
  const disconnectDevice = useCallback(async () => {
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
        logMessage('Disconnected from device');
      }
    } catch (error) {
      logMessage(`Error disconnecting: ${error}`);
    }
  }, [serialport, subscription, logMessage]);

  /**
   * Send a command to the connected device
   */
  const sendCommand = useCallback(async (command: string) => {
    if (!serialport) {
      logMessage('No device connected');
      return;
    }
    
    try {
      // Generate command bytes
      const cmdArray = generateCommandBytes(command);
      
      // Convert to hex string
      const hexData = cmdArray.map(byte => 
        byte.toString(16).padStart(2, '0')
      ).join('').toUpperCase();
      
      logMessage(`Sending command: ${command}`);
      
      // Send the command
      await serialport.send(hexData);
      logMessage(`Command sent successfully`);
    } catch (error) {
      logMessage(`Error sending command: ${error}`);
    }
  }, [serialport, logMessage]);

  /**
   * Initialize USB Serial and set up permissions
   */
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

  return {
    devices,
    connected,
    currentDevice,
    dataBuffer,
    refreshDeviceList,
    connectDevice,
    disconnectDevice,
    sendCommand,
    clearBuffer: () => setDataBuffer([]),
  };
};

export default useUsbSerial; 