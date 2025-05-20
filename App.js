// App.js
import React from 'react';
import { LogBox } from 'react-native';
import { UserProvider } from './src/context/UserContext';
import { GroupProvider } from './src/context/GroupContext';
import { ThemeProvider } from './src/context/ThemeContext'; // Importa ThemeProvider
import AppNavigator from './src/navigation/AppNavigator';

LogBox.ignoreLogs([
  'WebChannelConnection RPC',
  'expo-notifications',
  'ReferenceError: Property \'user\''
]);

export default function App() {
  return (
    <UserProvider>
      <GroupProvider>
        <ThemeProvider> {/* Envuelve AppNavigator con ThemeProvider */}
          <AppNavigator />
        </ThemeProvider>
      </GroupProvider>
    </UserProvider>
  );
}
