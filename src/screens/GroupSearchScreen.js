// src/screens/GroupSearchScreen.js
import React, { useState, useContext } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native'; // ActivityIndicator añadido
import { UserContext } from '../context/UserContext';

export default function GroupSearchScreen({ navigation }) {
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Estado para la carga de búsqueda
  const [isJoining, setIsJoining] = useState(null); // Estado para la carga de unirse (por ID de grupo)
  const { getGroupByName, joinGroup, user, groups: userGroups } = useContext(UserContext);

  const handleSearch = async () => {
    if (!queryText.trim()) {
      Alert.alert('Entrada requerida', 'Introduce un nombre de grupo para buscar.');
      return;
    }
    setIsLoading(true);
    setResults([]); // Limpiar resultados anteriores
    try {
      console.log(`[GroupSearchScreen] Buscando grupo: "${queryText.trim()}"`);
      const groupsFound = await getGroupByName(queryText.trim());
      console.log("[GroupSearchScreen] Grupos encontrados por getGroupByName:", JSON.stringify(groupsFound, null, 2));
      setResults(groupsFound);
      if (groupsFound.length === 0) {
        Alert.alert('Sin resultados', 'No se encontraron grupos con ese nombre.');
      }
    } catch (error) {
      console.error("[GroupSearchScreen] Error durante la búsqueda:", error);
      Alert.alert('Error de búsqueda', `Ocurrió un error: ${error.message}. Revisa la consola para más detalles.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (groupId, groupName) => {
    setIsJoining(groupId); // Marcar este ítem como "uniéndose"
    try {
      const isAlreadyMember = userGroups.some(g => g.id === groupId);
      if (isAlreadyMember) {
        Alert.alert('Información', 'Ya eres miembro de este grupo.');
        return;
      }
      // La función joinGroup en UserContext ya maneja la lógica de solicitudes pendientes.
      await joinGroup(groupId, groupName);
      Alert.alert('Solicitud enviada', `Tu solicitud para unirte al grupo "${groupName}" ha sido enviada.`);
    } catch (err) {
      console.error("[GroupSearchScreen] Error al solicitar unirse:", err);
      Alert.alert('Error al solicitar unirse', err.message);
    } finally {
      setIsJoining(null); // Limpiar el estado de "uniéndose" para este ítem
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nombre de grupo"
        value={queryText}
        onChangeText={setQueryText}
        onSubmitEditing={handleSearch}
        editable={!isLoading} // Deshabilitar mientras se busca
      />
      <Button
        title={isLoading ? "Buscando..." : "Buscar Grupo"}
        onPress={handleSearch}
        disabled={isLoading}
      />
      {isLoading && results.length === 0 && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />}
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isAlreadyMember = userGroups.some(g => g.id === item.id);
          const currentItemIsJoining = isJoining === item.id;
          return (
            <View style={styles.item}>
              <Text style={styles.name}>{item.name}</Text>
              {!isAlreadyMember ? (
                <Button
                  title={currentItemIsJoining ? "Enviando..." : "Solicitar Unirse"}
                  onPress={() => handleJoin(item.id, item.name)}
                  disabled={currentItemIsJoining || isLoading} // Deshabilitar si se está uniendo a este o buscando en general
                />
              ) : (
                <Text style={styles.memberText}>Ya eres miembro</Text>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          !isLoading && results.length === 0 && queryText.length > 0 ? (
            <Text style={styles.emptyText}>No se encontraron grupos.</Text>
          ) : !isLoading ? (
            <Text style={styles.emptyText}>Introduce un nombre para buscar grupos.</Text>
          ) : null
        }
      />
      <Image
        source={require('../../assets/divertido.png')} // Verifica que esta imagen exista en assets
        style={styles.bottomImage}
        resizeMode="contain"
      />
    </View>
  );
}

// Mantén tus estilos existentes o ajústalos según sea necesario
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginTop: 50, // O usa SafeAreaView
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 5,
    fontSize: 16,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  name: {
    fontSize: 17,
    flex: 1,
    marginRight: 10,
  },
  memberText: {
    color: 'green',
    fontStyle: 'italic',
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#888',
    fontSize: 16,
  },
  bottomImage: {
    width: '80%',
    height: '70%', // Ajusta esto según tus necesidades, podría ser demasiado grande
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 20, // Un poco de margen inferior
  },
});
