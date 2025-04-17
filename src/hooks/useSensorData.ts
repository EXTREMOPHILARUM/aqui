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

interface SensorData {
  pm25: number | null;
  pm10: number | null;
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
  const [lastProcessedLength, setLastProcessedLength] = useState<number>(0);
  
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

        if (pm25Direct >= 0 && pm25Direct <= 999 && pm10Direct >= 0 && pm10Direct <= 999) {
          console.log(`[DEBUG] Found valid values in cleaned bytes: PM2.5=${pm25Direct}, PM10=${pm10Direct}`);
          setPm25(pm25Direct);
          setPm10(pm10Direct); 
          setLastUpdate(new Date().toLocaleTimeString());
          setPacketType('modified');
          
          if (onLog) {
            onLog(`Parsed values from cleaned bytes: PM2.5=${pm25Direct}, PM10=${pm10Direct}`);
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
          setPm25(values.pm25);
          setPm10(values.pm10);
          setLastUpdate(new Date().toLocaleTimeString());
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
  
  return { pm25, pm10, lastUpdate, packetType };
};

export default useSensorData; 