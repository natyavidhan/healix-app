import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export type Option = { label: string; value: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  menuMaxHeight?: number;
};

export function Dropdown({ value, onChange, options, placeholder = 'Select...', disabled, containerStyle, menuMaxHeight = 240 }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value)?.label ?? '';

  const toggle = () => {
    if (!disabled) setOpen((v) => !v);
  };

  const onSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Pressable onPress={toggle} style={({ pressed }) => [styles.input, pressed && styles.pressed, disabled && styles.disabled] }>
        <Text style={[styles.inputText, !selected && styles.placeholder]}>
          {selected || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      {open ? (
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
  option: { paddingVertical: 10, paddingHorizontal: 12 },
  optionPressed: { backgroundColor: '#F3F4F6' },
  optionText: { fontSize: 16, color: '#11181C' },
});

export default Dropdown;
