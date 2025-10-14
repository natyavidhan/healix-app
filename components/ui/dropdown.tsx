import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export type Option = { label: string; value: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  menuMaxHeight?: number;
  onOpenChange?: (open: boolean) => void;
};

export function Dropdown({ value, onChange, options, placeholder = 'Select...', disabled, containerStyle, menuMaxHeight = 240, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value)?.label ?? '';

  const toggle = () => {
    if (disabled) return;
    setOpen((v) => {
      const next = !v;
      onOpenChange?.(next);
      return next;
    });
  };

  const onSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    onOpenChange?.(false);
  };

  const isWeb = Platform.OS === 'web';
  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Pressable onPress={toggle} style={({ pressed }) => [styles.input, pressed && styles.pressed, disabled && styles.disabled] }>
        <Text style={[styles.inputText, !selected && styles.placeholder]}>
          {selected || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      {open && isWeb ? (
        <View style={styles.menu}>
          <ScrollView style={{ maxHeight: menuMaxHeight }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.map((opt) => (
              <Pressable key={opt.value} onPress={() => onSelect(opt.value)} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
                <Text style={styles.optionText}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Native modal for independent scrolling */}
      {!isWeb && (
        <Modal visible={open} animationType="fade" transparent onRequestClose={() => { setOpen(false); onOpenChange?.(false); }}>
          <Pressable style={styles.backdrop} onPress={() => { setOpen(false); onOpenChange?.(false); }}>
            {/* empty overlay to close on tap */}
          </Pressable>
          <View style={styles.modalSheet}>
            <ScrollView style={{ maxHeight: menuMaxHeight }} keyboardShouldPersistTaps="handled">
              {options.map((opt) => (
                <Pressable key={opt.value} onPress={() => onSelect(opt.value)} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
                  <Text style={styles.optionText}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 1 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    backgroundColor: '#fff',
    color: '#11181C',
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: { color: '#11181C', fontSize: 16 },
  placeholder: { color: '#9CA3AF' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.6 },
  chevron: { color: '#6B7280', marginLeft: 8 },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  modalSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  option: { paddingVertical: 10, paddingHorizontal: 12 },
  optionPressed: { backgroundColor: '#F3F4F6' },
  optionText: { fontSize: 16, color: '#11181C' },
});

export default Dropdown;
