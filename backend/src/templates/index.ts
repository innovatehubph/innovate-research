// Research Templates for Innovate Research

export interface ResearchTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  sections: TemplateSection[];
  searchQueries: string[];
  analysisPrompt: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  description: string;
  required: boolean;
}

export const templates: ResearchTemplate[] = [
  {
    id: 'company-profile',
    name: 'Company Profile',
    description: 'Comprehensive analysis of a company including history, products, leadership, and market position',
    icon: 'building',
    plan: 'FREE',
    sections: [
      { id: 'overview', title: 'Company Overview', description: 'Basic company information', required: true },
      { id: 'products', title: 'Products & Services', description: 'What the company offers', required: true },
      { id: 'leadership', title: 'Leadership Team', description: 'Key executives and founders', required: false },
      { id: 'financials', title: 'Financial Information', description: 'Revenue, funding, valuation', required: false },
      { id: 'market', title: 'Market Position', description: 'Competitors and market share', required: true },
    ],
    searchQueries: [
      '{query} company overview',
      '{query} products services',
      '{query} CEO founder leadership team',
      '{query} revenue funding valuation',
      '{query} competitors market share',
      '{query} news press release',
    ],
    analysisPrompt: `Analyze this company and create a comprehensive profile including:
1. Company overview (what they do, when founded, where based)
2. Products and services offered
3. Leadership team and key people
4. Financial information (if available)
5. Market position and competitive landscape
6. Recent news and developments
7. Strengths and weaknesses

Format as a structured report with clear sections.`,
  },
  {
    id: 'competitor-analysis',
    name: 'Competitor Analysis',
    description: 'Deep dive comparison between companies in the same market',
    icon: 'swords',
    plan: 'STARTER',
    sections: [
      { id: 'overview', title: 'Market Overview', description: 'Industry landscape', required: true },
      { id: 'competitors', title: 'Key Competitors', description: 'Main players in the market', required: true },
      { id: 'comparison', title: 'Feature Comparison', description: 'Side-by-side analysis', required: true },
      { id: 'pricing', title: 'Pricing Analysis', description: 'Price comparison', required: true },
      { id: 'swot', title: 'SWOT Analysis', description: 'Strengths, weaknesses, opportunities, threats', required: true },
    ],
    searchQueries: [
      '{query} competitors comparison',
      '{query} vs alternatives',
      '{query} market share industry',
      '{query} pricing plans',
      '{query} reviews comparison',
      '{query} strengths weaknesses',
    ],
    analysisPrompt: `Perform a comprehensive competitor analysis:
1. Identify the market/industry
2. List main competitors with brief descriptions
3. Create feature comparison table
4. Compare pricing and plans
5. Perform SWOT analysis for each competitor
6. Identify market trends and opportunities
7. Recommend competitive strategies

Provide actionable insights and clear comparisons.`,
  },
  {
    id: 'market-research',
    name: 'Market Research',
    description: 'Industry analysis including size, trends, and opportunities',
    icon: 'trending-up',
    plan: 'STARTER',
    sections: [
      { id: 'overview', title: 'Market Overview', description: 'Market definition and scope', required: true },
      { id: 'size', title: 'Market Size', description: 'TAM, SAM, SOM', required: true },
      { id: 'trends', title: 'Market Trends', description: 'Current and emerging trends', required: true },
      { id: 'drivers', title: 'Growth Drivers', description: 'Factors driving market growth', required: true },
      { id: 'challenges', title: 'Challenges & Barriers', description: 'Market challenges', required: true },
      { id: 'opportunities', title: 'Opportunities', description: 'Untapped opportunities', required: true },
    ],
    searchQueries: [
      '{query} market size TAM SAM',
      '{query} industry trends 2024 2025',
      '{query} market growth forecast',
      '{query} industry challenges barriers',
      '{query} market opportunities',
      '{query} industry report statistics',
    ],
    analysisPrompt: `Conduct thorough market research:
1. Define the market and its scope
2. Estimate market size (TAM, SAM, SOM if possible)
3. Identify current trends and emerging patterns
4. Analyze growth drivers and inhibitors
5. Highlight challenges and barriers to entry
6. Identify opportunities for new entrants
7. Provide market outlook and forecasts

Include statistics and data where available.`,
  },
  {
    id: 'person-profile',
    name: 'Person/Executive Profile',
    description: 'Research on individuals including background, career, and influence',
    icon: 'user',
    plan: 'PRO',
    sections: [
      { id: 'bio', title: 'Biography', description: 'Personal and professional background', required: true },
      { id: 'career', title: 'Career History', description: 'Professional journey', required: true },
      { id: 'achievements', title: 'Key Achievements', description: 'Notable accomplishments', required: true },
      { id: 'network', title: 'Professional Network', description: 'Connections and affiliations', required: false },
      { id: 'media', title: 'Media Presence', description: 'Interviews, articles, speeches', required: false },
    ],
    searchQueries: [
      '{query} biography background',
      '{query} career history experience',
      '{query} achievements awards',
      '{query} interview speech',
      '{query} linkedin profile',
      '{query} net worth investments',
    ],
    analysisPrompt: `Create a comprehensive profile of this person:
1. Biographical information (education, background)
2. Career history and progression
3. Key achievements and milestones
4. Professional philosophy and style
5. Public statements and media appearances
6. Professional network and affiliations
7. Impact and influence in their field

Focus on verified, factual information.`,
  },
  {
    id: 'product-analysis',
    name: 'Product Analysis',
    description: 'Deep analysis of a product including features, pricing, and reviews',
    icon: 'package',
    plan: 'STARTER',
    sections: [
      { id: 'overview', title: 'Product Overview', description: 'What the product is', required: true },
      { id: 'features', title: 'Features', description: 'Key features and capabilities', required: true },
      { id: 'pricing', title: 'Pricing', description: 'Pricing plans and tiers', required: true },
      { id: 'reviews', title: 'User Reviews', description: 'Customer feedback', required: true },
      { id: 'alternatives', title: 'Alternatives', description: 'Similar products', required: true },
    ],
    searchQueries: [
      '{query} features capabilities',
      '{query} pricing plans cost',
      '{query} reviews ratings',
      '{query} pros cons',
      '{query} alternatives vs',
      '{query} tutorial how to use',
    ],
    analysisPrompt: `Analyze this product comprehensively:
1. Product overview and purpose
2. Key features and capabilities
3. Pricing structure and plans
4. User reviews and ratings (summarize sentiment)
5. Pros and cons
6. Alternative products comparison
7. Use cases and ideal customers
8. Recommendations

Be objective and include both positives and negatives.`,
  },
  {
    id: 'industry-overview',
    name: 'Industry Overview',
    description: 'Comprehensive overview of an entire industry',
    icon: 'factory',
    plan: 'PRO',
    sections: [
      { id: 'definition', title: 'Industry Definition', description: 'What the industry encompasses', required: true },
      { id: 'landscape', title: 'Competitive Landscape', description: 'Key players', required: true },
      { id: 'trends', title: 'Industry Trends', description: 'Current and future trends', required: true },
      { id: 'regulations', title: 'Regulations', description: 'Legal and regulatory environment', required: false },
      { id: 'technology', title: 'Technology', description: 'Tech driving the industry', required: true },
      { id: 'outlook', title: 'Future Outlook', description: 'Predictions and forecasts', required: true },
    ],
    searchQueries: [
      '{query} industry overview definition',
      '{query} top companies market leaders',
      '{query} industry trends 2024 2025',
      '{query} regulations compliance',
      '{query} technology innovation',
      '{query} industry forecast prediction',
    ],
    analysisPrompt: `Create a comprehensive industry overview:
1. Define the industry and its segments
2. Map the competitive landscape (leaders, challengers, niche players)
3. Identify major trends shaping the industry
4. Cover regulatory environment and compliance requirements
5. Highlight technological innovations
6. Provide future outlook and predictions
7. Discuss risks and opportunities

Include relevant statistics and data points.`,
  },
  {
    id: 'swot-analysis',
    name: 'SWOT Analysis',
    description: 'Strengths, Weaknesses, Opportunities, Threats analysis',
    icon: 'grid-2x2',
    plan: 'FREE',
    sections: [
      { id: 'strengths', title: 'Strengths', description: 'Internal advantages', required: true },
      { id: 'weaknesses', title: 'Weaknesses', description: 'Internal disadvantages', required: true },
      { id: 'opportunities', title: 'Opportunities', description: 'External opportunities', required: true },
      { id: 'threats', title: 'Threats', description: 'External threats', required: true },
      { id: 'strategy', title: 'Strategic Recommendations', description: 'Actionable strategies', required: true },
    ],
    searchQueries: [
      '{query} strengths advantages',
      '{query} weaknesses challenges problems',
      '{query} opportunities growth',
      '{query} threats risks competition',
      '{query} strategy recommendations',
    ],
    analysisPrompt: `Perform a detailed SWOT analysis:

STRENGTHS (Internal Positive):
- What does the subject do well?
- What unique resources/capabilities?
- What competitive advantages?

WEAKNESSES (Internal Negative):
- What could be improved?
- What resources are lacking?
- What do competitors do better?

OPPORTUNITIES (External Positive):
- What market trends could be leveraged?
- What unmet needs exist?
- What external changes present opportunities?

THREATS (External Negative):
- What obstacles exist?
- What are competitors doing?
- What external factors could cause problems?

End with strategic recommendations based on the SWOT.`,
  },
  {
    id: 'due-diligence',
    name: 'Due Diligence Report',
    description: 'Investment-grade research for business evaluation',
    icon: 'file-check',
    plan: 'ENTERPRISE',
    sections: [
      { id: 'company', title: 'Company Profile', description: 'Basic company information', required: true },
      { id: 'financials', title: 'Financial Analysis', description: 'Revenue, profitability, funding', required: true },
      { id: 'legal', title: 'Legal & Compliance', description: 'Legal structure, lawsuits, compliance', required: true },
      { id: 'market', title: 'Market Analysis', description: 'Market position and competition', required: true },
      { id: 'team', title: 'Team Assessment', description: 'Leadership and key personnel', required: true },
      { id: 'risks', title: 'Risk Assessment', description: 'Identified risks', required: true },
      { id: 'recommendation', title: 'Investment Recommendation', description: 'Final assessment', required: true },
    ],
    searchQueries: [
      '{query} company overview background',
      '{query} revenue funding valuation financials',
      '{query} lawsuits legal issues compliance',
      '{query} market share competitors',
      '{query} CEO founder team linkedin',
      '{query} risks challenges concerns',
      '{query} reviews reputation',
      '{query} news press recent',
    ],
    analysisPrompt: `Conduct comprehensive due diligence research:

1. COMPANY PROFILE
   - Legal name, incorporation, headquarters
   - Business model and revenue streams
   - History and milestones

2. FINANCIAL ANALYSIS
   - Revenue and growth
   - Funding history and investors
   - Valuation (if available)
   - Burn rate and runway (startups)

3. LEGAL & COMPLIANCE
   - Corporate structure
   - Pending litigation
   - Regulatory compliance
   - Intellectual property

4. MARKET ANALYSIS
   - Market size and growth
   - Competitive position
   - Differentiators

5. TEAM ASSESSMENT
   - Leadership backgrounds
   - Key hires and departures
   - Culture and reputation

6. RISK ASSESSMENT
   - Business risks
   - Market risks
   - Operational risks
   - Regulatory risks

7. RECOMMENDATION
   - Summary of findings
   - Key concerns
   - Investment recommendation

This is for informational purposes only. Not financial advice.`,
  },
];

export function getTemplate(id: string): ResearchTemplate | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplatesForPlan(plan: string): ResearchTemplate[] {
  const planOrder = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
  const userPlanIndex = planOrder.indexOf(plan);
  
  return templates.filter(t => {
    const templatePlanIndex = planOrder.indexOf(t.plan);
    return templatePlanIndex <= userPlanIndex;
  });
}

export default templates;
