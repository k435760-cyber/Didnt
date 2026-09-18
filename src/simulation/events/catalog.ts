import type { GameEventDefinition, Modifier, ModifierField } from '@/types';

/**
 * 이벤트 효과 단위
 * - gdpGrowth / inflation / unemployment : %p (해당 턴 계산에 가산)
 * - consumption / investment / exports / imports / revenue / spending : GDP 대비 %p
 * - productivity / competitiveness / militaryReadiness : 지수 포인트(분기당)
 * - approval / stability : 지지율·안정성 목표치에 가산되는 포인트
 * - fertility : 합계출산율 목표에 가산
 * - migration : 인구 1,000명당 순이민율 목표에 가산
 * - debt : 10억 USD(분기당)
 * - energyCost : 에너지 가격 충격 지수(1.0 = 평시 대비 큰 충격)
 */
const mod = (field: ModifierField, value: number, turns: number, label: string): Modifier => ({
  field,
  value,
  turns,
  label,
});

const ECONOMY_EVENTS: GameEventDefinition[] = [
  {
    id: 'financial_crisis',
    title: '대규모 금융위기',
    description:
      '주요 은행의 부실채권이 한꺼번에 드러나면서 은행 간 자금시장이 마비됐습니다. 기업 어음 발행이 중단되고 신용경색이 실물경제로 번지고 있습니다.',
    category: 'economy',
    probability: 0.05,
    conditions: { minTurn: 4 },
    duration: 4,
    cooldown: 24,
    effects: [],
    choices: [
      {
        id: 'stimulus',
        label: '대규모 경기부양책 시행',
        description: '공적자금을 투입해 은행을 자본확충하고, 추경으로 내수를 떠받칩니다.',
        outlook: ['단기 성장률 방어', '국가부채 증가', '물가 상승 압력'],
        modifiers: [
          mod('gdpGrowth', 1.1, 4, '경기부양 효과'),
          mod('spending', 2.4, 4, '공적자금 투입'),
          mod('inflation', 0.6, 4, '유동성 확대'),
          mod('unemployment', -0.15, 4, '고용 유지 지원'),
        ],
        immediate: { approval: 4 },
      },
      {
        id: 'market',
        label: '시장 자율 조정에 맡김',
        description: '부실 금융기관을 정리하고 구제금융 없이 시장이 청산되도록 둡니다.',
        outlook: ['재정 부담 없음', '단기 실업률 급등', '지지율 하락 위험'],
        modifiers: [
          mod('gdpGrowth', -2.2, 4, '신용경색'),
          mod('unemployment', 0.55, 4, '기업 구조조정'),
          mod('investment', -3.5, 4, '투자 위축'),
        ],
        immediate: { approval: -7, stability: -4 },
      },
    ],
  },
  {
    id: 'stock_rally',
    title: '주식시장 급등',
    description:
      '외국인 자금이 대거 유입되며 주가지수가 분기 만에 20% 넘게 올랐습니다. 자산효과로 소비심리가 개선되고 있습니다.',
    category: 'economy',
    probability: 0.06,
    duration: 3,
    cooldown: 12,
    effects: [
      mod('consumption', 1.8, 3, '자산효과'),
      mod('gdpGrowth', 0.5, 3, '소비심리 개선'),
      mod('investment', 1.2, 3, '자금조달 개선'),
    ],
  },
  {
    id: 'housing_bubble',
    title: '부동산 가격 과열',
    description:
      '수도권 주택 가격이 1년 만에 25% 상승했습니다. 가계부채가 사상 최대치를 기록했고, 청년층의 주거 부담이 정치 쟁점으로 떠올랐습니다.',
    category: 'economy',
    probability: 0.055,
    conditions: { minTurn: 6 },
    duration: 6,
    cooldown: 20,
    effects: [],
    choices: [
      {
        id: 'tighten',
        label: '대출 규제와 보유세 강화',
        description: '주택담보대출 한도를 조이고 다주택자 과세를 강화합니다.',
        outlook: ['물가 안정', '건설투자 위축', '유주택자 반발'],
        modifiers: [
          mod('investment', -2.2, 5, '건설투자 위축'),
          mod('inflation', -0.4, 5, '자산가격 안정'),
          mod('revenue', 0.35, 6, '보유세 증수'),
        ],
        immediate: { approval: -3 },
      },
      {
        id: 'supply',
        label: '공급 확대로 대응',
        description: '공공택지를 풀어 대규모 주택 공급 계획을 발표합니다.',
        outlook: ['단기 건설경기 부양', '재정지출 증가', '효과 발현 지연'],
        modifiers: [
          mod('gdpGrowth', 0.6, 6, '건설투자 확대'),
          mod('spending', 1.1, 6, '공공택지 조성'),
          mod('fertility', 0.05, 8, '주거 부담 완화'),
        ],
        immediate: { approval: 3 },
      },
      {
        id: 'ignore',
        label: '시장에 개입하지 않음',
        description: '가격은 시장이 결정한다는 기조를 유지합니다.',
        outlook: ['단기 성장 유지', '가계부채 위험 누적', '청년층 지지 이탈'],
        modifiers: [
          mod('consumption', 1.0, 4, '자산효과'),
          mod('inflation', 0.35, 6, '주거비 상승'),
          mod('fertility', -0.06, 10, '주거비 부담'),
        ],
        immediate: { approval: -5, stability: -3 },
      },
    ],
  },
  {
    id: 'commodity_spike',
    title: '원자재 가격 폭등',
    description:
      '산유국의 감산 결정으로 국제유가가 분기 만에 40% 올랐습니다. 에너지 수입 의존도가 높을수록 타격이 큽니다.',
    category: 'economy',
    probability: 0.07,
    conditions: { minEnergyDependence: 40 },
    duration: 4,
    cooldown: 10,
    effects: [
      mod('energyCost', 1.6, 4, '국제 에너지 가격 급등'),
      mod('gdpGrowth', -0.5, 4, '교역조건 악화'),
    ],
  },
  {
    id: 'export_boom',
    title: '수출 호황',
    description:
      '주요 교역국의 경기 회복으로 주력 산업 수주가 급증했습니다. 무역수지가 큰 폭의 흑자로 돌아섰습니다.',
    category: 'economy',
    probability: 0.06,
    duration: 4,
    cooldown: 12,
    effects: [
      mod('exports', 3.2, 4, '수출 급증'),
      mod('gdpGrowth', 0.7, 4, '수출 호조'),
      mod('competitiveness', 0.25, 4, '생산능력 확충'),
    ],
  },
  {
    id: 'credit_crunch',
    title: '중소기업 신용경색',
    description:
      '금리 급등으로 한계기업의 연쇄 부도가 시작됐습니다. 지방은행의 건전성 우려가 제기되고 있습니다.',
    category: 'economy',
    probability: 0.05,
    conditions: { minTurn: 4 },
    duration: 3,
    cooldown: 14,
    effects: [
      mod('investment', -2.4, 3, '자금경색'),
      mod('unemployment', 0.3, 3, '한계기업 도산'),
      mod('gdpGrowth', -0.7, 3, '신용 위축'),
    ],
  },
  {
    id: 'debt_warning',
    title: '국가신용등급 전망 하향',
    description:
      '국제 신용평가사가 재정건전성 악화를 이유로 국가신용등급 전망을 부정적으로 조정했습니다.',
    category: 'economy',
    probability: 0.08,
    conditions: { minDebtToGdp: 120 },
    duration: 6,
    cooldown: 12,
    effects: [
      mod('investment', -1.6, 6, '대외신인도 하락'),
      mod('approval', -4, 6, '재정 불안 우려'),
      mod('exports', -0.8, 6, '조달비용 상승'),
    ],
  },
];

