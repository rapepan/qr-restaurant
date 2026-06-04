const QRCode = require('qrcode');

const formatField = (id, value) => {
  const text = String(value);
  return `${id}${text.length.toString().padStart(2, '0')}${text}`;
};

const crc16 = (payload) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const normalizePromptPayId = (id) => {
  const raw = String(id || '').replace(/[\s-]/g, '');
  if (/^0\d{9}$/.test(raw)) return `0066${raw.slice(1)}`;
  return raw;
};

const buildPromptPayPayload = ({ promptPayId, amount }) => {
  const target = normalizePromptPayId(promptPayId);
  const merchantAccount = [
    formatField('00', 'A000000677010111'),
    formatField('01', target),
  ].join('');

  const payloadWithoutCrc = [
    formatField('00', '01'),
    formatField('01', '12'),
    formatField('29', merchantAccount),
    formatField('58', 'TH'),
    formatField('53', '764'),
    formatField('54', Number(amount).toFixed(2)),
    '6304',
  ].join('');

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
};

const buildPromptPayQr = async ({ promptPayId, amount }) => {
  const payload = buildPromptPayPayload({ promptPayId, amount });
  const qr_data_url = await QRCode.toDataURL(payload, { width: 400, margin: 2 });
  return { payload, qr_data_url };
};

module.exports = { buildPromptPayPayload, buildPromptPayQr };
