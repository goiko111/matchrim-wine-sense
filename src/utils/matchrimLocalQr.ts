import qrcode from '../vendor/qrcode-generator/qrcode.mjs';

export const buildLocalMatchrimQr = (value: string): string => {
  const qr = qrcode(0, 'M');
  qr.addData(value, 'Byte');
  qr.make();
  return qr.createDataURL(4, 16);
};