const SOCIETY_EVENTS: GameEventDefinition[] = [
  {
    id: 'mass_protest',
    title: '대규모 반정부 시위',
    description:
      '생활물가 급등과 정책 불신이 겹치며 주말마다 수십만 명이 거리로 나오고 있습니다. 주요 도심 기능이 마비됐습니다.',
    category: 'society',
    probability: 0.07,
    conditions: { maxApproval: 40 },
    duration: 3,
    cooldown: 8,
    effects: [],
    choices: [
      {
        id: 'dialogue',
        label: '대화와 정책 수정',
        description: '시위 대표단과 공개 협의체를 구성하고 일부 요구를 수용합니다.',
        outlook: ['정치 안정성 회복', '재정지출 증가', '정책 일관성 훼손'],
        modifiers: [mod('spending', 0.8, 4, '요구 수용 예산'), mod('stability', 6, 4, '갈등 완화')],
        immediate: { approval: 5 },
      },
      {
        id: 'crackdown',
        label: '공권력으로 해산',
        description: '집회를 불법으로 규정하고 경찰력을 투입합니다.',
        outlook: ['단기 질서 회복', '지지율 급락', '장기 불안정'],
        modifiers: [
          mod('stability', -10, 6, '사회 갈등 심화'),
          mod('approval', -8, 6, '강경 진압 반발'),
        ],
        immediate: { stability: 4 },
      },
    ],
  },
  {
    id: 'fertility_collapse',
    title: '출산율 사상 최저',
    description:
      '분기 출생아 수가 통계 작성 이래 최저치를 기록했습니다. 인구 감소 시점이 예상보다 앞당겨질 전망입니다.',
    category: 'society',
    probability: 0.08,
    conditions: { maxFertility: 1.3 },
    duration: 8,
    cooldown: 16,
    effects: [],
    choices: [
      {
        id: 'cash',
        label: '출산·양육 현금 지원 확대',
        description: '출산지원금과 아동수당을 대폭 인상합니다.',
        outlook: ['즉시 체감되는 지원', '재정 부담 즉시 발생', '효과는 제한적'],
        modifiers: [
          mod('fertility', 0.08, 12, '현금 지원'),
          mod('spending', 1.2, 12, '아동수당 확대'),
        ],
        immediate: { approval: 4 },
      },
      {
        id: 'infrastructure',
        label: '보육·주거 인프라 투자',
        description: '국공립 어린이집과 신혼부부 주택 공급을 대폭 늘립니다.',
        outlook: ['장기 출산율 개선', '초기 재정 부담', '효과 발현까지 수 년'],
        modifiers: [
          mod('fertility', 0.16, 24, '보육·주거 인프라'),
          mod('spending', 1.6, 16, '인프라 투자'),
          mod('gdpGrowth', 0.2, 8, '건설투자'),
        ],
        immediate: { approval: 1 },
      },
    ],
  },
  {
    id: 'immigration_surge',
    title: '이민 신청 급증',
    description:
      '인접국의 경제난으로 취업 이민 신청이 세 배로 늘었습니다. 노동력 부족 업종에서는 환영하지만 사회적 갈등도 커지고 있습니다.',
    category: 'society',
    probability: 0.055,
    duration: 6,
    cooldown: 14,
    effects: [],
    choices: [
      {
        id: 'accept',
        label: '적극 수용',
        description: '숙련 인력 중심으로 취업비자를 대폭 확대합니다.',
        outlook: ['노동력 확충', '성장률 개선', '사회 갈등 증가'],
        modifiers: [
          mod('migration', 2.2, 12, '이민 확대'),
          mod('gdpGrowth', 0.3, 8, '노동력 확충'),
          mod('stability', -4, 8, '사회 갈등'),
        ],
      },
      {
        id: 'restrict',
        label: '심사 강화',
        description: '쿼터를 유지하고 심사 기준을 높입니다.',
        outlook: ['사회 갈등 억제', '인력난 지속', '고령화 가속'],
        modifiers: [
          mod('migration', -0.8, 12, '이민 제한'),
          mod('unemployment', -0.1, 6, '내국인 고용 보호'),
          mod('stability', 2, 6, '갈등 완화'),
        ],
      },
    ],
  },
  {
    id: 'labor_strike',
    title: '전국 단위 노동 파업',
    description:
      '실질임금 하락에 항의하는 총파업이 시작됐습니다. 완성차·철강·물류가 동시에 멈췄습니다.',
    category: 'society',
    probability: 0.06,
    conditions: { minInflation: 3.5 },
    duration: 2,
    cooldown: 10,
    effects: [],
    choices: [
      {
        id: 'concede',
        label: '임금 인상 요구 수용',
        description: '공공부문 임금 인상을 선도하고 민간에 권고합니다.',
        outlook: ['파업 조기 종료', '소비 여력 증가', '물가 상승 압력'],
        modifiers: [
          mod('consumption', 1.4, 4, '실질임금 회복'),
          mod('inflation', 0.5, 4, '임금-물가 상승 압력'),
          mod('spending', 0.5, 4, '공공부문 인건비'),
        ],
        immediate: { approval: 3 },
      },
      {
        id: 'resist',
        label: '불법 파업 규정, 강경 대응',
        description: '업무개시명령을 내리고 손해배상 청구를 예고합니다.',
        outlook: ['물가 안정 유지', '생산 차질 지속', '노정 갈등 장기화'],
        modifiers: [
          mod('gdpGrowth', -0.8, 3, '생산 차질'),
          mod('stability', -6, 6, '노정 갈등'),
          mod('exports', -1.2, 3, '납기 지연'),
        ],
      },
    ],
  },
  {
    id: 'pension_alarm',
    title: '연금 재정 고갈 경고',
    description:
      '국민연금 재정추계 결과 고갈 시점이 앞당겨졌다는 발표가 나왔습니다. 세대 간 형평성 논쟁이 격화되고 있습니다.',
    category: 'society',
    probability: 0.05,
    conditions: { minElderlyShare: 18 },
    duration: 8,
    cooldown: 20,
    effects: [
      mod('approval', -3, 8, '연금 불안'),
      mod('consumption', -0.8, 8, '노후 대비 저축 증가'),
    ],
  },
  {
    id: 'brain_drain',
    title: '고급 인력 해외 유출',
    description:
      '반도체·바이오 핵심 연구인력이 해외 기업으로 대거 이직하고 있습니다. 대학원 지원자도 줄었습니다.',
    category: 'society',
    probability: 0.045,
    conditions: { minTurn: 8 },
    duration: 10,
    cooldown: 20,
    effects: [
      mod('productivity', -0.12, 10, '핵심 인력 유출'),
      mod('competitiveness', -0.2, 10, '기술 경쟁력 약화'),
      mod('migration', -0.5, 10, '순유출 확대'),
    ],
  },
];

