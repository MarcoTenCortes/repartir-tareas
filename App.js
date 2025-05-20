// App.js
import React from 'react';
import { LogBox, StyleSheet } from 'react-native'; // StyleSheet para el estilo flex:1
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Importar
import { UserProvider } from './src/context/UserContext';
import { GroupProvider } from './src/context/GroupContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

LogBox.ignoreLogs([
  'WebChannelConnection RPC',
  'expo-notifications',
  'ReferenceError: Property \'user\''
]);

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}> 
      <UserProvider>
        <GroupProvider>
          <ThemeProvider>
            <AppNavigator />
          </ThemeProvider>
        </GroupProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ // Añadir StyleSheet para el estilo flex:1
  container: {
    flex: 1,
  },
});
