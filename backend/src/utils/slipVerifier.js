const verifySlipWithEasySlip = async ({ slipUrl, amount, remark }) => {
  const apiKey = process.env.EASYSLIP_API_KEY;
  if (!apiKey) {
    const err = new Error('ยังไม่ได้ตั้งค่า EASYSLIP_API_KEY');
    err.status = 500;
    throw err;
  }

  const response = await fetch('https://api.easyslip.com/v2/verify/bank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: slipUrl,
      remark,
      matchAmount: Number(amount),
      checkDuplicate: true,
      matchAccount: process.env.EASYSLIP_MATCH_ACCOUNT === 'true',
    }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    const err = new Error(result?.error?.message || 'ตรวจสอบสลิปไม่ผ่าน');
    err.status = response.status || 400;
    err.code = result?.error?.code;
    err.raw = result;
    throw err;
  }

  return result.data;
};

const isSlipAccepted = (verification) => {
  if (!verification) return false;
  if (verification.isDuplicate) return false;
  if (verification.isAmountMatched === false) return false;
  return true;
};

module.exports = { verifySlipWithEasySlip, isSlipAccepted };
