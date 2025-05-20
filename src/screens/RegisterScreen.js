// src/screens/RegisterScreen.js
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

export default function RegisterScreen({ navigation }) {
  const { user, register, logout } = useContext(UserContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Si ya hay sesión iniciada, muestra sólo logout
  if (user) {
    return (
      <View style={styles.container}>
        <Text style={styles.info}>Ya registrado como {user.name}</Text>
        <Button title="Cerrar sesión" onPress={logout} />
      </View>
    );
  }

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      Alert.alert(
        'Error',
        'Rellena todos los campos y usa al menos 6 caracteres en la contraseña'
      );
      return;
    }
    try {
      await register(name.trim(), email.trim(), password);
      // ELIMINADO: navigation.navigate('Login');
      // React Navigation manejará la redirección automáticamente
      // basándose en el cambio de estado de 'user' en UserContext.
      // Opcionalmente, puedes mostrar un mensaje indicando que el registro fue exitoso
      // y que será redirigido, aunque la transición suele ser rápida.
      // Por ejemplo:
      // Alert.alert(
      //   'Registro Exitoso',
      //   'Tu cuenta ha sido creada. Serás redirigido automáticamente.'
      // );
      // No es estrictamente necesario navegar aquí, el cambio de estado lo hará.
    } catch (err) {
      Alert.alert('Error de Registro', err.message); // Mensaje de error más específico
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nombre"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address" // Buen añadido para el campo email
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
      <Button title="Registrarse" onPress={handleRegister} />
      {/* El botón para ir a Login si el usuario decide no registrarse */}
      <Button
        title="Ya tengo cuenta, Iniciar Sesión"
        onPress={() => navigation.navigate('Login')} 
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
    padding: 10, // Aumentado para mejor tacto
    marginBottom: 12,
    borderRadius: 5 // Bordes ligeramente redondeados
  },
  info: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center'
  }
});
