import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [autoConnect, setAutoConnect] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataReceivedRef = useRef<number>(Date.now());
  const connectionErrorCountRef = useRef<number>(0);
  const lastDetachedDeviceIdRef = useRef<number | null>(null);
  const deviceAttachmentTimeRef = useRef<number>(0);
  const reattachDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // If auto-connect is enabled and we're not connected, try to connect to the first device
      if (autoConnect && !connected && deviceList && deviceList.length > 0) {
        const deviceToConnect = deviceList[0];
        logMessage(`Auto-connecting to device ${deviceToConnect.deviceId}`);
        connectDevice(deviceToConnect.deviceId);
      }
    } catch (error) {
      logMessage(`Error getting device list: ${error}`);
      setDevices([]);
    }
  }, [logMessage, autoConnect, connected]);

  /**
   * Force immediate refresh of device list
   */
  const forceDeviceListRefresh = useCallback(async () => {
    logMessage('Forcing immediate device list refresh');
    try {
      const deviceList = await UsbSerialManager.list();
      setDevices(deviceList || []);
      return deviceList || [];
    } catch (error) {
      logMessage(`Error during forced device list refresh: ${error}`);
      setDevices([]);
      return [];
    }
  }, [logMessage]);

  /**
   * Check if connection is still active
   */
  const checkConnectionStatus = useCallback(async () => {
    if (!connected || !serialport) return;

    try {
      // Check if we've received data recently (within the last 15 seconds)
      const timeSinceLastData = Date.now() - lastDataReceivedRef.current;
      const isStale = timeSinceLastData > 15000;

      // Try to send a "ping" command to test connection
      if (isStale || connectionErrorCountRef.current > 0) {
        // Try to verify connection is still active
        // This call will throw an error if device is disconnected
        await serialport.isOpen();
        
        // If we get here and had errors before, reset the counter
        if (connectionErrorCountRef.current > 0) {
          connectionErrorCountRef.current = 0;
          logMessage("Connection restored.");
        }
      }
    } catch (error) {
      connectionErrorCountRef.current++;
      logMessage(`Connection check failed (${connectionErrorCountRef.current}): ${error}`);
      
      // If we've had multiple consecutive errors, assume device is disconnected
      if (connectionErrorCountRef.current >= 2) {
        logMessage("Device appears to be disconnected. Cleaning up connection.");
        handleDeviceDisconnection();
      }
    }
  }, [connected, serialport, logMessage]);

  /**
   * Handle USB device attachment events
   */
  const handleDeviceAttached = useCallback(() => {
    logMessage('USB device attached');
    
    // Record the time of attachment to prevent rapid reconnect cycles
    deviceAttachmentTimeRef.current = Date.now();
    
    // Clear any existing reconnect timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear any reattach delay timeout
    if (reattachDelayTimeoutRef.current) {
      clearTimeout(reattachDelayTimeoutRef.current);
      reattachDelayTimeoutRef.current = null;
    }
    
    // Force immediate device list refresh to show the attached device
    forceDeviceListRefresh();
    
    // Set a short delay for refreshing device list again and attempting connection
    // to allow Android USB subsystem to stabilize
    logMessage('Will refresh device list in 1.5 seconds after device attachment');
    reattachDelayTimeoutRef.current = setTimeout(() => {
      forceDeviceListRefresh().then(deviceList => {
        // If we have a remembered device ID that was detached, try to reconnect to it
        if (lastDetachedDeviceIdRef.current !== null && autoConnect) {
          // Check if the device with that ID is in the list
          const deviceExists = deviceList.some(
            device => device.deviceId === lastDetachedDeviceIdRef.current
          );
          
          if (deviceExists) {
            logMessage(`Attempting to reconnect to previously detached device ${lastDetachedDeviceIdRef.current}`);
            connectDevice(lastDetachedDeviceIdRef.current);
          } else {
            // If the device ID changed after reattachment, connect to first available
            if (deviceList.length > 0) {
              logMessage(`Previously detached device ID changed, connecting to first available device`);
              connectDevice(deviceList[0].deviceId);
            }
          }
          // Reset the stored detached device ID
          lastDetachedDeviceIdRef.current = null;
        }
      });
    }, 1500);
  }, [logMessage, forceDeviceListRefresh, autoConnect, connectDevice]);

  /**
   * Handle USB device detachment events
   */
  const handleDeviceDetached = useCallback(() => {
    logMessage('USB device detached');
    
    // Store the current connected device ID before disconnection
    if (connected && currentDevice !== null) {
      lastDetachedDeviceIdRef.current = currentDevice;
      logMessage(`Remembered detached device ID: ${currentDevice}`);
    }
    
    // If we're connected and device is detached, we'll need to disconnect
    if (connected) {
      handleDeviceDisconnection(true); // true indicates it was a physical detachment
    } else {
      // If not connected, still force a refresh to update UI
      forceDeviceListRefresh();
    }
  }, [logMessage, connected, currentDevice, handleDeviceDisconnection, forceDeviceListRefresh]);

  /**
   * Handle unexpected device disconnection
   */
  const handleDeviceDisconnection = useCallback((isPhysicalDetachment = false) => {
    logMessage(`Handling ${isPhysicalDetachment ? 'physical' : 'unexpected'} device disconnection`);
    
    // Clean up the connection
    try {
      // Clear connection check interval
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
        connectionCheckRef.current = null;
      }
      
      if (subscription) {
        subscription.remove();
        setSubscription(null);
      }
      
      if (serialport) {
        try {
          serialport.close();
        } catch (e) {
          // Ignore errors during close on disconnection
        }
      }
    } catch (error) {
      logMessage(`Error during disconnection cleanup: ${error}`);
    }
    
    // Update state
    setSerialport(null);
    setConnected(false);
    connectionErrorCountRef.current = 0;
    
    // Keep the current device ID for physical detachments, as it might be reattached
    if (!isPhysicalDetachment) {
      setCurrentDevice(null);
    }
    
    // Force device list refresh to update UI immediately
    forceDeviceListRefresh();
    
    // Only attempt to reconnect for non-physical detachments
    // For physical detachments, we'll reconnect when the device is reattached
    if (autoConnect && !isPhysicalDetachment) {
      logMessage('Will try to reconnect in 3 seconds...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        refreshDeviceList();
      }, 3000);
    }
  }, [subscription, serialport, logMessage, autoConnect, refreshDeviceList, forceDeviceListRefresh]);

  /**
   * Connect to a USB device
   */
  const connectDevice = useCallback(async (deviceId: number) => {
    try {
      // Check if we're trying to connect too soon after a device was attached
      const timeSinceAttachment = Date.now() - deviceAttachmentTimeRef.current;
      if (timeSinceAttachment < 1000) {
        logMessage(`Device was attached only ${timeSinceAttachment}ms ago, waiting to stabilize...`);
        
        // Schedule a retry after a delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connectDevice(deviceId);
        }, 1000);
        return;
      }
      
      if (connected && currentDevice === deviceId) {
        logMessage(`Already connected to device ${deviceId}`);
        return;
      }
      
      // If connected to a different device, disconnect first
      if (connected && currentDevice !== null && currentDevice !== deviceId) {
        await disconnectDevice();
      }
      
      // Reset connection error count
      connectionErrorCountRef.current = 0;
      
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
      
      // Refresh device list immediately after connection to update UI
      forceDeviceListRefresh();
      
      // Set up data listener
      const sub = port.onReceived((event: any) => {
        try {
          // Update the timestamp for last received data
          lastDataReceivedRef.current = Date.now();
          
          // Convert received data to array of numbers
          const newData = Array.from(event.data || []);
          
          // Add to buffer
          setDataBuffer(prevBuffer => [...prevBuffer, ...newData]);
          
          if (newData.length > 0) {
            logMessage(`Received ${newData.length} bytes`);
          }
        } catch (error) {
          logMessage(`Error parsing data: ${error}`);
          // Increment error counter on data errors
          connectionErrorCountRef.current++;
          
          // If we've had multiple consecutive data errors, check connection
          if (connectionErrorCountRef.current >= 3) {
            checkConnectionStatus();
          }
        }
      });
      
      // Set up error listener if supported
      if (port.onError) {
        port.onError((error: any) => {
          logMessage(`Serial port error: ${error}`);
          connectionErrorCountRef.current++;
          
          // Immediately check connection on error
          checkConnectionStatus();
        });
      }
      
      // Save subscription for cleanup
      setSubscription(sub);
      
      // Set up connection checking interval
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }
      connectionCheckRef.current = setInterval(checkConnectionStatus, 5000);
      
    } catch (error: any) {
      logMessage(`Error connecting: ${error}`);
      if (error.code === Codes.DEVICE_NOT_FOUND) {
        logMessage('Device not found or permission denied');
      }
      
      // Set up reconnect if auto-connect is enabled
      if (autoConnect) {
        logMessage('Will try to reconnect in 5 seconds...');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          refreshDeviceList();
        }, 5000);
      }
    }
  }, [logMessage, connected, currentDevice, disconnectDevice, autoConnect, checkConnectionStatus, forceDeviceListRefresh]);

  /**
   * Disconnect from a USB device
   */
  const disconnectDevice = useCallback(async () => {
    try {
      // Clear connection check interval
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
        connectionCheckRef.current = null;
      }
      
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
        
        // Refresh device list immediately after disconnection to update UI
        forceDeviceListRefresh();
      }
    } catch (error) {
      logMessage(`Error disconnecting: ${error}`);
      // Even if there's an error, reset the connection state
      setSerialport(null);
      setConnected(false);
      setCurrentDevice(null);
      
      // Still refresh the device list on error
      forceDeviceListRefresh();
    }
  }, [serialport, subscription, logMessage, forceDeviceListRefresh]);

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
   * Toggle auto-connect feature
   */
  const toggleAutoConnect = useCallback(() => {
    setAutoConnect(prev => !prev);
    logMessage(`Auto-connect ${!autoConnect ? 'enabled' : 'disabled'}`);
    
    // If enabling auto-connect and not connected, trigger a refresh
    if (!autoConnect && !connected) {
      refreshDeviceList();
    }
  }, [autoConnect, connected, refreshDeviceList, logMessage]);

  /**
   * Toggle auto-refresh feature
   */
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
    logMessage(`Auto-refresh ${!autoRefresh ? 'enabled' : 'disabled'}`);
    
    // If disabling, clear the interval
    if (autoRefresh && refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    // If enabling, start the interval
    if (!autoRefresh) {
      // Perform an immediate refresh
      forceDeviceListRefresh();
      
      // Then set up interval for future refreshes
      refreshIntervalRef.current = setInterval(refreshDeviceList, 10000);
    }
  }, [autoRefresh, refreshDeviceList, logMessage, forceDeviceListRefresh]);

  /**
   * Initialize USB Serial and set up permissions
   */
  useEffect(() => {
    // Request permissions
    requestUSBPermission();

    // Set up USB device connection monitoring
    if (Platform.OS === 'android') {
      refreshDeviceList();
      
      // Set up auto refresh interval
      if (autoRefresh) {
        refreshIntervalRef.current = setInterval(refreshDeviceList, 10000);
      }
      
      // Subscribe to USB attachment/detachment events
      if (UsbSerialManager.addListener) {
        const attachListener = UsbSerialManager.addListener('onDeviceAttached', handleDeviceAttached);
        const detachListener = UsbSerialManager.addListener('onDeviceDetached', handleDeviceDetached);
        
        // Cleanup function
        return () => {
          // Clear intervals and timeouts
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
          }
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          if (connectionCheckRef.current) {
            clearInterval(connectionCheckRef.current);
          }
          
          if (reattachDelayTimeoutRef.current) {
            clearTimeout(reattachDelayTimeoutRef.current);
          }
          
          // Remove USB event listeners
          if (attachListener) attachListener.remove();
          if (detachListener) detachListener.remove();
          
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
    }
  }, []);

  return {
    devices,
    connected,
    currentDevice,
    dataBuffer,
    autoConnect,
    autoRefresh,
    refreshDeviceList,
    connectDevice,
    disconnectDevice,
    sendCommand,
    toggleAutoConnect,
    toggleAutoRefresh,
    clearBuffer: () => setDataBuffer([]),
  };
};

export default useUsbSerial; 