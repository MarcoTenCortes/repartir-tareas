// src/screens/LoginScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Text
} from 'react-native';
import { UserContext } from '../context/UserContext';

export default function LoginScreen({ navigation }) {
  const { user, login, logout } = useContext(UserContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Si ya hay sesión iniciada, muestra sólo logout
  if (user) {
    return (
      <View style={styles.container}>
        <Text style={styles.info}>Sesión iniciada como {user.name}</Text>
        <Button title="Cerrar sesión" onPress={logout} />
      </View>
    );
  }

  const handleLogin = async () => {
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Iniciar sesión" onPress={handleLogin} />
      <Button
        title="Registrarse"
        onPress={() => navigation.navigate('Register')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 12,
    borderRadius: 4
  },
  info: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center'
  }
});
