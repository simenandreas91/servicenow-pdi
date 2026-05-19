# Vaar Energi ServiceNow Portal Design Reference

Created: 2026-05-05  
Primary source: https://design.varenergi.no/91ba8068a/p/73a847-brand-standards

## Purpose

Use this file as a working reference when building Vår Energi ServiceNow portal pages, widgets, UI components, dashboards, and forms. The brand standards say they are mandatory for presentations, marketing material, Vaarin sites, dashboards, and similar work. If a platform cannot follow the guidelines exactly, make the result as similar as possible.

## Design Direction

- Clean, professional, energy-sector UI.
- Use Vår Energi blue as the main structural color.
- Use green and other support colors as purposeful accents, not as random decoration.
- Prefer clear hierarchy, strong readability, and restrained component styling.
- Avoid inventing a separate ServiceNow look that fights the brand.
- Use accessible contrast and keyboard-friendly interaction states.
- Treat the design efficient, calm, clear, and brand-aligned.

## Core Brand Colors

- Winter Main Blue / Brand Blue: `#004A92`  
  Use for primary navigation, key headers, primary buttons, selected states, and important brand areas.
- Winter Main Light Blue: `#70C7E0`  
  Use as a light supporting accent, subtle panels, hover surfaces, or data visualization.
- Spring Main Green / Dark Green: `#32652F`  
  Use for strong green accents, success/supportive states, or brand moments where green is needed.
- Spring Main Light Green: `#94C159`  
  Use for lighter accents, positive markers, badges, or highlight fills.
- Vaar Digital Dark Blue: `#0E0E26`  
  Use for dark surfaces, deep footer/header areas, or high-emphasis text areas.
- Vaar Digital Blue: `#0072BC`  
  Use as a digital blue alternative when a slightly brighter web blue is needed.
- Positive / Mid Green: `#0A9A79`  
  Use for success states, positive status, and confirmation.
- Negative / Red: `#B00037`  
  Use for errors, destructive states, and critical alerts.
- Alert / Yellow: `#F3D221`  
  Use for warnings and attention states.

## Support Colors

- Bright Blue: `#589CD5`
- Dark Blue support: `#0E204B`
- Bright Mint: `#3FB498`
- Soft Mint / Soft Green: `#C0E1D7`
- Bright Purple: `#96368B`
- Soft Purple: `#D9A2CA`
- Bright Pink: `#D3507E`
- Soft Pink: `#EAB5C1`
- Bright Orange: `#DB5A29`
- Soft Orange: `#F0C7BB`
- Bright Terracotta / Yellow support: `#F0B372`
- Soft Terracotta / Soft Yellow: `#F8EBD4`
- Soft Green support: `#CEDBAD`
- Soft Blue: `#C1DCF4`

## Neutral Colors

- White: `#FFFFFF`
- Black: `#000000`
- Dark Grey / Grey 1: `#706F6F`
- Mid Grey / Grey 2: `#D0D0D0`
- Light Grey / Grey 3: `#F0F0F0`

## Zeroheight Theme Tokens Observed

- Accent/background: `#004A92`
- Body text: `#222322`
- Link text: `#212121`
- Navigation active border: `#84C661`
- Tabs active border: `#004A92`
- Page intro text: `#212121`
- Callout background 1: `#F3EFEF`
- Callout background 2: `#005D92`
- Callout background 3: `#84C661`
- Callout background 4: `#CD163F`
- Footer background: `#000000`
- Footer text: `#FFFFFF`
- Footer links: `#84C661`

## Typography

Primary brand/UI font: Montserrat.  
Fallback/secondary font: Verdana.

The link page states that links should use Montserrat where available, otherwise Verdana. The Zeroheight theme itself uses Verdana for body, headings, sidebar, and navigation, but the component/page guidance uses Montserrat for primary UI styles. For ServiceNow portal work, prefer Montserrat when it can be loaded reliably; fall back to Verdana.

### Desktop Type Scale

- H1: Montserrat SemiBold, 42px, line-height 50px, weight 600
- H2: Montserrat SemiBold, 32px, line-height 38px, weight 600
- H3: Montserrat SemiBold, 27px, line-height 33px, weight 600
- H4: Montserrat SemiBold, 24px, line-height 33px, weight 600
- H5: Montserrat SemiBold, 21px, line-height 25px, weight 600
- H6: Montserrat SemiBold, 18px, line-height 26px, weight 600
- Paragraph: Montserrat Medium, 18px, line-height 29px, weight 500
- Button text: Montserrat Medium, 18px, line-height 20px, weight 500
- Button with arrow: Montserrat Medium, 27px, line-height 33px, weight 500

