import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function GoogleSignIn() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google sign-in (placeholder)</Text>
      <Text style={styles.hint}>Implement Google auth integration here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  hint: { color: '#666' },
});
