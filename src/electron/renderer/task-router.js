(function attachTaskRouter(global) {
  const TASKS = {
    public_opinion: {
      label: '舆情裁决',
      workflow: 'public_opinion_truth_workflow',
      template: 'public_opinion_verdict_report',
      keywords: [
        '舆论',
        '舆情',
        '风评',
        '口碑',
        '声誉',
        '热搜',
        '翻车',
        '发酵',
        '回应',
        '公关',
        '负面',
        '争议',
        '骂',
        '塌房',
      ],
    },
    fact_check: {
      label: '内容真假核验',
      workflow: 'fact_check_truth_workflow',
      template: 'fact_check_verdict_report',
      keywords: ['真假', '真实', '真实吗', '谣言', '爆料', '网传', '传闻', '截图', '视频', '这段话', '这张图', '聊天记录', '造假', '可信', '辟谣'],
    },
    competitor_analysis: {
      label: '竞品对比',
      workflow: 'competitor_analysis_workflow',
      template: 'competitor_comparison_report',
      keywords: ['竞品', '对比', '哪个好', '区别', '差异', '功能', '价格', '选型', '替代', '相比', '优劣', '优势', '企业协作', 'CRM', 'SaaS'],
    },
    consumer_purchase: {
      label: '消费选购决策',
      workflow: 'consumer_purchase_workflow',
      template: 'consumer_purchase_decision_report',
      keywords: [
        '性价比',
        '值得买',
        '买哪',
        '买哪个',
        '怎么选',
        '选哪',
        '入手',
        '购买',
        '预算',
        '便宜',
        '划算',
        '适合我',
        '机型',
        '型号',
        '版本',
        '系列',
        '手机',
        '电脑',
        '相机',
        '汽车',
        '家电',
        '耳机',
        '平板',
      ],
    },
    investment_research: {
      label: '投研/政策影响',
      workflow: 'investment_research_workflow',
      template: 'investment_policy_report',
      keywords: ['政策', '行业', '投研', '公司', '股票', '市场', '利好', '利空', '影响', '产业链', '财报', '融资', '风险大吗'],
    },
    knowledge_brief: {
      label: '知识简报',
      workflow: 'knowledge_brief_workflow',
      template: 'knowledge_brief_report',
      keywords: ['是什么', '什么是', '为什么', '怎么理解', '如何理解', '原理', '解释', '科普', '总结', '梳理', '分析一下', '怎么看', '背景', '趋势', '区块链'],
    },
    creative_content: {
      label: '内容创作方案',
      workflow: 'creative_content_workflow',
      template: 'creative_content_report',
      keywords: ['写', '文案', '脚本', '标题', '小红书', '短视频', '公众号', '海报', '广告', '营销', '方案', '策划', '改写', '润色', '直播', '促销', '话术'],
    },
    technical_diagnosis: {
      label: '技术诊断',
      workflow: 'technical_diagnosis_workflow',
      template: 'technical_diagnosis_report',
      keywords: ['代码', 'bug', '报错', '接口', '数据库', '架构', '部署', '性能', '前端', '后端', 'api', '服务器', '日志', '异常', '内存泄漏', '诊断'],
    },
    learning_research: {
      label: '学习研究',
      workflow: 'learning_research_workflow',
      template: 'learning_research_report',
      keywords: ['学习', '课程', '考试', '论文', '文献', '研究', '综述', '笔记', '知识点', '备考', '教材', '作业'],
    },
    travel_lifestyle: {
      label: '旅行/本地生活',
      workflow: 'travel_lifestyle_workflow',
      template: 'travel_lifestyle_report',
      keywords: ['旅游', '旅行', '攻略', '路线', '酒店', '餐厅', '景点', '去哪玩', '行程', '周末', '城市', '附近'],
    },
    career_recruiting: {
      label: '职业/招聘',
      workflow: 'career_recruiting_workflow',
      template: 'career_recruiting_report',
      keywords: ['简历', '面试', '岗位', '职业', '招聘', '跳槽', 'offer', '薪资', '求职', '绩效', 'okr', '述职', '大厂', '创业公司'],
    },
    legal_risk: {
      label: '法律/合规初筛',
      workflow: 'legal_risk_screening_workflow',
      template: 'legal_risk_screening_report',
      keywords: ['合同', '条款', '违法', '违规', '合规', '法律', '侵权', '责任', '诉讼', '处罚', '律师', '风险条款', '竞业限制'],
      highRisk: true,
    },
    medical_health: {
      label: '医疗健康初筛',
      workflow: 'medical_health_screening_workflow',
      template: 'medical_health_screening_report',
      keywords: ['症状', '体检', '报告单', '用药', '药', '医院', '医生', '疾病', '治疗', '诊断', '疼', '发烧', '咳嗽', '血压', '血糖', '失眠'],
      highRisk: true,
    },
    finance_planning: {
      label: '金融规划初筛',
      workflow: 'finance_planning_workflow',
      template: 'finance_planning_report',
      keywords: ['理财', '基金', '保险', '贷款', '房贷', '信用卡', '还款', '资产配置', '收益', '亏损', '买入', '卖出', '投资建议', '养老金'],
      highRisk: true,
    },
    general_compare: {
      label: '通用多源对比',
      workflow: 'general_compare_workflow',
      template: 'general_compare_report',
      keywords: [],
    },
  };

  function normalize(text) {
    return String(text || '').trim().toLowerCase();
  }

  function isGenericOpenEnded(question) {
    const compact = String(question || '').replace(/\s+/g, '');
    if (!compact) return true;
    if (compact.length > 14) return false;
    return /^(帮我)?(分析|看看|看下|研究|说说)(一下)?(这个|这件)?(事情|问题|内容)?$/.test(compact) || /^(这个|这件)?(事|事情|问题)?你怎么看$/.test(compact);
  }

  function keywordHits(question, keywords) {
    return keywords.filter((keyword) => question.includes(String(keyword).toLowerCase()));
  }

  function inferByShape(question) {
    const hints = [];
    if (/[和与vsVS]/.test(question) && /(哪个好|区别|差异|对比|相比|优劣)/.test(question)) {
      hints.push('competitor_analysis');
    }
    if (/(saas|crm|系统|软件|平台|工具|企业协作).*(选型|对比|哪个好|区别|差异|替代|功能)/i.test(question)) {
      hints.push('competitor_analysis');
    }
    if (/(性价比|值得买|买哪|买哪个|怎么选|选哪|入手|购买|推荐|预算|划算|适合我)/.test(question)) {
      hints.push('consumer_purchase');
    }
    if (/(iphone|手机|电脑|笔记本|平板|耳机|相机|汽车|家电).*(性价比|值得买|买哪|买哪个|怎么选|选哪|推荐|预算)/i.test(question)) {
      hints.push('consumer_purchase');
    }
    if (/(iphone|手机|电脑|笔记本|平板|耳机|相机|汽车|家电).*(机型|型号|版本|系列).*(对比|区别|差异|怎么选|选哪|推荐)/i.test(question)) {
      hints.push('consumer_purchase');
    }
    if (/(iphone|手机|电脑|笔记本|平板|耳机|相机|汽车|家电).*(对比|区别|差异).*(机型|型号|版本|系列)/i.test(question)) {
      hints.push('consumer_purchase');
    }
    if (/(写|生成|创作|润色|改写).*(文案|脚本|标题|方案|文章|小红书|短视频|公众号|广告)/.test(question)) {
      hints.push('creative_content');
    }
    if (/(代码|bug|报错|接口|数据库|架构|部署|性能|api|日志).*(怎么|为什么|修|优化|设计|实现|排查)/i.test(question)) {
      hints.push('technical_diagnosis');
    }
    if (/(node|electron|前端|后端|服务|服务器|进程).*(内存泄漏|诊断|排查|报错|异常)/i.test(question)) {
      hints.push('technical_diagnosis');
    }
    if (/(学习|考试|论文|文献|研究|综述|备考|课程).*(计划|总结|分析|怎么|如何|框架|提纲)/.test(question)) {
      hints.push('learning_research');
    }
    if (/(旅游|旅行|攻略|路线|酒店|餐厅|景点|去哪玩|行程).*(推荐|怎么|安排|几天|附近|预算)/.test(question)) {
      hints.push('travel_lifestyle');
    }
    if (/(简历|面试|岗位|职业|招聘|跳槽|offer|薪资).*(优化|怎么|准备|分析|建议|匹配)/i.test(question)) {
      hints.push('career_recruiting');
    }
    if (/(跳槽|述职|绩效|晋升|大厂|创业公司|岗位|职业).*(怎么|如何|准备|选择|选|报告|回答|建议)/i.test(question)) {
      hints.push('career_recruiting');
    }
    if (/(合同|条款|违法|违规|合规|法律|侵权|竞业限制|律师函).*(风险|责任|判断|分析|保留证据|清楚|是否|有没有)/.test(question)) {
      hints.push('legal_risk');
    }
    if (/(症状|体检|用药|药|医院|医生|疾病|治疗|诊断|疼|发烧|咳嗽|血压|血糖)/.test(question)) {
      hints.push('medical_health');
    }
    if (/(理财|基金|保险|贷款|房贷|信用卡|资产配置|收益|亏损|买入|卖出|投资建议)/.test(question)) {
      hints.push('finance_planning');
    }
    if (/(最近|当前|现在|这几天|有没有).*(怎么样|怎么看|风评|舆论|舆情|争议|负面)/.test(question)) {
      hints.push('public_opinion');
    }
    if (/(明星|网红|导演|演员|品牌|人物|个人).*(争议|翻车|口碑|风评|声誉|负面|公关)/.test(question)) {
      hints.push('public_opinion');
    }
    if (/(真的假的|是不是真的|是否真实|可信吗|是否可信|是不是谣言)/.test(question)) {
      hints.push('fact_check');
    }
    if (/(对.*影响|影响.*行业|利好|利空|产业链|政策.*影响)/.test(question)) {
      hints.push('investment_research');
    }
    return hints;
  }

  function createTaskRouter() {
    function routeQuestion(rawQuestion) {
      const question = normalize(rawQuestion);
      if (isGenericOpenEnded(question)) {
        const task = TASKS.general_compare;
        return {
          task_type: 'general_compare',
          label: task.label,
          confidence: 0.48,
          reason: '问题信息量不足，先按通用多源对比处理，避免误判到具体场景。',
          recommended_workflow: task.workflow,
          recommended_template: task.template,
          risk_note: '',
        };
      }

      const shapeHints = inferByShape(question);
      const scored = Object.entries(TASKS)
        .filter(([type]) => type !== 'general_compare')
        .map(([type, task]) => {
          const hits = keywordHits(question, task.keywords);
          const shapeBoost = shapeHints.includes(type) ? 2 : 0;
          const score = hits.length + shapeBoost;
          return { type, task, hits, score };
        })
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      const selected = best && best.score > 0 ? best : { type: 'general_compare', task: TASKS.general_compare, hits: [], score: 0 };
      const confidence =
        selected.type === 'general_compare'
          ? 0.46
          : Math.max(0.62, Math.min(0.94, 0.56 + selected.score * 0.1 + Math.min(selected.hits.length, 4) * 0.03));
      const lowConfidence = confidence < 0.62;
      const finalType = lowConfidence ? 'general_compare' : selected.type;
      const finalTask = TASKS[finalType];

      return {
        task_type: finalType,
        label: finalTask.label,
        confidence,
        reason:
          finalType === 'general_compare'
            ? '问题意图较宽泛，先按通用多源对比处理。'
            : `命中「${finalTask.label}」特征：${selected.hits.slice(0, 5).join('、') || '问题结构匹配'}`,
        recommended_workflow: finalTask.workflow,
        recommended_template: finalTask.template,
        risk_note: finalTask.highRisk ? '该问题属于高风险初筛场景，报告应保留复核提示，不输出正式专业意见。' : '',
      };
    }

    return { routeQuestion };
  }

  const api = {
    createTaskRouter,
    routeQuestion: createTaskRouter().routeQuestion,
  };

  global.DuoliTaskRouter = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