### Mobile Type Scale

- H1: Montserrat SemiBold, 33px, line-height 40px, weight 600
- H2: Montserrat SemiBold, 26px, line-height 31px, weight 600
- H3: Montserrat SemiBold, 23px, line-height 28px, weight 600
- H4: Montserrat SemiBold, 20.5px, line-height 24.5px, weight 600
- H5: Montserrat SemiBold, 18px, line-height 22px, weight 600
- H6: Montserrat SemiBold, 16px, line-height 26px, weight 600
- Paragraph: Montserrat Medium, 16px, line-height 26px, weight 500
- Button text: Montserrat Medium, 16px, line-height 100%, weight 500
- Button with arrow: Montserrat Medium, 23px, line-height 27px, weight 500

### Portal Typography Rules

- Use headings for hierarchy, not for decoration.
- Keep body text highly readable: generous line-height, no cramped paragraphs.
- Avoid negative letter spacing.
- Use Verdana fallback if Montserrat is unavailable in the ServiceNow environment.
- Keep portal forms and dashboards denser than marketing pages, but still use the same font system.

## Buttons And Controls

Observed component variants:

- Button Blue: default, hover, focused, pressed, dragged, disabled.
- Button Green: default, hover, focused, pressed, dragged, disabled.
- Button White: default, hover, focused, pressed, dragged, disabled.
- Button Pink: default, hover, focused, pressed, dragged, disabled.
- Button Grey: default, hover, focused, pressed, dragged, disabled.
- Button with arrow: blue, green, pink, grey variants with default and hover states.
- Button with icon: desktop icon button variant.
- Combo button: closed, open, hover/open.
- Toggle buttons: enabled, enabled small, disabled, disabled small.
- Radio buttons: enabled, hover, active.
- Button size references: large, medium, small.

### Recommended Portal Button Mapping

- Primary action: Brand Blue `#004A92` with white text.
- Primary hover: use a slightly darker blue or strong focus ring; preserve contrast.
- Secondary action: white background with Brand Blue border/text.
- Success/positive action: Mid Green `#0A9A79` or Spring Green `#32652F`, depending on contrast.
- Warning: Yellow `#F3D221` with dark text.
- Error/destructive: Red `#B00037` with white text when used as a filled button.
- Disabled: light grey surface (`#F0F0F0` or `#D0D0D0`) with subdued text.
- Focus state: must be visible and keyboard accessible; use a clear outline/ring, preferably brand blue or green with sufficient contrast.

## Links

- Links should use Montserrat if available, Verdana if not.
- Observed link states: default, hover, pressed, focused, dragged, disabled.
- There are separate link styles for colored backgrounds.
- For regular portal content, use dark neutral link text (`#212121`) with a clear hover/focus treatment.
- On blue or dark colored backgrounds, use a high-contrast link treatment, typically white or brand-approved contrast color.
- Do not rely on color alone; use underline or another visible affordance where the link may be confused with body text.

## Logo Guidance

- The Vaar Energi logo is the core element of the visual identity and must not be modified or combined with other elements except as described in the brand standards.
- Both horizontal and vertical logo versions exist; choose based on available space.
- Prefer the logo on white or lightly colored backgrounds.
- Use the negative logo version when placing the logo on colored/dark backgrounds.
- Maintain clear space around the logo; the guide describes the clear space as a minimum, and recommends increasing it where possible.
- Use digital master files only; do not recreate or trace the logo.
- The symbol should not be used below its minimum readable size.
- Source logo pack link observed on page: https://varenergi.no/wp-content/uploads/2025/04/Var_Energi_logopack_2025.zip

## Graphic Element: Seismic Wave

- The graphic element is called the seismic wave.
- It is inspired by seismic patterns and ocean waves.
- It is part of Vaar Energi's visual identity and may be used as a communication/brand element.
- It should always use brand colors.
- It should not be filled with color.
- Use only the approved seismic wave files; do not download similar waves from the web.
- Do not place text over the seismic wave; adjust text or wave placement instead.
- For portal work, use it sparingly as an accent or section motif, not as clutter behind operational content.
- Prefer SVG when scaling is needed.

