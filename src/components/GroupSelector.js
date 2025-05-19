import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { GroupContext } from '../context/GroupContext';

export default function GroupSelector() {
  const { userGroups, currentGroup, setCurrentGroup } = useContext(GroupContext);

  return (
    <View style={{ flex: 1, paddingVertical: 4 }}>
      <FlatList
        horizontal
        data={userGroups}
        keyExtractor={g => g.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setCurrentGroup(item)}
            style={{ marginRight: 12 }}
          >
            <Text style={{ fontWeight: item.id === currentGroup?.id ? 'bold' : 'normal' }}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
