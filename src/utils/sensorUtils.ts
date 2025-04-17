/**
 * Utility functions for SDS011/SDS021 sensor data handling
 */

/**
 * Pad a hexadecimal number to 2 digits
 */
export const padHex = (num: number): string => {
  return num.toString(16).padStart(2, '0');
};

/**
 * Convert a byte array to a hexadecimal string
 */
export const byteArrayToHexString = (bytes: number[]): string => {
  return bytes.map(byte => padHex(byte)).join(' ');
};

/**
 * Convert modified 20-byte format (with modified pattern) to standard 10-byte format
 * @param modifiedBuffer The 20-byte buffer with modified format
 * @returns The converted 10-byte standard format buffer, or null if not a valid modified format
 */
export const convertModifiedFormat = (modifiedBuffer: number[]): number[] | null => {
  console.log(`[DEBUG] Attempting to convert buffer: ${byteArrayToHexString(modifiedBuffer)}`);
  
  // Check if buffer is the correct length
  if (modifiedBuffer.length !== 20) {
    console.log(`[DEBUG] Invalid buffer length: ${modifiedBuffer.length}`);
    return null;
  }

  // Check for the expected start and end markers
  const hasCorrectStartMarkers = modifiedBuffer[0] === 0x0A && modifiedBuffer[1] === 0x0A;
  const hasCorrectEndMarkers = modifiedBuffer[18] === 0x0A && modifiedBuffer[19] === 0x0B;
  
  // Log what we're seeing
  console.log(`[DEBUG] Start markers: ${modifiedBuffer[0]} ${modifiedBuffer[1]}, End markers: ${modifiedBuffer[18]} ${modifiedBuffer[19]}`);
  console.log(`[DEBUG] Has correct start: ${hasCorrectStartMarkers}, Has correct end: ${hasCorrectEndMarkers}`);
  
  // Be more flexible - try conversion if either start or end markers match
  if (!hasCorrectStartMarkers && !hasCorrectEndMarkers) {
    console.log(`[DEBUG] Neither start nor end markers match expected pattern`);
    return null;
  }

  // Extract bytes for standard format - this is an educated guess based on the observed pattern
  // We're assuming payload data is in the odd positions, but this may need adjustment
  const standardBuffer = [];
  standardBuffer.push(0xAA); // First byte is always 0xAA in standard format
  
  // Extract what appear to be data bytes from the modified format
  // Take bytes from positions 2, 4, 6, 8, etc. as data bytes
  for (let i = 2; i < 18; i += 2) {
    standardBuffer.push(modifiedBuffer[i]);
  }
  
  standardBuffer.push(0xAB); // Last byte is always 0xAB in standard format
  
  console.log(`[DEBUG] Constructed standard buffer: ${byteArrayToHexString(standardBuffer)}`);
  
  // Verify the constructed buffer has 10 bytes
  if (standardBuffer.length !== 10) {
    console.log(`[DEBUG] Invalid constructed buffer length: ${standardBuffer.length}`);
    return null;
  }

  return standardBuffer;
};

/**
 * Calculate checksum for SDS011/SDS021 packet
 * Checksum is the sum of bytes 2-7 modulo 256
 */
export const calculateChecksum = (data: number[]): number => {
  let checksum = 0;
  for (let i = 2; i < 8; i++) {
    checksum += data[i];
  }
  return checksum & 0xFF;
};

/**
 * Extract PM2.5 and PM10 values from a valid SDS011/SDS021 packet
 * Supports both standard format (AA...AB) and modified format (0A 0A...0A 0B)
 * @param buffer The buffer containing the packet starting at index 0
 * @returns Object with pm25 and pm10 values, or null if invalid
 */