const DISASTER_EVENTS: GameEventDefinition[] = [
  {
    id: 'earthquake',
    title: '대규모 지진',
    description:
      '규모 6.8의 지진이 산업단지를 강타했습니다. 생산설비 파손과 이재민 발생으로 긴급 대응이 필요합니다.',
    category: 'disaster',
    probability: 0.035,
    duration: 4,
    cooldown: 16,
    effects: [],
    choices: [
      {
        id: 'full_response',
        label: '재난 특별교부금 즉시 투입',
        description: '피해 지역을 특별재난지역으로 선포하고 복구 예산을 전액 지원합니다.',
        outlook: ['빠른 복구', '재정적자 확대', '지지율 상승'],
        modifiers: [mod('spending', 2.0, 4, '재난 복구'), mod('gdpGrowth', 0.4, 4, '복구 투자')],
        immediate: { approval: 6, debt: 0 },
      },
      {
        id: 'minimal',
        label: '최소 지원 후 민간 보험에 위임',
        description: '기본 구호만 제공하고 복구는 보험과 지방정부에 맡깁니다.',
        outlook: ['재정 부담 최소', '복구 지연', '지지율 급락'],
        modifiers: [
          mod('gdpGrowth', -1.2, 5, '복구 지연'),
          mod('productivity', -0.15, 6, '설비 손실'),
        ],
        immediate: { approval: -9, stability: -5 },
      },
    ],
  },
  {
    id: 'flood',
    title: '기록적 폭우와 홍수',
    description:
      '한 달 치 강수량이 이틀 만에 쏟아지며 주요 하천이 범람했습니다. 농경지와 도로가 침수됐습니다.',
    category: 'disaster',
    probability: 0.05,
    duration: 3,
    cooldown: 8,
    effects: [
      mod('gdpGrowth', -0.6, 3, '침수 피해'),
      mod('spending', 0.9, 3, '수해 복구'),
      mod('inflation', 0.4, 3, '농산물 가격 급등'),
    ],
  },
  {
    id: 'typhoon',
    title: '초강력 태풍 상륙',
    description: '최대풍속 55m/s의 태풍이 연안 산업지대를 관통했습니다. 항만 운영이 중단됐습니다.',
    category: 'disaster',
    probability: 0.045,
    duration: 3,
    cooldown: 8,
    effects: [
      mod('gdpGrowth', -0.7, 3, '태풍 피해'),
      mod('exports', -1.5, 3, '항만 마비'),
      mod('spending', 0.8, 3, '복구 예산'),
    ],
  },
  {
    id: 'drought',
    title: '장기 가뭄',
    description:
      '2분기 연속 강수량이 평년의 40% 수준에 머물며 농업용수와 공업용수가 모두 부족합니다.',
    category: 'disaster',
    probability: 0.04,
    duration: 5,
    cooldown: 12,
    effects: [
      mod('inflation', 0.7, 5, '식료품 가격 상승'),
      mod('gdpGrowth', -0.4, 5, '용수 부족'),
      mod('energyCost', 0.4, 5, '수력발전 감소'),
    ],
  },
  {
    id: 'wildfire',
    title: '대형 산불',
    description: '건조한 날씨 속 산불이 닷새째 이어지며 임야 4만 헥타르가 소실됐습니다.',
    category: 'disaster',
    probability: 0.04,
    duration: 2,
    cooldown: 10,
    effects: [
      mod('spending', 0.6, 2, '진화·복구 비용'),
      mod('approval', -2, 3, '대응 논란'),
      mod('gdpGrowth', -0.3, 2, '지역경제 피해'),
    ],
  },
  {
    id: 'pandemic',
    title: '신종 감염병 확산',
    description:
      '호흡기 감염병이 빠르게 번지고 있습니다. 의료 대응 역량과 경제 활동 사이에서 선택이 필요합니다.',
    category: 'disaster',
    probability: 0.03,
    conditions: { minTurn: 6 },
    duration: 6,
    cooldown: 32,
    effects: [],
    choices: [
      {
        id: 'lockdown',
        label: '강력한 방역 조치',
        description: '다중이용시설 영업을 제한하고 이동을 통제합니다.',
        outlook: ['인명 피해 최소화', '내수 급랭', '자영업 타격'],
        modifiers: [
          mod('consumption', -4.5, 5, '영업 제한'),
          mod('unemployment', 0.6, 5, '서비스업 고용 감소'),
          mod('gdpGrowth', -1.8, 5, '방역 조치'),
          mod('spending', 1.8, 5, '손실보상'),
        ],
        immediate: { approval: 2 },
      },
      {
        id: 'mitigate',
        label: '의료 대응 중심의 완화 전략',
        description: '병상과 치료제를 확충하되 경제활동 제한은 최소화합니다.',
        outlook: ['경제 충격 완화', '의료 부담 급증', '사망률 상승'],
        modifiers: [
          mod('gdpGrowth', -0.6, 5, '방역 부담'),
          mod('spending', 1.0, 5, '의료 대응'),
          mod('approval', -5, 6, '방역 논란'),
        ],
      },
    ],
  },
];