## Iconography

- Icons are used to improve navigation and clarify products/services.
- Icons are part of the visual identity.
- Icons should be clear, relevant, and informative in context.
- Each icon has a specific purpose; do not use icons as generic decoration.
- Icons should fit inside a square.
- Minimum icon design size: 96px by 96px.
- Minimum margin around icons: 30px on all sides.
- Icons should use brand colors.
- Icons must not be filled with color.
- Use only approved icons; do not download random icons from the web.
- For ServiceNow portal widgets, use icons for navigation, category cards, status summaries, and help actions only when they clarify meaning.

## Accessibility

- Minimum target: WCAG 2.0 Level AA.
- Body text contrast must be at least 4.5:1.
- Large text contrast must be at least 3:1.
- Images must have alt text for screen readers.
- It must be possible to navigate with keyboard.
- Universal design should be treated as part of the full design and development process.
- This matters especially offshore/low-bandwidth/mobile contexts.

## ServiceNow Portal Implementation Notes

Define CSS variables once for the portal theme:

```css
--ve-blue: #004A92;
--ve-digital-blue: #0072BC;
--ve-dark-blue: #0E0E26;
--ve-light-blue: #70C7E0;
--ve-green: #32652F;
--ve-light-green: #94C159;
--ve-positive: #0A9A79;
--ve-negative: #B00037;
--ve-alert: #F3D221;
--ve-text: #222322;
--ve-link: #212121;
--ve-grey-1: #706F6F;
--ve-grey-2: #D0D0D0;
--ve-grey-3: #F0F0F0;
--ve-white: #FFFFFF;
--ve-black: #000000;
```

Suggested font stack:

```css
font-family: "Montserrat", Verdana, Arial, sans-serif;
```

Suggested portal body:

```css
color: #222322;
background: #FFFFFF;
font-size: 18px desktop / 16px mobile;
line-height: 29px desktop / 26px mobile;
```

Suggested primary button:

```css
background: #004A92;
color: #FFFFFF;
font-family: "Montserrat", Verdana, Arial, sans-serif;
font-weight: 500;
border: 2px solid #004A92;
```

Suggested secondary button:

```css
background: #FFFFFF;
color: #004A92;
border: 2px solid #004A92;
```

Suggested focus ring:

```css
outline: 3px solid #84C661;
outline-offset: 2px;
```

Suggested cards/panels:

- White or very light grey backgrounds, restrained borders (`#D0D0D0`), clear headings, and minimal decorative color.

Suggested dashboards:

- Use Brand Blue for structure, green for positive signals, red for negative, yellow for warnings. Avoid making charts overly colorful unless categories require it.

## Do Not

- Do not modify the logo.
- Do not place text over the seismic wave.
- Do not use unapproved icons or random wave graphics.
- Do not fill icons or seismic waves with arbitrary colors.
- Do not rely on color alone to communicate state.
- Do not use low-contrast text/button combinations.
- Do not make ServiceNow widgets look like generic Bootstrap if brand styling is available.

## Useful Brand Pages

- Brand Standards: https://design.varenergi.no/91ba8068a/p/73a847-brand-standards
- Colours: https://design.varenergi.no/91ba8068a/p/79a87f-colours
- Typography: https://design.varenergi.no/91ba8068a/p/80d2c8-typography
- Logo: https://design.varenergi.no/91ba8068a/p/57dbe8-logo
- Graphic element: https://design.varenergi.no/91ba8068a/p/1366c3-graphic-element
- Iconography: https://design.varenergi.no/91ba8068a/p/33e249-iconography
- Accessibility: https://design.varenergi.no/91ba8068a/p/623382-accessibility
- Buttons: https://design.varenergi.no/91ba8068a/p/0252d9-buttons
- Links: https://design.varenergi.no/91ba8068a/p/551077-links

## Vision & Validate Design Review

Reviewed: 2026-05-19  
Source document: `C:\Users\simen\Documents\Codex\ServiceNow\Design Document - Vision & Validate - Being Reviewed by Customer.docx`

Use this section when converting Vår Energi design decisions into ServiceNow Agile stories. The document is a high-level solution design across Platform Foundation, HRSD, ITSM, Office Management, Employee Center Pro, and Technical Governance. It contains 930 paragraphs, 4 tables, and 3 embedded images. Layout rendering was not available locally because LibreOffice/Poppler were not installed, so this review is based on structured DOCX extraction.

