// App.js
import React from 'react';
import { LogBox } from 'react-native';
import { UserProvider } from './src/context/UserContext';
import { GroupProvider } from './src/context/GroupContext';
import { ThemeProvider } from './src/context/ThemeContext';  // Importar
import AppNavigator from './src/navigation/AppNavigator';

LogBox.ignoreLogs([
  'WebChannelConnection RPC',
  'expo-notifications',
  'ReferenceError: Property \'user\''
]);

export default function App() {
  return ( // <-- Revisa aquí
    <UserProvider>
      <GroupProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </GroupProvider>
    </UserProvider>
  ); // <-- Y aquí
}
