const { TreatmentPlanningService } = require('./services/treatmentPlanning.service');

async function testTreatmentPlanning() {
  console.log('🧪 Testing Treatment Planning Service...\n');

  const service = new TreatmentPlanningService();

  // Sample CranioCatch data
  const cranioCatchData = {
    missingTeeth: "Teeth 11, 12, 21, 22 are missing",
    boneLevel: "47.07% bone loss detected in upper anterior region",
    implants: "No existing implants detected",
    lesions: "58.23% suspicious areas detected in upper jaw"
  };

  // Sample questionnaire data
  const questionnaireData = {
    age: 35,
    primaryExpectation: "Smile makeover",
    budgetApproach: "Premium",
    smoking: false,
    chronicDiseases: "None",
    medicalCondition: "Good"
  };

  try {
    console.log('📊 Input Data:');
    console.log('CranioCatch:', JSON.stringify(cranioCatchData, null, 2));
    console.log('Questionnaire:', JSON.stringify(questionnaireData, null, 2));
    console.log('\n🤖 Generating treatment plan...\n');

    const result = await service.generateTreatmentPlan(cranioCatchData, questionnaireData);

    if (result.success) {
      console.log('✅ Treatment plan generated successfully!');
      console.log('\n📋 Generated Plan:');
      console.log(JSON.stringify(result.plan, null, 2));
    } else {
      console.log('❌ Failed to generate treatment plan:');
      console.log('Error:', result.error);
      console.log('Raw response:', result.rawResponse);
    }
  } catch (error) {
    console.error('💥 Error during testing:', error);
  }
}

testTreatmentPlanning();

