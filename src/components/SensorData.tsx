import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPM25Category, getPM10Category } from '../utils/sensorUtils';

interface SensorDataProps {
  pm25: number | null;
  pm10: number | null;
  lastUpdate: string | null;
  connected: boolean;
  packetType?: 'standard' | 'modified' | null;
}

const SensorData: React.FC<SensorDataProps> = ({ 
  pm25, 
  pm10, 
  lastUpdate, 
  connected,
  packetType
}) => {
  return (
    <View style={styles.sensorDataContainer}>
      {pm25 === null || pm10 === null ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No valid data packets detected</Text>
          <Text style={styles.noDataSubtext}>
            {connected 
              ? 'Sensor connected. Waiting for valid data...' 
              : 'Connect to a device to start reading'
            }
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.sensorRow}>
            <View style={styles.sensorValue}>
              <Text style={styles.sensorLabel}>PM2.5</Text>
              <Text style={[
                styles.sensorReading, 
                pm25 <= 12 ? styles.goodReading : 
                pm25 <= 35 ? styles.moderateReading : 
                pm25 <= 55 ? styles.unhealthySensitiveReading :
                pm25 <= 150 ? styles.unhealthyReading :
                pm25 <= 250 ? styles.veryUnhealthyReading : 
                styles.hazardousReading
              ]}>
                {pm25.toFixed(1)}
              </Text>
              <Text style={styles.sensorUnit}>µg/m³</Text>
              <Text style={styles.sensorInfo}>
                {getPM25Category(pm25)}
              </Text>
            </View>
            
            <View style={styles.sensorValue}>
              <Text style={styles.sensorLabel}>PM10</Text>
              <Text style={[
                styles.sensorReading,
                pm10 <= 54 ? styles.goodReading : 
                pm10 <= 154 ? styles.moderateReading : 
                pm10 <= 254 ? styles.unhealthySensitiveReading :
                pm10 <= 354 ? styles.unhealthyReading :
                pm10 <= 424 ? styles.veryUnhealthyReading : 
                styles.hazardousReading
              ]}>
                {pm10.toFixed(1)}
              </Text>
              <Text style={styles.sensorUnit}>µg/m³</Text>
              <Text style={styles.sensorInfo}>
                {getPM10Category(pm10)}
              </Text>
            </View>
          </View>
          
          {lastUpdate && (
            <View style={styles.infoContainer}>
              <Text style={styles.lastUpdate}>Last updated: {lastUpdate}</Text>
              {packetType && (
                <Text style={styles.packetType}>
                  Packet format: {packetType === 'standard' 
                    ? 'Standard (AA...AB)' 
                    : 'Modified (0A prefix for each byte)'
                  }
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sensorDataContainer: {
    alignItems: 'center',
    padding: 16,
  },
  sensorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  sensorValue: {
    alignItems: 'center',
    flex: 1,
    padding: 10,
  },
  sensorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  sensorReading: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  sensorUnit: {
    fontSize: 14,
    color: '#666',
  },
  sensorInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  infoContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
  },
  packetType: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
  },
  goodReading: {
    color: '#4CAF50',
  },
  moderateReading: {
    color: '#FFA500',
  },
  unhealthySensitiveReading: {
    color: '#FF5733',
  },
  unhealthyReading: {
    color: '#FF3333',
  },
  veryUnhealthyReading: {
    color: '#FF33FF',
  },
  hazardousReading: {
    color: '#FF3333',
  },
});

export default SensorData; 