### Platform Foundation

- Scope covers ITSM, HRSD, Office Management, Suppliers Hub, Entra ID, SSO, RBAC, notification framework, Integration Hub, basic CMDB/CSDM, SuccessFactors, Compendia, and Cegal.
- Design principles: API-first integration, reusable Script Includes/subflows, separation of concerns, and configuration over customization.
- Identity model: Entra ID is the primary IdP and identity source; SAML SSO with Entra; batch sync every 40 minutes; group-to-role mapping; MFA for non-Entra users.
- Integration pattern: REST APIs through Integration Hub, async processing with queues/events, decoupled design, retry/error handling, and integration logging.
- Employee Center is positioned as the one front door across HR, IT, and Office Management with search-first and knowledge-first behavior.

### HRSD Story Inputs

- Enable HR Core/HRSD foundation, HR Criteria, HR Case/Task forms, pop-up view, case lifecycle management, HR Agent Workspace, Employee Center HR services, Manager Hub, HR services, COEs, notifications, reporting, and governance.
- For Vår Energi HR email notifications, use the `Vår Energi template` email template, which is linked to `Vår Energi Layout` and contains the Vår Energi logo/branding. In the DEV instance this is `sysevent_email_template` `1462e7ca918a3010f877b1d70a4d6a3d`, linked to `sys_email_layout` `9d3d6f8777823010f088a0e89e5a997f`. Use this template for newly created HR email notifications unless the story says otherwise. HR employee notification emails should be short alerts that send the user into ServiceNow/Employee Center through a mail-script-generated portal link; do not include agent comments/notes in the email body and do not create inbound email actions unless explicitly requested.
- HR Agent Workspace should keep OOTB fields where possible, but include Manager on the at-a-glance card and one Category field for General HR cases.
- General HR Inquiry should use the OOTB General Inquiry HR Service and record producer, expose it on Employee Center, route initially to HR Operations Tier 1, use standard notifications, and enable contextual search while users fill the description.
- General HR Inquiry categories: Payroll, Vacation and Leave, Benefits and Rewards, Pension & Insurance, Onboarding, Offboarding, HR Systems/Access, Learning and Development, Recruitment and Internal Mobility, Travel & Expenses, Other.
- Suggested HR assignment groups: Tier 1 - HR Operations, Tier 2 - HR Discipline Areas, HR - Workforce and organization, HR - Learning and development, HR - Reward, employee and industrial relations, HRIT - HR Tech Team, HR - Global Mobility.
- HR General Inquiry SLA: 5 business days response time.
- HR cases should automatically close 7 business days after a proposed solution if the employee does not respond. Send a proposed-solution notification first, a friendly reminder after 3 business days, then close with automatic close notes after 7 business days.
- Manager Hub should be enabled for hiring/workforce planning content. It should be role-based for managers, reduce irrelevant content/widgets, include work anniversaries and birthdays in team configuration, and expose Position Change.
- Position Change should be an HR Service and record producer exposed in Employee Center, with auto-assignment, standard notifications, and effective-date-driven crossboarding.
- Crossboarding journey should be triggered from Position Change effective end date and split into old-role offboarding, new-role preboarding, and new-role onboarding. Tasks for HR, IT, Facilities, managers, employees, and other stakeholders are to be defined during construct.
- Now Assist for HRSD should enable HR case summarization in HR Agent Workspace. Each summarization request consumes one assist transaction according to the design.
- SuccessFactors integration is inbound to ServiceNow for HR Profile creation/update. Preferred starting point is file-based ingestion with validation, transformation, mapping, scheduling, and monitoring. API-based integration can replace it later if successful. Unique key for HR Profile mapping is still open.
- If SuccessFactors sends an employee without an existing sys_user record, the design proposes creating the User before the HR Profile, but this conflicts with Entra as user master and needs a concrete governance decision.
- Compendia integration is inbound to ServiceNow for HR knowledge from the Employee Handbook using a standard API. Compendia remains the authoritative source for that content.
- HR knowledge strategy: ServiceNow is the HR knowledge front door, not necessarily the only repository. Separate internal HR knowledge and external employee/manager knowledge with role/user criteria.

### ITSM Story Inputs

