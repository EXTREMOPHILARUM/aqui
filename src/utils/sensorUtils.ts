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
 * Convert a byte array to a decimal string for easier comparison
 */
export const byteArrayToDecString = (bytes: number[]): string => {
  return bytes.map(byte => byte.toString().padStart(3, ' ')).join(' ');
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
 * Extract PM2.5 and PM10 values directly from the modified 20-byte format
 * @param buffer The 20-byte buffer with modified format
 * @returns Object with pm25 and pm10 values, or null if invalid
 */
export const extractPMValuesFromModifiedFormat = (buffer: number[]): { pm25: number, pm10: number } | null => {
  console.log(`[DEBUG] DIRECT EXTRACTION called with buffer:`);
  console.log(`[DEBUG] HEX: ${byteArrayToHexString(buffer)}`);
  console.log(`[DEBUG] DEC: ${byteArrayToDecString(buffer)}`);
  
  // Check if buffer has correct length and markers
  if (buffer.length !== 20) {
    console.log(`[DEBUG] Modified format has incorrect length: ${buffer.length}`);
    return null;
  }
  
  // Raw decimal values log for analysis
  console.log(`[DEBUG] Decimal values of all 20 bytes:`);
  for (let i = 0; i < 20; i++) {
    console.log(`[DEBUG] byte[${i}] = ${buffer[i]}`);
  }
  
  console.log(`[DEBUG] ====== TRYING DIRECT EXTRACTION FROM MODIFIED FORMAT ======`);
  
  // Try all possible positions for PM data bytes
  // Based on standard SDS011 format, we expect PM2.5 data at positions 2-3 and PM10 at positions 4-5
  // In the modified format, these may be at different positions
  
  // Try direct use of values at positions 2 and 4 (they might be the actual values)
  let pm25 = buffer[2];
  let pm10 = buffer[4];
  
  console.log(`[DEBUG] Direct values - PM2.5: ${pm25}, PM10: ${pm10}`);
  
  // If values look reasonable, return them
  if (pm25 >= 0 && pm25 <= 999 && pm10 >= 0 && pm10 <= 999) {
    console.log('[DEBUG] Direct values are reasonable');
    return { pm25, pm10 };
  }
  
  // Try using values directly at positions 2 and 4, divided by 10
  pm25 = buffer[2] / 10;
  pm10 = buffer[4] / 10;
  
  console.log(`[DEBUG] Direct values (÷10) - PM2.5: ${pm25}, PM10: ${pm10}`);
  
  // If values look reasonable, return them
  if (pm25 >= 0 && pm25 <= 99.9 && pm10 >= 0 && pm10 <= 99.9) {
    console.log('[DEBUG] Direct values (÷10) are reasonable');
    return { pm25, pm10 };
  }
  
  // Try using different positions (8, 12)
  pm25 = buffer[8];
  pm10 = buffer[12];
  
  console.log(`[DEBUG] Alternative positions (8, 12) - PM2.5: ${pm25}, PM10: ${pm10}`);
  
  // If values look reasonable, return them
  if (pm25 >= 0 && pm25 <= 999 && pm10 >= 0 && pm10 <= 999) {
    console.log('[DEBUG] Alternative positions (8, 12) values are reasonable');
    return { pm25, pm10 };
  }
  
  // Try standard formula but with different byte positions
  // Try first hypothesis: PM2.5 at positions 2-3, PM10 at positions 4-5
  let pm25Low = buffer[2];
  let pm25High = buffer[3];
  let pm10Low = buffer[4];
  let pm10High = buffer[5];
  
  console.log(`[DEBUG] Hypothesis 1 - PM2.5 bytes: ${pm25Low}(${padHex(pm25Low)}),${pm25High}(${padHex(pm25High)}), PM10 bytes: ${pm10Low}(${padHex(pm10Low)}),${pm10High}(${padHex(pm10High)})`);
  
  // Calculate values
  pm25 = ((pm25High * 256) + pm25Low) / 10;
  pm10 = ((pm10High * 256) + pm10Low) / 10;
  
  console.log(`[DEBUG] Hypothesis 1 - Calculated PM2.5: ${pm25}, PM10: ${pm10}`);
  
  // If values look reasonable, return them
  if (pm25 >= 0 && pm25 < 1000 && pm10 >= 0 && pm10 < 1000) {
    console.log('[DEBUG] Hypothesis 1 values are reasonable');
    return { pm25, pm10 };
  } else {
    console.log(`[DEBUG] Hypothesis 1 values outside reasonable range: PM2.5=${pm25}, PM10=${pm10}`);
  }
  
  // No valid hypothesis found
  console.log('[DEBUG] ====== ALL HYPOTHESES FAILED. NO VALID PM VALUES FOUND ======');
  return null;
};

/**
 * Extract PM2.5 and PM10 values from a valid SDS011/SDS021 packet
 * Supports both standard format (AA...AB) and modified format (0A 0A...0A 0B)
 * @param buffer The buffer containing the packet starting at index 0
 * @returns Object with pm25 and pm10 values, or null if invalid
 */
export const extractPMValues = (buffer: number[]): { pm25: number, pm10: number } | null => {
  console.log(`[DEBUG] === extractPMValues called with buffer: ${byteArrayToHexString(buffer)} ===`);
  
  // First check if this is a modified format and try direct extraction
  if (buffer.length === 20 && buffer[0] === 0x0A && buffer[1] === 0x0A) {
    console.log('[DEBUG] Detected 20-byte modified format, attempting direct extraction');
    const modifiedValues = extractPMValuesFromModifiedFormat(buffer);
    if (modifiedValues) {
      console.log(`[DEBUG] Direct extraction successful: PM2.5=${modifiedValues.pm25}, PM10=${modifiedValues.pm10}`);
      return modifiedValues;
    } else {
      console.log('[DEBUG] Direct extraction failed for modified format');
    }
  } else if (buffer.length === 20) {
    console.log('[DEBUG] 20-byte buffer but not modified format (doesn\'t start with 0A 0A)');
  }
  
  // If this is a standard format, process normally
  if (buffer.length === 10 && buffer[0] === 0xAA && buffer[9] === 0xAB) {
    console.log(`[DEBUG] Processing standard 10-byte format`);
    // Extract bytes for PM2.5 and PM10
    const pm25Low = buffer[2];
    const pm25High = buffer[3];
    const pm10Low = buffer[4];
    const pm10High = buffer[5];
    
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
    
    console.log(`[DEBUG] Returning valid PM values from standard format`);
    return { pm25, pm10 };
  }
  
  // Try conversion as a last resort
  if (buffer.length === 20) {
    console.log(`[DEBUG] Trying conversion path for 20-byte buffer`);
    try {
      const converted = convertModifiedFormat(buffer);
      if (converted) {
        console.log(`[DEBUG] Conversion successful, standard buffer: ${byteArrayToHexString(converted)}`);
        
        // Process the converted buffer
        const pm25Low = converted[2];
        const pm25High = converted[3];
        const pm10Low = converted[4];
        const pm10High = converted[5];
        
        console.log(`[DEBUG] Converted bytes - PM2.5: ${pm25Low},${pm25High}, PM10: ${pm10Low},${pm10High}`);
        
        // Calculate values
        const pm25 = ((pm25High * 256) + pm25Low) / 10;
        const pm10 = ((pm10High * 256) + pm10Low) / 10;
        
        console.log(`[DEBUG] Calculated from converted - PM2.5: ${pm25}, PM10: ${pm10}`);
        
        // Only return reasonable values
        if (pm25 >= 0 && pm25 < 1000 && pm10 >= 0 && pm10 < 1000) {
          console.log(`[DEBUG] Converted values are reasonable`);
          return { pm25, pm10 };
        } else {
          console.log(`[DEBUG] Converted values out of range: PM2.5=${pm25}, PM10=${pm10}`);
        }
      } else {
        console.log(`[DEBUG] Conversion failed, no valid standard buffer produced`);
      }
    } catch (error) {
      console.log(`[DEBUG] Error during conversion: ${error}`);
    }
  }
  
  console.log(`[DEBUG] All extraction methods failed, returning null`);
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

/**
 * Convert modified 20-byte format to 10-byte format by combining pairs of bytes
 * @param modifiedBuffer The 20-byte buffer
 * @returns A 10-byte buffer where each byte is extracted by combining pairs
 */
export const convertPairedFormat = (modifiedBuffer: number[]): number[] | null => {
  console.log(`[DEBUG] Converting paired bytes from 20-byte buffer: ${byteArrayToHexString(modifiedBuffer)}`);
  
  // Check if buffer has the right length
  if (modifiedBuffer.length !== 20) {
    console.log(`[DEBUG] Invalid buffer length for pairing: ${modifiedBuffer.length}`);
    return null;
  }
  
  // Create a 10-byte buffer by pairing consecutive bytes
  const result = [];
  for (let i = 0; i < 20; i += 2) {
    // Various ways to combine bytes - try different approaches
    
    // Option 1: Simply use the first byte of each pair (this seems to be what the sensor is doing)
    const firstByteValue = modifiedBuffer[i];
    
    // Option 2: Use second byte of each pair
    const secondByteValue = modifiedBuffer[i + 1];
    
    // Option 3: Sum of the two bytes (limited to 0-255)
    const sumValue = (modifiedBuffer[i] + modifiedBuffer[i + 1]) & 0xFF;
    
    // Option 4: Combine as 16-bit value (high byte * 256 + low byte)
    const combined16bit = (modifiedBuffer[i] << 8) | modifiedBuffer[i + 1];
    
    // Log all options for analysis
    console.log(`[DEBUG] Pair ${i}-${i+1}: ${modifiedBuffer[i]}/${modifiedBuffer[i+1]} → First: ${firstByteValue}, Second: ${secondByteValue}, Sum: ${sumValue}, 16-bit: ${combined16bit}`);
    
    // Use Option 1 by default - first byte of each pair
    result.push(firstByteValue);
  }
  
  console.log(`[DEBUG] Converted 10-byte result: ${byteArrayToHexString(result)}`);
  return result;
}; 