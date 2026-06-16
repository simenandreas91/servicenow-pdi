# Now Assist, AI Search, And AI Agents

Use this when work touches Now Assist, Now Assist for HRSD, AI Search Genius Results, Now Assist Skill Kit, AI agents, AI Agent Studio, agentic workflows, MCP tools, AI Control Tower, model providers, prompt/privacy controls, or HRSD generative AI skills.

Research baseline: ServiceNow Australia documentation reviewed 2026-05-22 from the public `ServiceNow/ServiceNowDocs` Australia branch. The repository is the preferred LLM research source for current AI Platform docs; search `markdown/intelligent-experiences`, `markdown/platform-administration/ai-search`, and the target product publication before broad web research. AI features change quickly; before implementing in a client instance, verify entitlements, installed plugin versions, data-center/regional restrictions, and the actual options shown in Now Assist Admin, AI Agent Studio, or AI Control Tower.

## Mental Model

- Now Assist Admin / Now Assist Center is the primary admin surface for installing Now Assist plugins, reviewing account/license details, configuring model providers, activating skills, and managing privacy/safety settings.
- Product Now Assist apps, such as Now Assist for HRSD, provide packaged skills, agents, and agentic workflows for a workflow/product area.
- Now Assist Skill Kit is for custom skills/prompts. Use it when the packaged skill does not meet the business requirement.
- Generative AI Controller / AI Control Tower govern model-provider availability, model versions, and policy controls. Skill-level choices depend on what the organization and region allow.
- Now Assist in AI Search adds LLM-generated or LLM-selected answer cards to search experiences through Genius Result configurations.
- AI Search remains the retrieval layer. Keep knowledge, catalog items, search sources, search profiles, and result improvement rules healthy before blaming Now Assist output.
- AI Agent Studio is the build/test surface for AI agents and agentic workflows. Treat a workflow as the orchestrated business outcome, an AI agent as a specialized reasoning role, and tools as the bounded actions or retrieval capabilities the agent can select.
- AI Control Tower is the governance/inventory surface when work expands to AI assets, approvals, risk/compliance, model providers, AI Gateway, evaluations, or MCP connections across the organization.

## Fast Decision Path

1. Inspect packaged Now Assist skills, product AI agents, search features, and existing workflow metadata before designing custom AI.
2. Use AI Search/Genius Results when the job is permissioned retrieval and answer presentation from indexed content.
3. Use a packaged Now Assist skill when ServiceNow already owns the product workflow and its prompt/output shape is acceptable.
4. Use Skill Kit for a custom generative skill with a prompt, retriever, tool, deployment surface, or Flow/UI invocation that does not need autonomous multi-step planning.
5. Use AI Agent Studio for agentic workflows that need orchestrated planning across specialized agents and tools. Do not use an AI agent to hide a deterministic Flow, approval, ACL, import, or integration that normal platform configuration handles better.
6. Route model-provider, data handling, readiness, Guardian, governance, AI asset inventory, AI Gateway, or third-party/MCP questions through the admin/governance surfaces before promising a build path.

## Roles To Check

- Now Assist Center/Admin: `sn_na_center.nac_admin`, `sn_nowassist_admin.nsa_admin`, and sometimes `admin`, depending on the page/product.
- HRSD packaged skills: `sn_hr_core.admin` for HRSD setup; end users/agents need the HR roles configured in the skill access/display setup.
- Journey generation for managers: `sn_jny.admin` and `sn_nowassist_admin.nsa_admin`.
- Now Assist Skill Kit authoring: `sn_skill_builder.admin`.
- Skill Kit custom model administration: `sn_skill_builder.sb_model_admin`.
- AI Agent Studio execution tests: `sn_aia_admin` plus access required by the tested AI agent and every downstream component ACL.
- AI Search / Genius Results: `ais_admin` for search profile work; `esc_admin` can use the Employee Center setup page for portal/mobile Now Assist Genius Results.
- Data privacy policies: `sn_generative_ai.data_steward`.

## Installation And Environment Checklist

