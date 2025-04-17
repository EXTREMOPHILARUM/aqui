import { useState, useEffect } from 'react';
import { extractPMValues, byteArrayToHexString, convertModifiedFormat } from '../utils/sensorUtils';

/**
 * Custom hook for handling SDS011/SDS021 sensor data
 */
interface UseSensorDataProps {
  dataBuffer: number[];
  onLog?: (message: string) => void;
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
export const useSensorData = ({ dataBuffer, onLog }: UseSensorDataProps): SensorData => {
  const [pm25, setPm25] = useState<number | null>(null);
  const [pm10, setPm10] = useState<number | null>(null); 
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [packetType, setPacketType] = useState<'standard' | 'modified' | null>(null);
  
  // Process buffer whenever it changes
  useEffect(() => {
    console.log(`[DEBUG] Processing buffer of length: ${dataBuffer?.length || 0}`);
    
    if (!dataBuffer || dataBuffer.length < 10) {
      console.log('[DEBUG] Buffer too short, skipping processing');
      return;
    }
    
    console.log(`[DEBUG] Buffer preview: ${byteArrayToHexString(dataBuffer.slice(0, Math.min(dataBuffer.length, 30)))}`);
    
    // Look for standard 10-byte packets (AA...AB)
    console.log('[DEBUG] Searching for standard 10-byte packets');
    for (let i = 0; i < dataBuffer.length - 10; i++) {
      if (dataBuffer[i] === 0xAA && dataBuffer[i + 9] === 0xAB) {
        console.log(`[DEBUG] Potential standard packet found at position ${i}`);
        const packet = dataBuffer.slice(i, i + 10);
        console.log(`[DEBUG] Standard packet: ${byteArrayToHexString(packet)}`);
        
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
          
          console.log('[DEBUG] Exiting after finding valid standard packet');
          return; // Exit once we find a valid packet
        } else {
          console.log('[DEBUG] Packet structure valid but values invalid, continuing search');
        }
      }
    }
    
    // Look for modified 20-byte packets (with 0A prefix pattern)
    console.log('[DEBUG] No valid standard packets found, searching for modified 20-byte packets');
    for (let i = 0; i < dataBuffer.length - 20; i++) {
      // Look for start and end markers of a potential modified packet
      // Based on observed data, we're seeing 0A 0A at start and 0A 0B near the end
      const hasStartMarker = dataBuffer[i] === 0x0A && dataBuffer[i + 1] === 0x0A;
      const hasEndMarker = dataBuffer[i + 18] === 0x0A && dataBuffer[i + 19] === 0x0B;
      
      // Log what we're seeing for diagnosis
      if (hasStartMarker) {
        console.log(`[DEBUG] Potential packet start at ${i}: ${dataBuffer[i]} ${dataBuffer[i+1]}`);
      }
      
      if (hasEndMarker) {
        console.log(`[DEBUG] Potential packet end at ${i+18}: ${dataBuffer[i+18]} ${dataBuffer[i+19]}`);
      }
      
      // Only check if we have at least one of the markers
      if (!hasStartMarker && !hasEndMarker) {
        continue;
      }
      
      console.log(`[DEBUG] Potential modified packet at position ${i}: Start marker: ${hasStartMarker}, End marker: ${hasEndMarker}`);
      
      // Try to convert a 20-byte segment to the standard format
      const possibleModifiedPacket = dataBuffer.slice(i, i + 20);
      console.log(`[DEBUG] Checking segment: ${byteArrayToHexString(possibleModifiedPacket)}`);
      
      // Also try the extraction directly
      const values = extractPMValues(possibleModifiedPacket);
      if (values) {
        console.log(`[DEBUG] Direct extraction successful, PM2.5: ${values.pm25}, PM10: ${values.pm10}`);
        setPm25(values.pm25);
        setPm10(values.pm10);
        setLastUpdate(new Date().toLocaleTimeString());
        setPacketType('modified');
        
        if (onLog) {
          onLog(`Modified packet found with direct extraction: ${byteArrayToHexString(possibleModifiedPacket)}`);
          onLog(`Valid values extracted: PM2.5=${values.pm25.toFixed(1)}, PM10=${values.pm10.toFixed(1)}`);
        }
        
        console.log('[DEBUG] Exiting after finding valid packet with direct extraction');
        return;
      }
      
      // If direct extraction failed, try the conversion path
      const standardPacket = convertModifiedFormat(possibleModifiedPacket);
      
      if (standardPacket) {
        console.log('[DEBUG] Successfully converted to standard packet');
        // We found a valid modified packet and converted it to standard format
        const convertedValues = extractPMValues(standardPacket);
        
        if (convertedValues) {
          console.log(`[DEBUG] Valid modified packet confirmed, PM2.5: ${convertedValues.pm25}, PM10: ${convertedValues.pm10}`);
          setPm25(convertedValues.pm25);
          setPm10(convertedValues.pm10);
          setLastUpdate(new Date().toLocaleTimeString());
          setPacketType('modified');
          
          if (onLog) {
            onLog(`Modified packet found: ${byteArrayToHexString(possibleModifiedPacket)}`);
            onLog(`Converted to standard: ${byteArrayToHexString(standardPacket)}`);
            onLog(`Valid values extracted: PM2.5=${convertedValues.pm25.toFixed(1)}, PM10=${convertedValues.pm10.toFixed(1)}`);
          }
          
          console.log('[DEBUG] Exiting after finding valid modified packet');
          return; // Exit once we find a valid packet
        } else {
          console.log('[DEBUG] Conversion successful but values invalid, continuing search');
        }
      } else {
        console.log('[DEBUG] Not a valid modified packet, continuing search');
      }
    }
    
    console.log('[DEBUG] No valid packets found in buffer');
  }, [dataBuffer, onLog]);
  
  return { pm25, pm10, lastUpdate, packetType };
};

export default useSensorData; 