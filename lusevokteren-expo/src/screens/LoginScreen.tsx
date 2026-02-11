import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const { signIn, signUp } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Feil', 'Vennligst fyll ut alle feltene');
      return;
    }

    if (isSignUp && !name) {
      Alert.alert('Feil', 'Vennligst oppgi navn');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name);
        Alert.alert('Suksess', 'Konto opprettet!');
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      Alert.alert('Feil', error.message || 'Noe gikk galt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>FjordVind</Text>
        <Text style={styles.subtitle}>Lusevokteren</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>{isSignUp ? 'Opprett konto' : 'Logg inn'}</Text>

        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Navn"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="E-post"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Passord"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Opprett konto' : 'Logg inn'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchText}>
            {isSignUp
              ? 'Har du allerede en konto? Logg inn'
              : 'Har du ikke en konto? Opprett en'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#3b82f6',
    fontSize: 14,
  },
});
