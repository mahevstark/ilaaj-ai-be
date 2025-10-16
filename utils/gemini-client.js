const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiClient {
  modelName
  client

  constructor(apiKey, modelName) {
    this.modelName = modelName || process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generatePlanFromFormData(formAnalysis) {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    // Build medical considerations section
    const medicalInfo = formAnalysis.medical_considerations ? [
      '',
      'Medical Considerations:',
      `- Medical Condition: ${formAnalysis.medical_considerations.condition}`,
      `- Age: ${formAnalysis.medical_considerations.age || 'Not specified'}`,
      `- Smoking: ${formAnalysis.medical_considerations.smoking ? 'Yes' : 'No'}`,
      `- Chronic Diseases: ${formAnalysis.medical_considerations.chronicDiseases?.length ? 
        formAnalysis.medical_considerations.chronicDiseases.join(', ') : 'None'}`
    ] : [];

    const prompt = [
      'You are an expert orthodontic planning assistant.',
      'Given the following dental treatment requirements:',
      '',
      'Required Dental Work:',
      `- Selected Teeth for Implants: ${Object.keys(formAnalysis.tooth_results).join(', ')}`,
      '',
      'Additional Required Treatments:',
      ...formAnalysis.treatment_methods.map(t => `- ${t.treatment_method}: ${t.count || 1}`),
      ...medicalInfo,
      '',
      'Please provide a comprehensive treatment plan considering:',
      '1. Treatment sequence and priorities',
      '2. Medical considerations and contraindications',
      '3. Expected healing and recovery times',
      '4. Any prerequisites (e.g., bone grafting)',
      '',
      'Respond with a single JSON object with the shape:',
      '{',
      '  "title": "Form-Based Treatment Plan Analysis",',
      '  "summary": "Brief overview including medical considerations",',
      '  "plans": {',
      '    "missingTeeth": "Details about implant placement and timing",',
      '    "boneLevel": "Any bone-related prerequisites or considerations",',
      '    "implants": "Specific implant recommendations and sequence",',
      '    "lesions": "Any additional health considerations or precautions"',
      '  }',
      '}',
      'Only return JSON, no markdown, no commentary.',
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const parsed = JSON.parse(text);
      return { planText: text, planJson: parsed };
    } catch {
      return { planText: text };
    }
  }

  async generatePlanFromAnalysis(analysis) {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const prompt = [
      'You are an expert orthodontic planning assistant.',
      'Given the following CranioCatch radiography analysis JSON, extract and summarize:',
      '- Missing teeth',
      '- Bone level',
      '- Implants',
      '- Lesions',
      'Respond with a single JSON object with the shape:',
      '{',
      '  "title": string,',
      '  "summary": string,',
      '  "plans": {',
      '    "missingTeeth": string,',
      '    "boneLevel": string,',
      '    "implants": string,',
      '    "lesions": string',
      '  }',
      '}',
      'Only return JSON, no markdown, no commentary.',
      '',
      `Analysis JSON: ${JSON.stringify(analysis)}`,
    ].join('\n');
    

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const parsed = JSON.parse(text);
      return { planText: text, planJson: parsed };
    } catch {
      return { planText: text };
    }
  }
}

module.exports = { GeminiClient };