import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface ImagePickerFieldProps {
  uri: string | null;
  onPicked: (uri: string) => void;
  onClear: () => void;
  label?: string;
}

async function persistImage(tempUri: string, folder: string): Promise<string> {
  const dir = FileSystem.documentDirectory + folder + '/';
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const filename = `${Date.now()}.jpg`;
  const dest = dir + filename;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

export default function ImagePickerField({ uri, onPicked, onClear, label = 'Add Photo' }: ImagePickerFieldProps) {
  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const saved = await persistImage(result.assets[0].uri, 'app_images');
      onPicked(saved);
    }
  };

  const camera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const saved = await persistImage(result.assets[0].uri, 'app_images');
      onPicked(saved);
    }
  };

  if (uri) {
    return (
      <View style={styles.preview}>
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <MaterialCommunityIcons name="close-circle" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Button icon="image" mode="outlined" onPress={pick} style={styles.btn} compact>
        Gallery
      </Button>
      <Button icon="camera" mode="outlined" onPress={camera} style={styles.btn} compact>
        Camera
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  btn: { flex: 1, borderRadius: 8 },
  preview: { marginVertical: 8, position: 'relative' },
  image: { width: '100%', height: 180, borderRadius: 8 },
  clearBtn: { position: 'absolute', top: 6, right: 6 },
});
