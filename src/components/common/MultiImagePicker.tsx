import React, { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../../constants/colors';

interface MultiImagePickerProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

async function persistImage(uri: string): Promise<string> {
  const dir = FileSystem.documentDirectory + 'app_images/';
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = dir + `img_${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export default function MultiImagePicker({ images, onChange, maxImages = 6 }: MultiImagePickerProps) {
  const [viewUri, setViewUri] = useState<string | null>(null);

  const addFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsMultipleSelection: true,
      selectionLimit: maxImages - images.length,
    });
    if (!result.canceled) {
      const saved = await Promise.all(result.assets.map(a => persistImage(a.uri)));
      onChange([...images, ...saved].slice(0, maxImages));
    }
  };

  const addFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.75 });
    if (!result.canceled && result.assets[0]) {
      const saved = await persistImage(result.assets[0].uri);
      onChange([...images, saved].slice(0, maxImages));
    }
  };

  const remove = (uri: string) => {
    onChange(images.filter(i => i !== uri));
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {images.map(uri => (
          <TouchableOpacity key={uri} style={styles.thumb} onPress={() => setViewUri(uri)} activeOpacity={0.8}>
            <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
            <TouchableOpacity style={styles.removeBtn} onPress={() => remove(uri)}>
              <MaterialCommunityIcons name="close-circle" size={20} color={Colors.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {images.length < maxImages && (
          <>
            <TouchableOpacity style={styles.addBtn} onPress={addFromCamera}>
              <MaterialCommunityIcons name="camera-outline" size={24} color={Colors.primary} />
              <Text style={styles.addLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={addFromGallery}>
              <MaterialCommunityIcons name="image-outline" size={24} color={Colors.primary} />
              <Text style={styles.addLabel}>Gallery</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Full-screen viewer */}
      <Modal visible={!!viewUri} transparent animationType="fade" onRequestClose={() => setViewUri(null)}>
        <TouchableOpacity style={styles.viewer} activeOpacity={1} onPress={() => setViewUri(null)}>
          {viewUri && <Image source={{ uri: viewUri }} style={styles.fullImg} resizeMode="contain" />}
          <TouchableOpacity style={styles.closeViewer} onPress={() => setViewUri(null)}>
            <MaterialCommunityIcons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 6 },
  thumb: { width: 80, height: 80, borderRadius: 8, overflow: 'visible', position: 'relative' },
  thumbImg: { width: 80, height: 80, borderRadius: 8 },
  removeBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 10 },
  addBtn: { width: 80, height: 80, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface, gap: 4 },
  addLabel: { fontSize: 10, color: Colors.primary },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  fullImg: { width: '100%', height: '80%' },
  closeViewer: { position: 'absolute', top: 48, right: 16 },
});