const INTERNATIONAL_EVENTS: GameEventDefinition[] = [
  {
    id: 'diplomatic_dispute',
    title: '주요국과의 외교 갈등',
    description:
      '역사·영토 문제로 촉발된 갈등이 통상 분야로 번지고 있습니다. 상대국이 비공식 보복 조치를 시사했습니다.',
    category: 'international',
    probability: 0.06,
    duration: 4,
    cooldown: 10,
    effects: [
      mod('exports', -1.8, 4, '통상 마찰'),
      mod('competitiveness', -0.15, 4, '공급망 차질'),
    ],
  },
  {
    id: 'economic_sanctions',
    title: '경제 제재 부과',
    description:
      '국제사회가 특정 산업에 대한 수출 통제를 발표했습니다. 핵심 부품 조달에 차질이 예상됩니다.',
    category: 'international',
    probability: 0.035,
    conditions: { minTurn: 8 },
    duration: 8,
    cooldown: 20,
    effects: [
      mod('exports', -4.0, 8, '수출 통제'),
      mod('imports', -1.5, 8, '조달 차질'),
      mod('gdpGrowth', -0.9, 8, '제재 영향'),
      mod('competitiveness', -0.3, 8, '기술 접근 제한'),
    ],
  },
  {
    id: 'trade_pact_offer',
    title: '다자 무역협정 참여 제안',
    description:
      '주요 경제권이 신규 무역 블록 참여를 제안했습니다. 관세 인하 대신 농업·서비스 시장 개방이 요구됩니다.',
    category: 'international',
    probability: 0.05,
    conditions: { minTurn: 4 },
    duration: 12,
    cooldown: 24,
    effects: [],
    choices: [
      {
        id: 'join',
        label: '협정 참여',
        description: '시장 개방을 수용하고 무역 블록에 합류합니다.',
        outlook: ['수출 확대', '경쟁력 개선', '농업 부문 반발'],
        modifiers: [
          mod('exports', 2.6, 16, '관세 인하'),
          mod('imports', 1.6, 16, '시장 개방'),
          mod('competitiveness', 0.3, 16, '경쟁 압력'),
          mod('approval', -3, 6, '농업계 반발'),
        ],
      },
      {
        id: 'decline',
        label: '참여 유보',
        description: '국내 산업 보호를 이유로 참여를 미룹니다.',
        outlook: ['국내 산업 보호', '수출 기회 상실', '장기 경쟁력 약화'],
        modifiers: [
          mod('competitiveness', -0.18, 12, '개방 지연'),
          mod('exports', -0.6, 12, '무역 블록 배제'),
        ],
        immediate: { approval: 2 },
      },
    ],
  },
  {
    id: 'border_conflict',
    title: '접경지역 무력 충돌',
    description:
      '국경에서 소규모 교전이 발생해 사상자가 나왔습니다. 여론은 강경 대응을 요구하고 있습니다.',
    category: 'international',
    probability: 0.04,
    conditions: { minTurn: 6 },
    duration: 4,
    cooldown: 16,
    effects: [],
    choices: [
      {
        id: 'escalate',
        label: '군사적 강경 대응',
        description: '접경지역에 병력을 증파하고 보복 작전을 승인합니다.',
        outlook: ['단기 지지율 결집', '군사 긴장 고조', '투자 위축'],
        modifiers: [
          mod('militaryReadiness', 6, 6, '전력 증강'),
          mod('investment', -2.0, 6, '지정학 리스크'),
          mod('spending', 0.8, 6, '전력 증강 비용'),
        ],
        immediate: { approval: 5, relations: { target: 'all', delta: -6 } },
      },
      {
        id: 'negotiate',
        label: '외교 채널로 수습',
        description: '즉각 군사회담을 제안하고 재발방지책을 협의합니다.',
        outlook: ['긴장 완화', '내부 비판', '투자 안정'],
        modifiers: [mod('stability', 3, 4, '긴장 완화')],
        immediate: { approval: -4, relations: { target: 'all', delta: 6 } },
      },
    ],
  },
  {
    id: 'refugee_influx',
    title: '대규모 난민 유입',
    description:
      '인접 지역의 내전으로 수십만 명의 난민이 국경으로 몰리고 있습니다. 국제사회가 분담을 요구합니다.',
    category: 'international',
    probability: 0.04,
    duration: 8,
    cooldown: 18,
    effects: [],
    choices: [
      {
        id: 'accept',
        label: '인도적 수용',
        description: '수용 시설을 마련하고 노동시장 편입을 지원합니다.',
        outlook: ['국제 평판 상승', '재정 부담', '단기 실업률 상승'],
        modifiers: [
          mod('migration', 3.0, 8, '난민 수용'),
          mod('spending', 1.0, 8, '수용·정착 지원'),
          mod('unemployment', 0.3, 6, '노동시장 편입 지연'),
          mod('stability', -3, 8, '사회 갈등'),
        ],
        immediate: { relations: { target: 'all', delta: 5 } },
      },
      {
        id: 'control',
        label: '국경 통제 강화',
        description: '국경 경비를 강화하고 인접국 지원으로 대체합니다.',
        outlook: ['국내 부담 최소', '국제 평판 하락', '인도적 논란'],
        modifiers: [mod('spending', 0.4, 6, '국경 통제')],
        immediate: { relations: { target: 'all', delta: -5 }, approval: 2 },
      },
    ],
  },
  {
    id: 'global_recession',
    title: '세계 경기 침체',
    description: '주요 교역국이 동시에 침체에 진입했습니다. 대외 수요가 급격히 줄어들고 있습니다.',
    category: 'international',
    probability: 0.04,
    conditions: { minTurn: 8 },
    duration: 6,
    cooldown: 24,
    effects: [
      mod('exports', -3.5, 6, '대외수요 급감'),
      mod('gdpGrowth', -1.1, 6, '세계 경기 침체'),
      mod('unemployment', 0.35, 6, '수출기업 감원'),
    ],
  },
];

