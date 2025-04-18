import { useState, useEffect } from 'react';
import { extractPMValues, byteArrayToHexString, extractPMValuesFromModifiedFormat, byteArrayToDecString, padHex, convertPairedFormat } from '../utils/sensorUtils';

/**
 * Custom hook for handling SDS011/SDS021 sensor data
 */
interface UseSensorDataProps {
  dataBuffer: number[];
  onLog?: (message: string) => void;
  clearBuffer?: () => void;
}

interface ReadingData {
  pm25: number;
  pm10: number;
  timestamp: Date;
}

interface SensorData {
  pm25: number | null;
  pm10: number | null;
  avgPm25: number | null;
  avgPm10: number | null;
  readingsCount: number;
  lastUpdate: string | null;
  packetType: 'standard' | 'modified' | null;
}

/**
 * Hook for handling sensor data processing
 */
export const useSensorData = ({ dataBuffer, onLog, clearBuffer }: UseSensorDataProps): SensorData => {
  const [pm25, setPm25] = useState<number | null>(null);
  const [pm10, setPm10] = useState<number | null>(null); 
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [packetType, setPacketType] = useState<'standard' | 'modified' | null>(null);
  const [readings, setReadings] = useState<ReadingData[]>([]);
  const [avgPm25, setAvgPm25] = useState<number | null>(null);
  const [avgPm10, setAvgPm10] = useState<number | null>(null);
  
  // Function to add a new reading and calculate averages
  const addReading = (newPm25: number, newPm10: number) => {
    // Create a new reading
    const newReading: ReadingData = {
      pm25: newPm25,
      pm10: newPm10,
      timestamp: new Date()
    };
    
    // Add to readings array, keeping the most recent 10
    const updatedReadings = [...readings, newReading].slice(-10);
    setReadings(updatedReadings);
    
    // Set current values
    setPm25(newPm25);
    setPm10(newPm10);
    setLastUpdate(new Date().toLocaleTimeString());
    
    // Calculate averages
    const avgPm25Value = updatedReadings.reduce((sum, reading) => sum + reading.pm25, 0) / updatedReadings.length;
    const avgPm10Value = updatedReadings.reduce((sum, reading) => sum + reading.pm10, 0) / updatedReadings.length;
    
    // Set average values
    setAvgPm25(parseFloat(avgPm25Value.toFixed(1)));
    setAvgPm10(parseFloat(avgPm10Value.toFixed(1)));
    
    console.log(`[DEBUG] Added reading: PM2.5=${newPm25}, PM10=${newPm10}`);
    console.log(`[DEBUG] Current averages (${updatedReadings.length} readings): PM2.5=${avgPm25Value.toFixed(1)}, PM10=${avgPm10Value.toFixed(1)}`);
  };
  
  // Process buffer whenever it changes
  useEffect(() => {
    console.log(`[DEBUG] Processing buffer of length: ${dataBuffer?.length || 0}`);
    
    if (!dataBuffer || dataBuffer.length < 10) {
      console.log('[DEBUG] Buffer too short, skipping processing');
      return;
    }
    
    // Get the first 20 bytes for analysis
    const previewSlice = dataBuffer.slice(0, Math.min(dataBuffer.length, 20));
    console.log(`[DEBUG] Buffer preview (HEX): ${byteArrayToHexString(previewSlice)}`);
    console.log(`[DEBUG] Buffer preview (DEC): ${byteArrayToDecString(previewSlice)}`);
    
    // Check if previewSlice has expected markers for modified format (0A 0A...0A 0B)
    const convertedslice = byteArrayToDecString(previewSlice)
    const cleanedSlice = convertedslice.split(' ').filter(s => s !== '').join('')
    // Convert the cleaned slice string back to a 10 byte array
    const cleanedBytes = cleanedSlice.match(/.{1,2}/g) || [];

    console.log(`[DEBUG] Converted slice: ${cleanedBytes}`);
    // Process the cleaned bytes if we have 10 bytes
    if (cleanedBytes.length === 10) {
      console.log('[DEBUG] Processing 10 cleaned bytes:', cleanedBytes.join(' '));
      
      // Convert hex strings back to numbers
      const cleanedNumbers = cleanedBytes.map(byte => parseInt(byte, 16));
      console.log('[DEBUG] Converted to numbers:', cleanedNumbers);

      // Try extracting values from the cleaned bytes
      try {
        const pm25Direct = cleanedNumbers[2];
        const pm10Direct = cleanedNumbers[4];
        
        // Use the formula matching the Java code: (high_byte*256 + low_byte)/10
        const pm25 = (cleanedNumbers[3]*256 + cleanedNumbers[2])/10;
        const pm10 = (cleanedNumbers[5]*256 + cleanedNumbers[4])/10;

        if (pm25 >= 0 && pm25 <= 999 && pm10 >= 0 && pm10 <= 999) {
          console.log(`[DEBUG] Found valid values using Java formula: PM2.5=${pm25}, PM10=${pm10}`);
          
          // Add reading and update averages
          addReading(pm25, pm10);
          setPacketType('modified');
          
          if (onLog) {
            onLog(`Parsed values with formula: PM2.5=${pm25.toFixed(1)}, PM10=${pm10.toFixed(1)}`);
          }
          
          // Clear buffer after successful processing
          if (clearBuffer) {
            clearBuffer();
            console.log('[DEBUG] Buffer cleared after successful data extraction');
          }
          
          return;
        }
      } catch (err) {
        console.log('[DEBUG] Error processing cleaned bytes:', err);
      }
    }
 
    
    // Fall back to standard search if modified format not found or processing failed
    console.log('[DEBUG] Searching for standard 10-byte packets');
    for (let i = 0; i < dataBuffer.length - 10; i++) {
      if (dataBuffer[i] === 0xAA && dataBuffer[i + 9] === 0xAB) {
        console.log(`[DEBUG] Potential standard packet found at position ${i}`);
        const packet = dataBuffer.slice(i, i + 10);
        console.log(`[DEBUG] Standard packet (HEX): ${byteArrayToHexString(packet)}`);
        console.log(`[DEBUG] Standard packet (DEC): ${byteArrayToDecString(packet)}`);
        
        const values = extractPMValues(packet);
        
        if (values) {
          console.log(`[DEBUG] Valid standard packet confirmed, PM2.5: ${values.pm25}, PM10: ${values.pm10}`);
          
          // Add reading and update averages
          addReading(values.pm25, values.pm10);
          setPacketType('standard');
          
          if (onLog) {
            onLog(`Standard packet found: ${byteArrayToHexString(packet)}`);
            onLog(`Valid values extracted: PM2.5=${values.pm25.toFixed(1)}, PM10=${values.pm10.toFixed(1)}`);
          }
          
          // Clear buffer after successful processing
          if (clearBuffer) {
            clearBuffer();
            console.log('[DEBUG] Buffer cleared after successful data extraction');
          }
          
          return; // Exit once we find a valid packet
        }
      }
    }
    
    console.log('[DEBUG] No valid packets found in buffer');
  }, [dataBuffer, onLog, clearBuffer]);
  
  return { 
    pm25, 
    pm10, 
    avgPm25,
    avgPm10,
    readingsCount: readings.length,
    lastUpdate, 
    packetType 
  };
};

export default useSensorData; 