(function attachWorkflowRegistry(global) {
  const DEFAULT_WORKFLOW = {
    id: 'general_compare_workflow',
    taskType: 'general_compare',
    label: '通用多源对比',
  };

  function normalizeTaskType(taskRouteOrType) {
    if (typeof taskRouteOrType === 'string') return taskRouteOrType || 'general_compare';
    return (taskRouteOrType && taskRouteOrType.task_type) || 'general_compare';
  }

  function createWorkflowRegistry() {
    const workflows = new Map();

    function register(taskType, workflow) {
      if (!taskType || !workflow) return;
      workflows.set(taskType, {
        ...workflow,
        taskType,
      });
    }

    function resolve(taskRouteOrType) {
      const taskType = normalizeTaskType(taskRouteOrType);
      return workflows.get(taskType) || DEFAULT_WORKFLOW;
    }

    register('public_opinion', global.DuoliPublicOpinionWorkflow);
    register('fact_check', global.DuoliFactCheckWorkflow);
    register('competitor_analysis', global.DuoliCompetitorWorkflow);
    register('consumer_purchase', global.DuoliConsumerPurchaseWorkflow);
    register('investment_research', global.DuoliInvestmentWorkflow);
    register('legal_risk', global.DuoliLegalRiskWorkflow);
    register('knowledge_brief', global.DuoliKnowledgeBriefWorkflow);
    register('creative_content', global.DuoliCreativeContentWorkflow);
    register('technical_diagnosis', global.DuoliTechnicalDiagnosisWorkflow);
    register('learning_research', global.DuoliLearningResearchWorkflow);
    register('travel_lifestyle', global.DuoliTravelLifestyleWorkflow);
    register('career_recruiting', global.DuoliCareerRecruitingWorkflow);
    register('medical_health', global.DuoliMedicalHealthWorkflow);
    register('finance_planning', global.DuoliFinancePlanningWorkflow);
    register('general_compare', global.DuoliGeneralCompareWorkflow);

    return {
      register,
      resolve,
      list: () => Array.from(workflows.values()),
    };
  }

  global.DuoliWorkflowRegistry = {
    createWorkflowRegistry,
    resolve(taskRouteOrType) {
      return createWorkflowRegistry().resolve(taskRouteOrType);
    },
  };
})(window);