- ITSM scope covers Incident, Major Incident, Problem, Major Problem, Change, Request, Knowledge, basic CMDB/CSDM, Suppliers Hub, AI/automation, Employee Center Pro, notifications, dashboards, and Cegal integration.
- Incidents should use OOTB Incident/Major Incident. Resolved incidents auto-close after 7 days if no activity is registered.
- End users report incidents through a "Something is not working" record producer in Employee Center Pro. It supports on-behalf-of, business service offering selection, free-text issue description, watch list, contextual search, and status/progress notifications.
- Incident routing should use Business Service, Business Service Offering, and/or Business Application to route to the correct assignment group and supplier. Help Desk acts as fallback when automation cannot classify.
- Problem and Change are backend-only and should not be exposed to end users. Problem and Change use OOTB models, service-based categorization/routing, and Vår Energi SLAs.
- Change Management should support Standard, Normal, and Emergency models; standard change templates; CAB and ECAB setup; schedules and meeting cadence; training for Change Manager, CAB, and ECAB participants.
- Request Management should use standard REQ/RITM, Employee Center catalog taxonomy, routing by Business Service/Offering, approval flows where needed, assignment/supplier routing, and Vår Energi SLAs. First release target is about 25 request forms.
- SOW should stay OOTB for ITSM. Office Management gets a role-based custom home page and optimized list views.
- Assignment groups should align to CSDM and follow `<Service Area> - <Business Service / Service Offering> - <Role or Team> - <Supplier if applicable>`.
- ITSM Success Dashboard plugin `sn_sd_itsm` is the initial reporting approach, refined later based on feedback.
- Suppliers Hub should be a custom integration application/layer between Vår Energi ServiceNow and supplier systems. Cegal is first supplier. It should send relevant ITSM tickets outbound, receive status/comments/resolution inbound, support inbound supplier records that affect Vår Energi services, normalize data, and use standardized APIs.
- Now Assist for ITSM should support portal/end-user summaries on demand and agent/fulfiller summaries for Incidents, Requests, Problems, and Changes. Each summarization request consumes one assist transaction.

### Office Management Story Inputs

- Office Management uses ITSM Request Management and Knowledge Management through Employee Center Pro, not a separate custom process.
- One REQ to one RITM is the recommended operating model for Office Management requests. Fulfillers work directly on RITMs.
- IDM forms to review and potentially migrate: Building Office request, Report a building/office issue, Building department access, Report issue with Building security, Request for Canteen Refreshments for Meeting or Conference Room, Request Visitor with approval flow.
- Submission channels: Employee self-service portal, Chat/Copilot/Now Assist, and Help Desk assisted support.
- Office Management knowledge bases: internal facility knowledge for teams/fulfillers/agents, and end-user knowledge for all employees. Include travel information, office information, facility information, FAQs, procedures, and common resolutions.
- SOW should be enhanced for Office Management with a custom role-based home page dashboard and list views for requests, requested items, and interactions scoped to relevant Office Management data.

### Employee Center Pro And Governance

- Employee Center Pro is the single unified entry point for services, inquiries, requests, journeys, and knowledge across HR, IT, and Office Management.
- Design principles: end-user centricity, visible services with clear guidance, knowledge-first experience, and role-based relevance.
- Suggested taxonomy: Join & Onboard; My tools, access & help; Pay, time & employment; Workplace, safety & facilities; IT for IT.
- Use topic sites for limited/reference content. Use microsites when content volume is higher, multiple roles need guided structure, or richer context is needed.
- Governance expectations: ARB/CAB decision forums, build/release guardrails, security/privacy controls, upgrade readiness, operational ownership, controlled DEV to TEST to PROD path, regression testing, rollback readiness, RBAC/ACL least privilege, audit/monitoring, naming standards, and upgrade execution gates.

### Open Decisions To Track In Stories

- Confirm exact HR Profile unique key for SuccessFactors mapping.
- Decide whether ServiceNow may create sys_user records from SuccessFactors when Entra is the stated identity source of truth.
- Confirm file-based versus API-based SuccessFactors integration path for first release.
- Confirm Now Assist licensing/activation, cost governance, and exact capabilities per role/channel.
- Confirm Cegal API capabilities, data contract, authentication, and which ITSM record types are in initial supplier integration scope.
- Confirm initial list of around 25 ITSM request forms and the Office Management IDM forms to migrate.
- Confirm customer-owned knowledge content readiness, ownership, approval workflow, and taxonomy.
- Confirm benchmark opt-in for HR Success Dashboard case deflection analytics.
