// App.js
import React from 'react';
import { LogBox } from 'react-native';
import { UserProvider } from './src/context/UserContext';
import { GroupProvider } from './src/context/GroupContext';
import AppNavigator from './src/navigation/AppNavigator';

// Ocultamos warnings irrelevantes
LogBox.ignoreLogs([
  'WebChannelConnection RPC',
  'expo-notifications',
  'ReferenceError: Property \'user\''
]);

export default function App() {
  return (
    <UserProvider>
      <GroupProvider>
        <AppNavigator />
      </GroupProvider>
    </UserProvider>
  );
}
