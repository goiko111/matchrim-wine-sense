interface QrCode {
  addData(value: string, mode?: 'Byte' | 'Numeric' | 'Alphanumeric'): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, column: number): boolean;
  createDataURL(cellSize?: number, margin?: number): string;
}
declare const qrcode: (typeNumber: 0, correction: 'L' | 'M' | 'Q' | 'H') => QrCode;
export default qrcode;
