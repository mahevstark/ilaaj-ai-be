const { GoogleGenerativeAI } = require('@google/generative-ai');

class TreatmentPlanningService {
  constructor() {
    this.apiKey = 'AIzaSyBnZDY0aM3Xj2NGx2sRtCwGuNRWlxCTHOs';
    this.modelName = 'gemini-2.0-flash-exp';
    this.client = new GoogleGenerativeAI(this.apiKey);
  }

  async generateTreatmentPlan(cranioCatchData, questionnaireData) {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const prompt = this.buildTreatmentPlanningPrompt(cranioCatchData, questionnaireData);
    let text = ''; // Initialize text variable outside try block

    try {
      const result = await model.generateContent(prompt);
      text = result.response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      
      const parsedPlan = JSON.parse(jsonString);
      return {
        success: true,
        plan: parsedPlan,
        rawResponse: text
      };
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      return {
        success: false,
        error: error.message,
        rawResponse: text || ''
      };
    }
  }

  buildTreatmentPlanningPrompt(cranioCatchData, questionnaireData) {
    // Determine if this is form-based or X-ray based
    const isFormBased = !cranioCatchData || !cranioCatchData.results || Object.keys(cranioCatchData.results || {}).length === 0;
    
    return `
# Implaner Treatment Planning System

## Role Definition
I am the decision engine of the Implaner digital health platform.
My task is to generate personalized, balanced, justified, and explainable preliminary implant treatment predictions based on:

${isFormBased ? 
  '- Patient questionnaire data and treatment preferences' : 
  '- AI-powered radiological analysis (Craniocatch)'
}
- patient questionnaire data
- systemic health information
- economic preferences
- and biomechanical principles

These plans are pre-decision sets designed to support expert evaluation.
The final treatment planning will be performed by Dr. Mehmet and clinical dentists.

## Planning Output Format
Each recommendation must follow this structure:

### Quick Overview
- Total number of implants
- Number of crowns
- Number of veneers

### Regional Planning
- Implant sites (with FDI numbers)
- Bridge members (pontics)
- Teeth restored with veneers

### Detailed Explanation
- Missing and extractable teeth (with justifications)
- Biomechanical analysis (implant distribution, bridge length, occlusal load)
- Flexibility adjustments based on systemic health and economic preferences

### Conclusion
- Consistency of the plan with patient goals and system rules

## Patient Data

${isFormBased ? 
  `### Treatment Requirements (Form-Based Assessment):
${JSON.stringify(cranioCatchData, null, 2)}

### Patient Questionnaire Data:
${JSON.stringify(questionnaireData, null, 2)}` :
  `### CranioCatch Analysis:
${JSON.stringify(cranioCatchData, null, 2)}

### Questionnaire Data:
${JSON.stringify(questionnaireData, null, 2)}`
}

## Planning Rules

### Patient Expectation and Economic Preference
- Primary expectation: ${questionnaireData.primaryExpectation || 'Not specified'}
- Budget approach: ${questionnaireData.budgetApproach || 'Not specified'}

${isFormBased ? 
  `### Form-Based Treatment Planning Guidelines
- Use the provided treatment counts as the foundation for planning
- Selected teeth (${questionnaireData.selectedTeeth ? questionnaireData.selectedTeeth.join(', ') : 'None'}) indicate missing teeth requiring implants
- Treatment counts: ${questionnaireData.implants || 0} implants, ${questionnaireData.crowns || 0} crowns, ${questionnaireData.fillings || 0} fillings, ${questionnaireData.rootCanals || 0} root canals
- Medical condition: ${questionnaireData.medicalCondition || 'Not specified'}
- Age: ${questionnaireData.age || 'Not specified'}
- Smoking status: ${questionnaireData.smoking ? 'Yes' : 'No'}
- Chronic diseases: ${questionnaireData.chronicDiseases ? questionnaireData.chronicDiseases.join(', ') : 'None'}` : 
  ''
}

### Planning Actions According to 8 Scenarios
1. Complete missing teeth + Premium: Implant for all missing teeth. Graft included if required. (Nobel, Straumann)
2. Complete missing teeth + Balanced: Implant for all missing teeth. No anterior bridges. (Osstem, Medentika)
3. Complete missing teeth + Economy: Cost formula: (Crown×4) + (Implant×5) + (Graft +3 if needed)
4. Complete missing teeth + Basic: Cost formula: (Crown×3) + (Implant×5) - Minimum implants, maximum bridges
5. Smile makeover + Premium: All smile-line teeth restored with crown/veneer. Missing teeth → implant+crown.
6. Smile makeover + Balanced: Smile-line teeth with crowns (no veneers). More economic implant options.
7. Smile makeover + Economy: Posterior missing → priority implants. Anterior → bridge if possible.
8. Smile makeover + Basic: 4A formula applied. Smile line restored with crowns.

### Smile Makeover Rules
- Smile Line: 15–25 (upper), 35–45 (lower)
- If missing teeth within 13–23: Veneers not allowed, must use crowns.
- If no missing teeth: Veneers permitted for premium, crowns only for others.

### Core Decision Flow
- 1 missing tooth: 1 implant
- 2 missing teeth: 2 implants (no I-P)
- 3 missing teeth: I-P-I
- 4 missing teeth: I-P-I-I or I-I-P-I
- 5 missing teeth: I-P-I-P-I
- 6+ missing teeth: Divide into segments

### Total Planning Criteria
- ≤4 sound teeth in one jaw
- ≥50% suspicious teeth
- ≥10 missing teeth
- ≥8 planned implants (except 1A–2A scenarios)

### Biomechanical Rules
- Implant & natural tooth cannot be in the same bridge. (I-P-D prohibited)
- Max bridge length = 5 units (max 2 pontics)
- Cantilever only allowed in total planning.
- Free-end pontics prohibited. (I-p, D-p not allowed)

## Response Format
Respond with a JSON object following this exact structure:

\`\`\`json
{
  "quickOverview": {
    "totalImplants": number,
    "totalCrowns": number,
    "totalVeneers": number,
    "estimatedDuration": "X months",
    "complexityLevel": "Low/Medium/High"
  },
  "regionalPlanning": {
    "implantSites": [
      {
        "fdiNumber": "11",
        "toothName": "Upper Right Central Incisor",
        "implantType": "Nobel/Straumann/Osstem",
        "justification": "Missing tooth replacement"
      }
    ],
    "bridgeMembers": [
      {
        "fdiNumbers": ["12", "13"],
        "type": "pontic",
        "justification": "Bridge between implants"
      }
    ],
    "veneerTeeth": [
      {
        "fdiNumber": "11",
        "toothName": "Upper Right Central Incisor",
        "justification": "Smile line restoration"
      }
    ]
  },
  "detailedExplanation": {
    "missingTeeth": [
      {
        "fdiNumber": "11",
        "condition": "Missing",
        "action": "Implant placement",
        "justification": "Single missing tooth requires implant"
      }
    ],
    "extractableTeeth": [
      {
        "fdiNumber": "12",
        "condition": "Suspicious",
        "action": "Extraction",
        "justification": "Root canal required, adjacent implants present"
      }
    ],
    "biomechanicalAnalysis": {
      "implantDistribution": "Well distributed for optimal load sharing",
      "bridgeLength": "Within acceptable limits (max 5 units)",
      "occlusalLoad": "Properly distributed across implants and natural teeth"
    },
    "flexibilityAdjustments": {
      "systemicHealth": "Considerations based on patient's medical condition",
      "economicPreferences": "Treatment options adjusted for budget approach"
    }
  },
  "conclusion": {
    "consistencyWithGoals": "Plan aligns with patient's primary expectation",
    "systemRulesCompliance": "All biomechanical and planning rules followed",
    "recommendations": [
      "Immediate action required",
      "Follow-up considerations"
    ]
  },
  "treatmentSequence": [
    {
      "phase": 1,
      "title": "Preparation Phase",
      "treatments": ["Extractions", "Bone grafting if needed"],
      "duration": "2-4 weeks"
    },
    {
      "phase": 2,
      "title": "Implant Placement",
      "treatments": ["Implant surgery"],
      "duration": "1-2 weeks"
    },
    {
      "phase": 3,
      "title": "Healing Phase",
      "treatments": ["Osseointegration"],
      "duration": "3-6 months"
    },
    {
      "phase": 4,
      "title": "Restoration Phase",
      "treatments": ["Crown/Veneer placement"],
      "duration": "2-4 weeks"
    }
  ],
  "costEstimate": {
    "totalCost": "€X,XXX",
    "breakdown": {
      "implants": "€X,XXX",
      "crowns": "€X,XXX",
      "veneers": "€X,XXX",
      "additionalProcedures": "€X,XXX"
    },
    "paymentOptions": ["Full payment", "Installments", "Insurance coverage"]
  }
}
\`\`\`

Please analyze the provided data and generate a comprehensive treatment plan following all the specified rules and guidelines.
`;
  }
}

module.exports = { TreatmentPlanningService };