1. Confirm license/product tier and regional availability. Some products, model providers, and skills are unavailable or constrained in certain regions, in-country SKUs, regulated markets, or restricted data centers.
2. Use Now Assist Center or Now Assist Admin to install required plugins. The center identifies required plugins from entitlements.
3. For HRSD, install/activate Now Assist for HRSD: `sn_hr_gen_ai`. Dependencies called out by docs include Human Resources Scoped App: Core (`com.sn_hr_core`), Now Assist Platform (`com.sn.now.platform`), and NA-TD/NA-TA dependent apps for NA-HR (`sn_egd_core`, `sn_int_schedule`).
4. For AI Search Genius Results, install/activate Now Assist in AI Search: `sn_ais_assist`. This may be installed automatically with some Now Assist feature plugins, but verify it directly.
5. If using Skill Kit/custom skills, update the Now Assist product plugins and Generative AI Controller together so custom skills remain compatible.
6. On domain-separated instances, install/update from the global domain and verify the installer user is in the global domain. Skills are generally global-domain records, but runtime data access should stay domain-aware.

## Now Assist Admin Setup Flow

1. Navigate to **Now Assist Center** or **Now Assist Admin**.
2. Install the required Now Assist plugins.
3. Review **Account** for license/entitlement details.
4. Review **Model providers**, **Model versions**, and **Manage integrations**. Provider options can be set at instance, skill group, and skill levels depending on AI Control Tower policy.
5. Configure safety/privacy controls:
   - Prompt injection attack protection.
   - Offensiveness detection/logging/blocking.
   - Sensitive topic filters, especially for Virtual Agent/HR.
   - Privacy policies / data de-identification.
   - Data sharing and data overflow processing.
   - Multilingual service if non-English user text must be supported.
6. Activate the Now Assist panel if skills should be available through conversational panel experiences or follow-up questions from search result cards.
7. Activate each packaged skill from **Now Assist Admin > Skills**. For each skill, review guided setup sections:
   - Trigger.
   - Input.
   - Availability.
   - Access.
   - Display.
8. Test with representative records, user roles, HR criteria/security, and UI surfaces before enabling broadly.

## Now Assist For HRSD

Core app/plugin: `sn_hr_gen_ai`.

Packaged skills documented for HRSD include:
- Chat reply recommendation.
- Chat summarization.
- Sidebar discussion summarization.
- Case summarization.
- Resolution notes generation.
- Knowledge article generation.
- Email recommendation.
- Sensitivity detection.
- Journey generation for managers.
- Journey summarization for managers.
- Employee information summarization.
- Manager insights.

Supported UI notes from docs:
- Agent Workspace for HR Case Management: case summarization, chat summarization, resolution notes generation, knowledge article generation, sensitivity detection, email reply recommendation.
- Core UI: case summarization, knowledge article generation, sensitivity detection.

Model-provider note:
- The HRSD configure page states Now LLM Service is currently the only provider for HRSD skills.
- The HRSD supporting-info page also lists Now LLM Service, Azure OpenAI, AWS Anthropic, and Google Gemini as supported models.
- Treat this as release/region/version-sensitive. In Vår Energi, inspect Now Assist Admin and AI Control Tower before committing to a model-provider design.

Common HRSD skill inputs/triggers:
- Chat summarization triggers can include VA-to-live-agent handoff, `/summarize` quick action, short description update, chat wrap-up, bulleted summary, and task creation.
- Case summarization reads HR Case (`sn_hr_core_case`) fields such as description, priority, short description, state, additional comments, and work notes. It is not available for Cancelled or Suspended cases.
- Resolution notes generation reads HR Case (`sn_hr_core_case`) short description, description, state, additional comments, and work notes.
- Case sentiment analysis reads Case (`case`) fields such as short description, description, priority, state, creation date, and activities, and outputs sentiment value/trend/reasoning.
- Knowledge article generation reads HR Case (`sn_hr_core_case`) inputs such as short description and description.

