import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Divider, IconButton, List, Modal, Portal, ProgressBar, Searchbar, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const hdrBtn: any = { padding: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 12 };

function getModelIcon(brandName?: string | null): string {
  if (!brandName) return 'cellphone';
  const b = brandName.toLowerCase();
  if (b.includes('apple') || b.includes('iphone')) return 'apple';
  if (b.includes('google') || b.includes('pixel')) return 'google';
  if (b.includes('samsung')) return 'android';
  if (b.includes('huawei') || b.includes('honor')) return 'cellphone-wireless';
  if (b.includes('motorola') || b.includes('moto')) return 'cellphone-arrow-down';
  if (b.includes('nokia')) return 'cellphone-basic';
  if (b.includes('sony')) return 'cellphone-sound';
  if (b.includes('asus') || b.includes('rog')) return 'cellphone-play';
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) return 'cellphone-settings';
  if (b.includes('oppo') || b.includes('realme') || b.includes('vivo') || b.includes('oneplus')) return 'cellphone-check';
  if (b.includes('tecno') || b.includes('infinix') || b.includes('itel')) return 'cellphone-text';
  return 'cellphone';
}
import {
  DeviceModel,
  getAllDeviceModels,
  createDeviceModel,
  updateDeviceModel,
  deleteDeviceModel,
} from '../../repositories/deviceModelRepository';
import { getAllDeviceBrands, createDeviceBrand, DeviceBrand } from '../../repositories/deviceBrandRepository';
import EmptyState from '../../components/common/EmptyState';
import { Colors } from '../../constants/colors';

