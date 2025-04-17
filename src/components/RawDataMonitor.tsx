import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { byteArrayToHexString } from '../utils/sensorUtils';

interface RawDataMonitorProps {
  dataBuffer: number[];
  connected: boolean;
}

const RawDataMonitor: React.FC<RawDataMonitorProps> = ({ dataBuffer, connected }) => {
  if (!connected) return null;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Raw Data Monitor</Text>
      <Text style={styles.explanationText}>
        This shows raw hexadecimal data from the sensor. SDS011/SDS021 packets start with AA and end with AB.
      </Text>
      <ScrollView 
        style={styles.rawDataContainer}
        horizontal={true}
      >
        <Text style={styles.rawData}>
          {dataBuffer.length > 0 
            ? byteArrayToHexString(dataBuffer)
            : 'No data in buffer'}
        </Text>
      </ScrollView>
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
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  rawDataContainer: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
  },
  rawData: {
    fontSize: 12,
    color: '#666',
  },
});

export default RawDataMonitor; 