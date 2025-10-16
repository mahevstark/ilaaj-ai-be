const { FormData } = require('undici');
const { Blob } = require('buffer');

class CranioCatchClient {
  constructor(
    baseUrl,
    apiKey,
    facilityCode,
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.facilityCode = facilityCode;
  }

  async analyzeImageByUrl(imageUrl) {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facility_code: this.facilityCode,
        image_url: imageUrl,
      }),
    });
    if (!res.ok) throw new Error(`CranioCatch ${res.status}: ${await res.text()}`);
    return res.json(); // return raw analysis
  }

  async analyzeImageByFile(
    file,
    extra,
  ) {
    const form = new FormData();
    form.set('api_key', this.apiKey);
    form.set('facility_code', this.facilityCode);

    const isDigits = (v) => typeof v === 'string' && /^[0-9]+$/.test(v.trim());
    if (extra && isDigits(extra.rt_id)) form.set('rt_id', extra.rt_id.trim());
    if (extra && isDigits(extra.patient_id)) form.set('patient_id', extra.patient_id.trim());

    // Create a Blob from the Buffer using Node's buffer.Blob
    const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' });
    form.append('image', blob, file.originalname || 'image.jpg');

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      body: form,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`CranioCatch ${res.status}: ${text}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async fetchResultsById(id) {
    const url = `${this.baseUrl}?id=${encodeURIComponent(id)}`;
    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();
    if (!res.ok) throw new Error(`CranioCatch results ${res.status}: ${text}`);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

module.exports = { CranioCatchClient };