export default function DeviceModelScreen() {
  const navigation = useNavigation<any>();
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [brands, setBrands] = useState<DeviceBrand[]>([]);
  const [search, setSearch] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterNoBrand, setFilterNoBrand] = useState(false);

  const hdrBtnActive: any = { backgroundColor: 'rgba(255,255,255,0.4)' };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 8, gap: 4 }}>
          <TouchableOpacity
            style={[hdrBtn, filterNoBrand && hdrBtnActive]}
            onPress={() => setFilterNoBrand(v => !v)}
          >
            <MaterialCommunityIcons name="tag-off-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={hdrBtn} onPress={() => setSearchVisible(v => !v)}>
            <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, filterNoBrand]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<DeviceModel | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [brandId, setBrandId] = useState<number | null>(null);
  const [brandInput, setBrandInput] = useState('');
  const [brandSuggestions, setBrandSuggestions] = useState<DeviceBrand[]>([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [yearInput, setYearInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [m, b] = await Promise.all([getAllDeviceModels(), getAllDeviceBrands()]);
    setModels(m);
    setBrands(b);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const selectedBrand = brands.find(b => b.id === brandId);

  const filtered = models.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.brand_name ?? '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filterNoBrand) return !m.brand_id;
    return true;
  });

  const openAdd = () => {
    setEditTarget(null); setNameInput(''); setBrandId(null); setBrandInput('');
    setYearInput(''); setShowBrandSuggestions(false); setModalVisible(true);
  };
  const openEdit = (m: DeviceModel) => {
    setEditTarget(m); setNameInput(m.name); setBrandId(m.brand_id);
    setBrandInput(m.brand_name ?? ''); setYearInput(m.year_released ? String(m.year_released) : '');
    setShowBrandSuggestions(false); setModalVisible(true);
  };

  const handleSave = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    const year = yearInput.trim().length === 4 ? parseInt(yearInput.trim()) : null;
    if (editTarget) {
      await updateDeviceModel(editTarget.id, nameInput, brandId ?? undefined, year);
    } else {
      const newId = await createDeviceModel(nameInput, brandId ?? undefined);
      if (year) await updateDeviceModel(newId, nameInput, brandId ?? undefined, year);
    }
    setSaving(false);
    setModalVisible(false);
    load();
  };

  const [autoBranding, setAutoBranding] = useState(false);
  const [autoYearing, setAutoYearing] = useState(false);
  const [autoProgress, setAutoProgress] = useState<{ label: string; current: number; total: number } | null>(null);

  // ── Year lookup table (popular PH market models) ─────────────────────────
  const MODEL_YEAR: Record<string, number> = {
    // Apple
    'iphone 6':2014,'iphone 6 plus':2014,'iphone 6s':2015,'iphone 6s plus':2015,
    'iphone se':2016,'iphone 7':2016,'iphone 7 plus':2016,
    'iphone 8':2017,'iphone 8 plus':2017,'iphone x':2017,
    'iphone xs':2018,'iphone xs max':2018,'iphone xr':2018,
    'iphone 11':2019,'iphone 11 pro':2019,'iphone 11 pro max':2019,
    'iphone se 2':2020,'iphone 12':2020,'iphone 12 mini':2020,'iphone 12 pro':2020,'iphone 12 pro max':2020,
    'iphone 13':2021,'iphone 13 mini':2021,'iphone 13 pro':2021,'iphone 13 pro max':2021,
    'iphone se 3':2022,'iphone 14':2022,'iphone 14 plus':2022,'iphone 14 pro':2022,'iphone 14 pro max':2022,
    'iphone 15':2023,'iphone 15 plus':2023,'iphone 15 pro':2023,'iphone 15 pro max':2023,
    'iphone 16':2024,'iphone 16 plus':2024,'iphone 16 pro':2024,'iphone 16 pro max':2024,
    // Samsung A
    'galaxy a01':2020,'galaxy a02':2021,'galaxy a03':2021,'galaxy a05':2023,'galaxy a06':2024,
    'galaxy a10':2019,'galaxy a10s':2019,'galaxy a11':2020,'galaxy a12':2020,
    'galaxy a13':2022,'galaxy a14':2023,'galaxy a15':2023,'galaxy a16':2024,
    'galaxy a20':2019,'galaxy a20s':2019,'galaxy a21':2020,'galaxy a21s':2020,
    'galaxy a22':2021,'galaxy a23':2022,'galaxy a24':2023,'galaxy a25':2023,
    'galaxy a31':2020,'galaxy a32':2021,'galaxy a33':2022,'galaxy a34':2023,'galaxy a35':2024,
    'galaxy a51':2019,'galaxy a52':2021,'galaxy a53':2022,'galaxy a54':2023,'galaxy a55':2024,
    'galaxy a71':2019,'galaxy a72':2021,'galaxy a73':2022,
    // Samsung S
    'galaxy s20':2020,'galaxy s21':2021,'galaxy s22':2022,'galaxy s23':2023,'galaxy s24':2024,
    'galaxy s20 ultra':2020,'galaxy s21 ultra':2021,'galaxy s22 ultra':2022,'galaxy s23 ultra':2023,'galaxy s24 ultra':2024,
    // Samsung M
    'galaxy m12':2021,'galaxy m13':2022,'galaxy m14':2023,'galaxy m15':2024,
    'galaxy m22':2021,'galaxy m23':2022,'galaxy m33':2022,'galaxy m34':2023,
    'galaxy note 20':2020,'galaxy note 20 ultra':2020,
    // Xiaomi / Redmi
    'redmi 9':2020,'redmi 9a':2020,'redmi 9c':2020,
    'redmi 10':2021,'redmi 10a':2022,'redmi 10c':2022,
    'redmi 12':2023,'redmi 12c':2023,'redmi 13':2024,'redmi 13c':2024,
    'redmi note 9':2020,'redmi note 9s':2020,'redmi note 9 pro':2020,
    'redmi note 10':2021,'redmi note 10s':2021,'redmi note 10 pro':2021,
    'redmi note 11':2021,'redmi note 11s':2022,'redmi note 11 pro':2022,
    'redmi note 12':2023,'redmi note 12s':2023,'redmi note 12 pro':2023,
    'redmi note 13':2023,'redmi note 13 pro':2023,
    'poco m3':2020,'poco m4':2022,'poco m5':2022,'poco m6':2024,
    'poco x3':2020,'poco x4':2022,'poco x5':2023,'poco x6':2024,
    'poco f5':2023,'poco f6':2024,
    // OPPO
    'oppo a12':2020,'oppo a15':2020,'oppo a16':2021,'oppo a17':2022,'oppo a18':2023,
    'oppo a52':2020,'oppo a54':2021,'oppo a55':2021,'oppo a57':2022,'oppo a58':2023,
    'oppo a78':2023,'oppo a79':2023,'oppo a96':2022,'oppo a98':2023,
    'oppo reno 5':2020,'oppo reno 6':2021,'oppo reno 7':2021,
    'oppo reno 8':2022,'oppo reno 9':2022,'oppo reno 10':2023,'oppo reno 11':2023,'oppo reno 12':2024,
    'oppo find x5':2022,'oppo find x6':2023,'oppo find x7':2024,
    // Vivo
    'vivo y02':2022,'vivo y03':2024,'vivo y15':2019,'vivo y16':2022,'vivo y17':2019,
    'vivo y20':2020,'vivo y21':2021,'vivo y22':2022,'vivo y27':2023,'vivo y28':2024,'vivo y29':2024,
    'vivo y30':2020,'vivo y31':2021,'vivo y33':2021,'vivo y35':2022,'vivo y36':2023,'vivo y38':2024,
    'vivo y50':2020,'vivo y51':2020,'vivo y52':2021,'vivo y53':2022,
    'vivo v20':2020,'vivo v21':2021,'vivo v23':2022,'vivo v25':2022,'vivo v27':2023,'vivo v29':2023,'vivo v30':2024,'vivo v40':2024,
    // Realme
    'realme 5':2019,'realme 6':2020,'realme 7':2020,'realme 8':2021,
    'realme 9':2022,'realme 10':2022,'realme 11':2023,'realme 12':2024,
    'realme c11':2020,'realme c12':2020,'realme c15':2020,'realme c20':2021,'realme c21':2021,
    'realme c25':2021,'realme c30':2022,'realme c31':2022,'realme c33':2022,'realme c35':2022,
    'realme c51':2023,'realme c53':2023,'realme c55':2023,'realme c63':2024,'realme c65':2024,
    'realme narzo 50':2022,'realme narzo 60':2023,'realme narzo 70':2024,
    // Huawei / Honor
    'huawei p30':2019,'huawei p40':2020,'huawei p50':2021,
    'huawei nova 7':2020,'huawei nova 8':2020,'huawei nova 9':2021,'huawei nova 10':2022,
    // OnePlus
    'oneplus 8':2020,'oneplus 9':2021,'oneplus 10':2022,'oneplus 11':2023,'oneplus 12':2024,
    // Nokia
    'nokia g10':2021,'nokia g11':2022,'nokia g20':2021,'nokia g21':2022,'nokia c20':2021,'nokia c21':2022,
    // Tecno
    'tecno spark 8':2021,'tecno spark 9':2022,'tecno spark 10':2023,'tecno spark 20':2024,
    'tecno camon 19':2022,'tecno camon 20':2023,'tecno camon 30':2024,
    // Infinix
    'infinix hot 11':2021,'infinix hot 12':2022,'infinix hot 30':2023,'infinix hot 40':2024,
    'infinix note 11':2021,'infinix note 12':2022,'infinix note 30':2023,'infinix note 40':2024,
    'infinix zero 20':2022,'infinix zero 30':2023,
  };

  const detectYear = (modelName: string): number | null => {
    const n = modelName.toLowerCase().replace(/\b(5g|4g|lte|plus|\+|pro|max|ultra|lite|s)\b/g, '').replace(/\s+/g, ' ').trim();
    // Direct lookup (longest match first)
    const keys = Object.keys(MODEL_YEAR).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (n.includes(key)) return MODEL_YEAR[key];
    }
    // Try to extract a 4-digit year from the name (e.g. "Galaxy A53 2022")
    const yearMatch = modelName.match(/\b(201[5-9]|202[0-9])\b/);
    if (yearMatch) return parseInt(yearMatch[1]);
    return null;
  };

  const handleAutoYear = async () => {
    const noYear = models.filter(m => !m.year_released);
    if (noYear.length === 0) {
      Alert.alert('Auto Year', 'All models already have a release year assigned.');
      return;
    }
    Alert.alert(
      'Auto Year',
      `Detect release year for ${noYear.length} model${noYear.length !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setAutoYearing(true);
            setAutoProgress({ label: 'Auto Year', current: 0, total: noYear.length });
            let assigned = 0;
            for (let i = 0; i < noYear.length; i++) {
              const model = noYear[i];
              setAutoProgress({ label: 'Auto Year', current: i + 1, total: noYear.length });
              const year = detectYear(model.name);
              if (year) {
                await updateDeviceModel(model.id, model.name, model.brand_id ?? undefined, year);
                assigned++;
              }
            }
            setAutoYearing(false);
            setAutoProgress(null);
            await load();
            Alert.alert('Auto Year Complete', `${assigned} model${assigned !== 1 ? 's' : ''} assigned a release year.${noYear.length - assigned > 0 ? `\n${noYear.length - assigned} could not be detected.` : ''}`);
          },
        },
      ]
    );
  };

  const detectBrand = (modelName: string): string | null => {
    const n = modelName.toLowerCase();
    if (n.includes('iphone') || n.includes('ipad') || n.includes('ipod') || n.startsWith('apple')) return 'Apple';
    if (n.includes('galaxy') || n.startsWith('samsung') || /\bsm-/.test(n)) return 'Samsung';
    if (n.includes('redmi') || n.includes('poco') || n.startsWith('mi ') || n.startsWith('mi-') || n.startsWith('xiaomi')) return 'Xiaomi';
    if (n.startsWith('oppo') || n.includes('reno') || n.includes('find x')) return 'OPPO';
    if (n.startsWith('vivo')) return 'Vivo';
    if (n.startsWith('realme')) return 'Realme';
    if (n.startsWith('huawei') || n.includes('honor')) return 'Huawei';
    if (n.startsWith('oneplus') || n.startsWith('one plus') || n.startsWith('1+')) return 'OnePlus';
    if (n.startsWith('moto') || n.startsWith('motorola')) return 'Motorola';
    if (n.startsWith('nokia')) return 'Nokia';
    if (n.startsWith('sony') || n.includes('xperia')) return 'Sony';
    if (n.startsWith('pixel') || n.startsWith('google')) return 'Google';
    if (n.startsWith('nothing')) return 'Nothing';
    if (n.startsWith('tecno')) return 'Tecno';
    if (n.startsWith('infinix')) return 'Infinix';
    if (n.startsWith('itel')) return 'Itel';
    if (n.startsWith('lg ') || n.startsWith('lg-')) return 'LG';
    if (n.startsWith('asus') || n.includes('zenfone') || n.includes('rog phone')) return 'ASUS';
    if (n.startsWith('lenovo')) return 'Lenovo';
    if (n.startsWith('nokia')) return 'Nokia';
    return null;
  };

  const handleAutoBrand = async () => {
    const unbranded = models.filter(m => !m.brand_id);
    if (unbranded.length === 0) {
      Alert.alert('Auto Brand', 'All models already have a brand assigned.');
      return;
    }
    Alert.alert(
      'Auto Brand',
      `Detect and assign brands for ${unbranded.length} unbranded model${unbranded.length !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setAutoBranding(true);
            setAutoProgress({ label: 'Auto Brand', current: 0, total: unbranded.length });
            let assigned = 0;
            const brandMap = new Map(brands.map(b => [b.name.toLowerCase(), b.id]));
            for (let i = 0; i < unbranded.length; i++) {
              const model = unbranded[i];
              setAutoProgress({ label: 'Auto Brand', current: i + 1, total: unbranded.length });
              const brandName = detectBrand(model.name);
              if (brandName) {
                let bId = brandMap.get(brandName.toLowerCase());
                if (!bId) {
                  bId = await createDeviceBrand(brandName);
                  brandMap.set(brandName.toLowerCase(), bId);
                }
                await updateDeviceModel(model.id, model.name, bId);
                assigned++;
              }
            }
            setAutoBranding(false);
            setAutoProgress(null);
            await load();
            Alert.alert('Auto Brand Complete', `${assigned} model${assigned !== 1 ? 's' : ''} assigned a brand.${unbranded.length - assigned > 0 ? `\n${unbranded.length - assigned} could not be detected.` : ''}`);
          },
        },
      ]
    );
  };

  const handleDelete = (m: DeviceModel) => {
    Alert.alert('Delete Model', `Delete "${m.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDeviceModel(m.id); load(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      {searchVisible && <Searchbar placeholder="Search model or brand..." value={search} onChangeText={setSearch} style={styles.search} autoFocus />}
      <FlatList
        data={filtered}
        keyExtractor={m => String(m.id)}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={() => (
              <View style={styles.modelTags}>
                {item.brand_name ? (
                  <View style={styles.brandChip}>
                    <Text style={styles.brandChipText}>{item.brand_name}</Text>
                  </View>
                ) : (
                  <View style={[styles.brandChip, styles.noBrandChip]}>
                    <Text style={[styles.brandChipText, { color: Colors.textSecondary }]}>No Brand</Text>
                  </View>
                )}
                {item.year_released ? (
                  <View style={styles.yearChip}>
                    <MaterialCommunityIcons name="calendar" size={10} color={Colors.primary} />
                    <Text style={styles.yearChipText}>{item.year_released}</Text>
                  </View>
                ) : null}
              </View>
            )}
            left={props => <List.Icon {...props} icon={getModelIcon(item.brand_name)} color={Colors.primary} />}
            right={() => (
              <View style={styles.actions}>
                <IconButton icon="pencil-outline" iconColor={Colors.primary} onPress={() => openEdit(item)} />
                <IconButton icon="delete-outline" iconColor={Colors.error} onPress={() => handleDelete(item)} />
              </View>
            )}
            style={styles.item}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={<EmptyState icon="cellphone" title={filterNoBrand ? "No unbranded models" : "No device models yet"} subtitle={filterNoBrand ? "All models have a brand assigned" : "Tap Add to create one"} />}
        contentContainerStyle={filtered.length === 0 ? styles.empty : undefined}
      />

      {autoProgress && (
        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{autoProgress.label}</Text>
            <Text style={styles.progressCount}>
              {autoProgress.current} / {autoProgress.total}
              {'  '}
              <Text style={styles.progressPct}>
                {Math.round((autoProgress.current / autoProgress.total) * 100)}%
              </Text>
            </Text>
          </View>
          <ProgressBar
            progress={autoProgress.current / autoProgress.total}
            color={Colors.primary}
            style={styles.progressBar}
          />
          <Text style={styles.progressRemaining}>
            {autoProgress.total - autoProgress.current} remaining
          </Text>
        </View>
      )}

      <View style={styles.addRow}>
        <Button
          mode="outlined" icon="auto-fix" onPress={handleAutoBrand}
          loading={autoBranding} disabled={autoBranding || autoYearing}
          style={[styles.addBtn, { flex: 1, borderColor: Colors.primary }]}
          textColor={Colors.primary} compact>
          Auto Brand
        </Button>
        <Button
          mode="outlined" icon="calendar-clock" onPress={handleAutoYear}
          loading={autoYearing} disabled={autoBranding || autoYearing}
          style={[styles.addBtn, { flex: 1, borderColor: Colors.secondary ?? Colors.info }]}
          textColor={Colors.secondary ?? Colors.info} compact>
          Auto Year
        </Button>
        <Button mode="contained" icon="plus" onPress={openAdd} style={[styles.addBtn, { flex: 1 }]}>Add</Button>
      </View>

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{editTarget ? 'Edit Device Model' : 'New Device Model'}</Text>
          <TextInput label="Model Name *" value={nameInput} onChangeText={setNameInput} mode="outlined" style={styles.input} placeholder="e.g. iPhone 15 Pro, Galaxy S24" autoFocus />

          <Text style={styles.brandLabel}>Brand (optional)</Text>
          <TextInput
            label="Brand"
            value={brandInput}
            onChangeText={(text) => {
              setBrandInput(text);
              setBrandId(null);
              const filtered = text.length >= 1
                ? brands.filter(b => b.name.toLowerCase().includes(text.toLowerCase()))
                : brands;
              setBrandSuggestions(filtered);
              setShowBrandSuggestions(filtered.length > 0);
            }}
            onFocus={() => { setBrandSuggestions(brands); setShowBrandSuggestions(brands.length > 0); }}
            mode="outlined"
            style={styles.input}
            placeholder="Search brand..."
            right={brandId ? <TextInput.Icon icon="check-circle" color="#4CAF50" /> : undefined}
          />
          {showBrandSuggestions && (
            <View style={styles.suggestionBox}>
              <TouchableOpacity style={styles.suggestionItem}
                onPress={() => { setBrandId(null); setBrandInput(''); setShowBrandSuggestions(false); }}>
                <Text style={[styles.suggestionText, { color: Colors.textSecondary }]}>— None —</Text>
              </TouchableOpacity>
              {brandSuggestions.slice(0, 6).map(b => (
                <TouchableOpacity key={b.id} style={styles.suggestionItem}
                  onPress={() => { setBrandId(b.id); setBrandInput(b.name); setShowBrandSuggestions(false); }}>
                  <Text style={styles.suggestionText}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.brandLabel}>Release Year (optional)</Text>
          <TextInput
            label="e.g. 2023"
            value={yearInput}
            onChangeText={setYearInput}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            maxLength={4}
          />

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.btnHalf}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={saving} disabled={!nameInput.trim() || saving} style={styles.btnHalf}>
              {editTarget ? 'Save' : 'Add'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  search: { margin: 12, borderRadius: 8 },
  item: { backgroundColor: Colors.surface },
  actions: { flexDirection: 'row', alignItems: 'center' },
  empty: { flex: 1 },
  // Progress bar
  progressWrap: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: Colors.text },
  progressCount: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  progressPct: { fontSize: 12, color: Colors.primary, fontWeight: '800' },
  progressBar: { height: 6, borderRadius: 4 },
  progressRemaining: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: 'right' },

  // Model list chips
  modelTags: { flexDirection: 'row', gap: 5, marginTop: 3, flexWrap: 'wrap' },
  brandChip: { backgroundColor: Colors.primary + '15', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: Colors.primary + '30' },
  noBrandChip: { backgroundColor: Colors.border + '40', borderColor: Colors.border },
  brandChipText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  yearChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.info + '15', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: Colors.info + '30' },
  yearChipText: { fontSize: 10, fontWeight: '700', color: Colors.primary },

  addRow: { flexDirection: 'row', padding: 16, gap: 10 },
  addBtn: { borderRadius: 8 },
  modal: { backgroundColor: Colors.surface, margin: 20, borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  input: { marginBottom: 4, backgroundColor: Colors.surface },
  brandLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  suggestionBox: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginBottom: 10, elevation: 4, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnHalf: { flex: 1, borderRadius: 8 },
});