Journey generation for managers:
- Requires `sn_jny.admin` and `sn_nowassist_admin.nsa_admin`.
- Navigate to **Now Assist Admin > Skills > Employee > HRSD**.
- Activate **Journey Generation for Managers**.
- Guided setup starts with trigger selection; use toggles to define which actions trigger journey generation.
- Display can be in-product, Now Assist panel, or both. If panel is unavailable, activate the Now Assist panel first.

Implementation caution for HRSD:
- Employee relations, sensitive cases, and HR profile data are high-risk. Configure availability/access narrowly and validate with real HR roles, HR criteria, COE security, domain separation, and data privacy policies.
- Never assume a generated summary is a system of record. Treat generated text as assistive output and preserve normal HR case audit/work notes practices.

## Now Assist Skill Kit

Use Skill Kit for custom generative AI skills when OOTB Now Assist skills are insufficient.

Authoring flow:
1. Confirm Now Assist plugins and Generative AI Controller are current.
2. Assign `sn_skill_builder.admin` to the AI developer.
3. Navigate to **Now Assist Skill Kit > Home**.
4. Create a skill or clone a ServiceNow skill.
5. Configure prompt(s), model, temperature, request/response token limits, and tools/retrievers/web search as needed.
6. Configure deployment settings:
   - Workflow, Product, Feature.
   - Deployment locations: Now Assist panel, UI Action, Flow action, Now Assist context menu, Virtual assistants, UI Builder.
7. Configure security controls:
   - ACL: any authenticated user or selected roles.
   - Role restrictions for execution.
8. Test prompt output, evaluate against realistic records, finalize, publish.
9. Activate the published skill in Now Assist Admin.

Notes:
- Deployment settings for cloned ServiceNow skills are locked; create a skill from scratch when custom deployment metadata is required.
- Selecting a deployment location in Skill Kit only makes it available for admin activation. It does not automatically activate the skill.
- UI Action deployment creates an inactive UI Action by default.
- Flow deployment exposes the skill through the **Execute Skill** action in Workflow Studio.

## AI Agents And Agentic Workflows

Use AI Agent Studio only after the decision path points to autonomous multi-step reasoning. Keep normal ServiceNow records, ACLs, Flows, integrations, and update sets visible; an agentic wrapper does not replace platform engineering.

Build path:
1. Define the business outcome, tasks the workflow must handle, records/content it may use, execution surface, fallback behavior, and human oversight point.
2. Inspect ready-made AI agents, agentic workflows, and product AI features before creating custom agents.
3. Design narrow agents and tools:
   - write agent instructions as a step-by-step operational algorithm
   - give each tool one purpose rather than mode switches or unrelated actions
   - make tool descriptions say what the tool does, when to call it, when not to call it, and what domain terms mean
   - return useful error messages so the agent can recover or choose another path
4. Choose interactive execution when the agent may ask a user for missing context. Choose non-interactive/background execution only when fallback behavior and final user-visible output are defined without relying on a chat prompt.
5. Configure Guardian/privacy/model-provider controls before broad exposure, especially for HR, security, employment, legal, finance, and infrastructure decisions.
6. Test execution and access before rollout:
   - AI Agent Studio manual test for a known record/task, selected version, decision log, and tool executions
   - AI Agent Studio **Test access** plus non-admin runtime roles for agent and downstream-tool ACLs
   - dataset-based agentic evaluations when repeated executions, quality trends, or deployment evidence matter
7. Use Activity/execution plans, messages, tool executions, analytics, and evaluation results to debug behavior. Fix content, records, tool definitions, ACLs, and deterministic platform logic before stretching prompts.

MCP caution:
- Adding an MCP server in AI Agent Studio can use OAuth 2.1, API key, or an existing Connection and Credential Alias path. Authenticate users with the MCP server before exposing its tools to an AI agent.
- Treat MCP tools like integrations: validate authentication, least privilege, tool descriptions, input/output contract, error behavior, auditability, and data egress before enabling autonomous use.

## Now Assist In AI Search / Genius Results

Now Assist in AI Search (`sn_ais_assist`) combines AI Search retrieval with LLM generated/selected answer cards. It can appear in Service Portal, Virtual Agent, Employee Center, global search, and workspace search depending on search-profile configuration.

