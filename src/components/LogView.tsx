import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface LogViewProps {
  logs: string[];
  onClearLogs: () => void;
  connected: boolean;
}

const LogView: React.FC<LogViewProps> = ({ 
  logs, 
  onClearLogs, 
  connected 
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log (Last {logs.length} entries)</Text>
      <ScrollView style={styles.logScroll}>
        {logs.map((entry, index) => (
          <Text key={index} style={styles.logEntry}>{entry}</Text>
        ))}
      </ScrollView>
      
      {/* Add clear log button */}
      <TouchableOpacity 
        style={[styles.button, styles.clearButton]} 
        onPress={onClearLogs}
      >
        <Text style={styles.buttonText}>Clear Log</Text>
      </TouchableOpacity>
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logScroll: {
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    color: '#666',
    paddingVertical: 2,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#F44336',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LogView; 