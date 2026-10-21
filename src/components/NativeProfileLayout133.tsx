import { Capacitor } from '@capacitor/core';

const styles = `
html.matchrim-native-platform .matchrim-profile133 {
  min-width: 0;
  padding-left: calc(16px + var(--matchrim-safe-left));
  padding-right: calc(16px + var(--matchrim-safe-right));
}
html.matchrim-native-platform .matchrim-profile133 [aria-label="Cuenta actual"] {
  flex: 1 1 0;
}
html.matchrim-native-platform .matchrim-profile133 [aria-label="Ajustes de cuenta"] {
  width: 44px;
  height: 44px;
  min-height: 44px;
  flex: 0 0 44px;
  padding: 10px;
}
html.matchrim-native-platform .matchrim-profile133 [aria-label="Ajustes de cuenta"] svg {
  width: 20px;
  height: 20px;
}
html.matchrim-native-platform .matchrim-profile133 .matchrim-profile-title133 svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
html.matchrim-native-platform .matchrim-profile133 [role="tab"] {
  min-height: 44px;
  height: auto;
  white-space: normal;
  overflow-wrap: anywhere;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 .matchrim-profile-title133 {
  display: block;
  font-size: 1.125rem;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 .matchrim-profile-title133 svg {
  display: none;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 :is(h2,h3,h4) {
  font-size: 1rem;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 .grid {
  grid-template-columns: minmax(0, 1fr);
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 .flex {
  flex-wrap: wrap;
  min-width: 0;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 > div:first-child {
  flex-wrap: nowrap;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 :is(.gap-2,.gap-3,.gap-4,.gap-6) {
  gap: 12px;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 :is(.p-3,.p-4,.p-5,.p-6) {
  padding: 16px;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 [class~="min-w-[220px]"] {
  min-width: 0;
  width: 100%;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 svg.lucide {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 [aria-label="Ajustes de cuenta"] {
  padding: 10px;
}
html.matchrim-native-platform.matchrim-accessibility-text .matchrim-profile133 [aria-label="Ajustes de cuenta"] svg {
  width: 20px;
  height: 20px;
}
`;

export default function NativeProfileLayout133() {
  return Capacitor.isNativePlatform() ? <style>{styles}</style> : null;
}