Genius Result types:
- **Now Assist Multi-Content Response Genius Results**: newer/recommended Platform workflow skill. Synthesizes answers from multiple sources and supports citations and follow-up questions.
- **Now Assist Q&A Genius Results**: legacy/maintenance-mode path that generates answers from knowledge article results using Now LLM Service.
- **External Content Q&A Genius Results**: answers from external content, for example SharePoint Online documents.
- **Now Assist Actions Genius Results**: legacy/maintenance-mode path that selects and displays relevant Catalog Items and Virtual Agent topics.

Multi-Content Response details:
- Can synthesize from knowledge articles, catalog items, Knowledge Graph schema node records, enhanced chat/Virtual Agent results, and external content documents/attachments.
- Answer cards include citations.
- In portal, workspace, and enhanced Virtual Agent experiences, answer cards can show **Ask a follow-up** and open the Now Assist panel.
- For global/workspace search, activating Multi-Content Response on a search profile overrides other Genius Result configurations for that profile.
- Topic citations in global/workspace search need the Now Assist panel active and a search source derived from the Skill/topics indexed source linked to the search profile.
- By default, docs state Multi-Content Response uses Azure OpenAI with Now LLM Service fallback; admins can select a different provider in Now Assist Admin where available.

Legacy Q&A/Actions details:
- Q&A sends eligible knowledge article results to Now LLM Service and displays source-linked answer cards.
- Actions sends selected Catalog Item and Virtual Agent topic content to Now LLM Service for ranking/filtering. Service Portal supports Catalog Items; Virtual Agent supports Catalog Items and VA topics.
- Both Q&A and Actions are in maintenance mode from Now Assist in AI Search 11; use Multi-Content Response when the release and search experience support it.

Enablement paths:
- Portal/mobile quick setup: **Self-Service > AI Search > Now Assist in AI Search Setup**, then select Now Assist Genius Results checkboxes for applications/search profiles. Documented profiles include Employee Center, Service Portal, Employee Center Pro Kiosk, and Now Mobile.
- Search-profile setup: AI Search Admin / Search Profiles. Link Genius Result configurations to the relevant search profile, verify search sources, publish the profile, and test in the target portal/workspace/global search.

Configuration checks:
- Search profiles must include the right search sources, synonyms/stop words/typo handling, Genius Result configs, and result improvement rules.
- For HRSD/Employee Center, validate both knowledge and catalog content quality. Genius Results are only as good as indexed, permissioned content.
- English is native. Additional languages generally require Dynamic Translation or multilingual setup depending on the feature.
- In domain-separated environments, users should only receive answers from data in their domain; verify with non-admin users.

## Verification Plan For Vår Energi

1. Confirm target instance/release/patch and Now Assist entitlements.
2. In Now Assist Center/Admin, record installed plugins and available product cards.
3. Verify HRSD plugin `sn_hr_gen_ai`, AI Search plugin `sn_ais_assist`, Now Assist Platform, and any required Skill Kit / Controller plugins.
4. Review Account, model providers, model versions, and region/provider availability.
5. Review Guardian/privacy settings before enabling skills with HR data.
6. Activate one low-risk skill first, preferably case summarization or a search Genius Result in a limited profile.
7. Test with:
   - Admin.
   - HR case writer/agent.
   - Manager/employee role where relevant.
   - Sensitive/employee-relations cases where availability should be restricted.
   - Domain-separated or HR criteria constrained data if used.
8. For Genius Results, test exact, broad, ambiguous, no-result, restricted-content, and non-English queries.
9. For AI agents, test one known record/task manually, one access-denied or restricted-role path, the selected workflow/agent version, tool execution/error behavior, and automated evaluations when result quality must be compared across cases.
10. Capture final configuration records, roles, plugin versions, search profiles, workflow/agent versions, model/provider assumptions, and rollback/deactivation steps.

## Vår Energi AI Search Assist Lessons