export const extractPMValues = (buffer: number[]): { pm25: number, pm10: number } | null => {
  console.log(`[DEBUG] Extracting values from buffer: ${byteArrayToHexString(buffer)}`);
  let standardBuffer = buffer;
  
  // If this might be a modified format (20 bytes), try to convert it
  if (buffer.length === 20) {
    console.log(`[DEBUG] Detected 20-byte buffer, attempting conversion`);
    const converted = convertModifiedFormat(buffer);
    if (converted) {
      console.log(`[DEBUG] Using converted standard buffer`);
      standardBuffer = converted;
    } else {
      console.log(`[DEBUG] Conversion failed, using original buffer`);
    }
  }
  
  // Now we only need to process the standard format
  if (standardBuffer.length === 10 && standardBuffer[0] === 0xAA && standardBuffer[9] === 0xAB) {
    console.log(`[DEBUG] Processing standard 10-byte format`);
    // Extract bytes for PM2.5 and PM10
    const pm25Low = standardBuffer[2];
    const pm25High = standardBuffer[3];
    const pm10Low = standardBuffer[4];
    const pm10High = standardBuffer[5];
    
    console.log(`[DEBUG] Raw bytes - PM2.5: ${pm25Low},${pm25High}, PM10: ${pm10Low},${pm10High}`);
    
    // Calculate values using SDS011/SDS021 formula
    const pm25 = ((pm25High * 256) + pm25Low) / 10;
    const pm10 = ((pm10High * 256) + pm10Low) / 10;
    
    console.log(`[DEBUG] Calculated values - PM2.5: ${pm25}, PM10: ${pm10}`);
    
    // Only return reasonable values
    if (pm25 < 0 || pm25 > 1000 || pm10 < 0 || pm10 > 1000) {
      console.log(`[DEBUG] Values out of reasonable range, returning null`);
      return null;
    }
    
    console.log(`[DEBUG] Returning valid PM values`);
    return { pm25, pm10 };
  }
  
  console.log(`[DEBUG] No valid packet format found, returning null`);
  return null;
};

/**
 * Get AQI category for PM2.5 value
 */
export const getPM25Category = (value: number): string => {
  if (value <= 12) return 'Good';
  if (value <= 35) return 'Moderate';
  if (value <= 55) return 'Unhealthy for Sensitive Groups';
  if (value <= 150) return 'Unhealthy';
  if (value <= 250) return 'Very Unhealthy';
  return 'Hazardous';
};

/**
 * Get AQI category for PM10 value
 */
export const getPM10Category = (value: number): string => {
  if (value <= 54) return 'Good';
  if (value <= 154) return 'Moderate';
  if (value <= 254) return 'Unhealthy for Sensitive Groups';
  if (value <= 354) return 'Unhealthy';
  if (value <= 424) return 'Very Unhealthy';
  return 'Hazardous';
};

/**
 * Get the style class name for a PM value based on its category
 */
export const getPMCategoryStyle = (value: number, isPM25: boolean): string => {
  const category = isPM25 ? getPM25Category(value) : getPM10Category(value);
  
  switch (category) {
    case 'Good': return 'goodReading';
    case 'Moderate': return 'moderateReading';
    case 'Unhealthy for Sensitive Groups': return 'unhealthySensitiveReading';
    case 'Unhealthy': return 'unhealthyReading';
    case 'Very Unhealthy': return 'veryUnhealthyReading';
    default: return 'hazardousReading';
  }
};

/**
 * SDS011/SDS021 command types
 */
export const SensorCommands = {
  WAKE: 'wake',
  SLEEP: 'sleep',
  READ: 'read',
};

/**
 * Generate command bytes for SDS011/SDS021 commands
 */
export const generateCommandBytes = (command: string): number[] => {
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
    case SensorCommands.WAKE:
      cmdArray[2] = 0x06; // Set sleep/work mode
      cmdArray[3] = 0x01; // 1 = work mode
      break;
    case SensorCommands.READ:
      cmdArray[2] = 0x04; // Request data
      cmdArray[3] = 0x00; // 0 = no argument needed
      break;
    case SensorCommands.SLEEP:
      cmdArray[2] = 0x06; // Set sleep/work mode
      cmdArray[3] = 0x00; // 0 = sleep mode
      break;
    default:
      cmdArray[2] = 0x06; // Default to wake
      cmdArray[3] = 0x01;
  }
  
  // Calculate checksum
  cmdArray[18] = calculateChecksum(cmdArray);
  
  return cmdArray;
}; 