const TECHNOLOGY_EVENTS: GameEventDefinition[] = [
  {
    id: 'ai_breakthrough',
    title: 'AI 산업 혁신',
    description:
      '국내 연구진이 산업용 AI 모델에서 의미 있는 성과를 냈습니다. 제조·물류 전반의 자동화가 빨라질 전망입니다.',
    category: 'technology',
    probability: 0.05,
    conditions: { minResearchBudget: 1.2 },
    duration: 12,
    cooldown: 20,
    effects: [
      mod('productivity', 0.22, 12, 'AI 도입 확산'),
      mod('competitiveness', 0.35, 12, '자동화 경쟁력'),
      mod('unemployment', 0.18, 8, '일자리 대체'),
    ],
  },
  {
    id: 'semiconductor_leap',
    title: '반도체 공정 기술 도약',
    description: '차세대 공정 양산에 성공하며 주력 수출품의 단가와 수율이 동시에 개선됐습니다.',
    category: 'technology',
    probability: 0.045,
    conditions: { minResearchBudget: 1.0 },
    duration: 10,
    cooldown: 18,
    effects: [
      mod('exports', 2.4, 10, '주력 수출 확대'),
      mod('competitiveness', 0.45, 10, '공정 우위'),
      mod('productivity', 0.14, 10, '설비 효율 개선'),
    ],
  },
  {
    id: 'energy_innovation',
    title: '차세대 에너지 기술 상용화',
    description:
      '고효율 저장장치 상용화가 눈앞에 왔습니다. 대규모 전환 투자를 할지 점진 도입할지 결정해야 합니다.',
    category: 'technology',
    probability: 0.04,
    conditions: { minTurn: 6 },
    duration: 16,
    cooldown: 28,
    effects: [],
    choices: [
      {
        id: 'aggressive',
        label: '국가 주도 대규모 전환 투자',
        description: '전력망과 저장설비를 한꺼번에 교체합니다.',
        outlook: ['에너지 의존도 대폭 완화', '대규모 재정 투입', '단기 재정적자'],
        modifiers: [
          mod('spending', 2.2, 12, '에너지 전환 투자'),
          mod('energyCost', -0.8, 20, '에너지 자립도 개선'),
          mod('productivity', 0.18, 20, '에너지 비용 절감'),
          mod('gdpGrowth', 0.35, 12, '전환 투자 수요'),
        ],
      },
      {
        id: 'gradual',
        label: '민간 주도 점진 도입',
        description: '세제 혜택만 제공하고 속도는 시장에 맡깁니다.',
        outlook: ['재정 부담 최소', '효과 지연', '기술 주도권 상실 위험'],
        modifiers: [
          mod('energyCost', -0.3, 20, '점진적 전환'),
          mod('revenue', -0.25, 12, '세제 혜택'),
        ],
      },
    ],
  },
  {
    id: 'cyber_attack',
    title: '국가 기반시설 사이버 공격',
    description:
      '전력망과 금융 결제 시스템이 동시에 공격받아 일시적으로 마비됐습니다. 배후는 확인되지 않았습니다.',
    category: 'technology',
    probability: 0.045,
    conditions: { minTurn: 4 },
    duration: 3,
    cooldown: 12,
    effects: [
      mod('gdpGrowth', -0.8, 3, '시스템 마비'),
      mod('spending', 0.6, 4, '보안 투자'),
      mod('stability', -4, 4, '사회 불안'),
      mod('militaryReadiness', -4, 3, '지휘통신 점검'),
    ],
  },
  {
    id: 'biotech_success',
    title: '신약 개발 성공',
    description: '국내 제약사가 글로벌 임상 3상을 통과했습니다. 기술수출 계약이 잇따르고 있습니다.',
    category: 'technology',
    probability: 0.04,
    conditions: { minResearchBudget: 0.9 },
    duration: 10,
    cooldown: 20,
    effects: [
      mod('exports', 1.4, 10, '기술수출'),
      mod('competitiveness', 0.25, 10, '바이오 경쟁력'),
      mod('approval', 2, 6, '국가적 성과'),
    ],
  },
];

export const EVENT_CATALOG: readonly GameEventDefinition[] = [
  ...ECONOMY_EVENTS,
  ...SOCIETY_EVENTS,
  ...DISASTER_EVENTS,
  ...INTERNATIONAL_EVENTS,
  ...TECHNOLOGY_EVENTS,
];

const EVENT_INDEX = new Map(EVENT_CATALOG.map((event) => [event.id, event]));

export function findEvent(id: string): GameEventDefinition | null {
  return EVENT_INDEX.get(id) ?? null;
}