- For General Inquiry AI Search Assist in Vår Energi DEV, `aisa_rp_config.search_app` overrides the older `cxs_rp_config` contextual-search behavior in Employee Center. On 2026-06-16, OOTB `ESC AISA Long text to query Search Application` used profile `[AI Search Assist - Long Text to Query] - KB and Catalog`, whose sources were HR General Knowledge plus generic Service Portal Catalog. If non-HR catalog items appear in the record producer suggestions, use or create a search application/profile that maps only to the HR knowledge source. Match the ServiceNow search-application pattern by adding one `sys_search_filter` Source Facet Bucket per mapped source; for HR-only General Inquiry that means a single `Knowledge` bucket for `[AISA - Long Text to Query] - knowledge`. After creating a new `ais_search_profile`, publish it before portal testing; `state=new` profiles can look fully configured but will not drive the AI Search Assist runtime. Expect ServiceNow to auto-capture companion suggestion reader groups in the same Global update set.

## Official Sources

- ServiceNowDocs repository and release map: https://github.com/ServiceNow/ServiceNowDocs and `llms.txt`
- ServiceNowDocs AI publication: `markdown/intelligent-experiences/index.md`
- Configure AI agents: `markdown/intelligent-experiences/configuring-ai-agents.md`
- AI Agent Studio: `markdown/intelligent-experiences/ai-agent-studio.md`
- Manual AI agent execution test: `markdown/intelligent-experiences/test-ai-agent.md`
- Agentic evaluations: `markdown/intelligent-experiences/agentic-evals.md`
- Add MCP server in AI Agent Studio: `markdown/intelligent-experiences/add-mcp-client-on-ai-agent-studio.md`
- AI Control Tower: `markdown/intelligent-experiences/ai-control-tower/ai-control-tower-landing.md`
- Configure Now Assist settings in Now Assist Center: https://www.servicenow.com/docs/r/intelligent-experiences/now-assist-center-configure-admin-settings.html
- Install and configure Now Assist plugins: https://www.servicenow.com/docs/r/intelligent-experiences/install-configure-essential-now-assist-plugins.html
- Configure Now Assist for HRSD: https://www.servicenow.com/docs/r/employee-service-management/now-assist-for-hrsd/configure-now-assist-hr.html
- Supporting information for Now Assist for HRSD: https://www.servicenow.com/docs/r/employee-service-management/now-assist-for-hrsd/support-info-hr-assist.html
- Skill inputs and triggers for Now Assist for HRSD: https://www.servicenow.com/docs/r/employee-service-management/now-assist-for-hrsd/now-assist-hrsd-skill-inputs.html
- Enable the Now Assist Journey generation skill: https://www.servicenow.com/docs/r/employee-service-management/journey-designer/enable-jny-gen.html
- Now Assist in AI Search: https://www.servicenow.com/docs/r/platform-administration/ai-search/now-assist-ais.html
- Now Assist Multi-Content Response Genius Results: https://www.servicenow.com/docs/r/platform-administration/ai-search/now-assist-multi-content-qna-genius-results.html
- Now Assist Actions Genius Results: https://www.servicenow.com/docs/r/platform-administration/ai-search/now-assist-catalog-ordering-gr.html
- Enable Now Assist genius results: https://www.servicenow.com/docs/r/employee-service-management/employee-experience-foundation/na-qa-activate.html
- Create a skill: https://www.servicenow.com/docs/r/intelligent-experiences/now-assist-skill-kit/create-new-skill.html
- Configure Now Assist Skill Kit: https://www.servicenow.com/docs/r/intelligent-experiences/now-assist-skill-kit/configuring-now-assist-skill-kit.html
- Configure skill deployment settings: https://www.servicenow.com/docs/r/intelligent-experiences/now-assist-skill-kit/configure-skill-settings.html
- Configure security controls for a skill: https://www.servicenow.com/docs/r/intelligent-experiences/now-assist-skill-kit/nask-access-control.html
- Manage AI models: https://www.servicenow.com/docs/r/intelligent-experiences/manage-large-language-models.html
- Configure Now Assist privacy policies: https://www.servicenow.com/docs/r/intelligent-experiences/configure-privacy-policies.html
