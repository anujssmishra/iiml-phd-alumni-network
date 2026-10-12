export interface CatalogueConference {
  id: string;
  name: string;
  acronym: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  cfpDeadline: Date | null;
  location: string;
  description: string;
  url: string;
}

export const CATALOGUE_CONFERENCES: CatalogueConference[] = [
  // --- Indian Premier Management Conferences ---
  {
    id: "pan-iim-2026",
    name: "11th PAN IIM World Management Conference (WMC 2026)",
    acronym: "PAN-IIM 2026",
    startDate: new Date("2026-11-27T00:00:00.000Z"),
    endDate: new Date("2026-11-29T00:00:00.000Z"),
    timezone: "Asia/Kolkata",
    cfpDeadline: new Date("2026-08-31T23:59:00.000Z"),
    location: "IIM Shillong, Meghalaya, India",
    description: `### Conference Theme
Driving Sustainability and Inclusive Growth for Nation Building. The PAN IIM World Management Conference is the premier annual gathering established by the Ministry of Education and rotationally hosted by the Indian Institutes of Management.

### Research Tracks & Focus Areas
- Strategic Management, ESG, and Corporate Governance in Emerging Economies
- Information Systems, Digital Public Infrastructure, and AI Governance
- Operations, Logistics, and Resilient Global Supply Chains
- Financial Inclusivity, FinTech, and Capital Markets in Developing Nations
- Behavioral Marketing, Consumer Welfare, and Rural Markets
- Organizational Behaviour, Human Capital, and Future of Work in South Asia

### Doctoral Consortium & Pre-Conference Workshops
A full-day dedicated Doctoral Consortium on November 26, 2026, offering FPM/PhD scholars one-on-one thesis mentoring with senior IIM Directors and international faculty. Includes workshops on publishing in FT50 journals and navigating academic job markets.

### Venue & Travel Logistics
Hosted at the picturesque state-of-the-art permanent campus of IIM Shillong in Umsawli, Meghalaya. Direct shared shuttles organized from Guwahati Airport (GAU) and Railway Station (approx. 3 hours scenic mountain drive). On-campus scholar accommodations and discounted hotel blocks in Shillong city.`,
    url: "https://iimshillong.ac.in",
  },
  {
    id: "ifc-2026",
    name: "India Finance Conference (IFC 2026)",
    acronym: "IFC 2026",
    startDate: new Date("2026-12-21T00:00:00.000Z"),
    endDate: new Date("2026-12-23T00:00:00.000Z"),
    timezone: "Asia/Kolkata",
    cfpDeadline: new Date("2026-09-15T23:59:00.000Z"),
    location: "IIM Bangalore, Bengaluru, India",
    description: `### Conference Theme
The flagship academic finance conference in South Asia, jointly founded and organized by the Indian Finance Association (IFA) alongside the Indian Institutes of Management Ahmedabad, Bangalore, and Calcutta.

### Research Tracks & Focus Areas
- Asset Pricing, Factor Models, and Market Microstructure
- Corporate Finance, M&A, and Venture Capital in Emerging Markets
- Banking Stability, Systemic Risk, and Macroprudential Regulation
- FinTech, Algorithmic Trading, and Decentralized Finance
- Sustainable Finance, Green Bonds, and Climate Risk Accounting
- Behavioral Finance and Household Financial Decision Making

### Doctoral Consortium & Tutorials
Pre-conference tutorial sessions on December 20, 2026, featuring empirical methods in finance, high-frequency limit order book analytics, and difference-in-differences econometrics with leading global finance editors.

### Venue & Travel Logistics
Held at the iconic red-brick campus of IIM Bangalore on Bannerghatta Road, Bengaluru. Easy cab transit from Kempegowda International Airport (BLR) via airport express tollway.`,
    url: "https://indiafa.org/",
  },
  {
    id: "indam-2027",
    name: "12th Indian Academy of Management Conference (INDAM 2027)",
    acronym: "INDAM 2027",
    startDate: new Date("2027-01-06T00:00:00.000Z"),
    endDate: new Date("2027-01-09T00:00:00.000Z"),
    timezone: "Asia/Kolkata",
    cfpDeadline: new Date("2026-09-30T23:59:00.000Z"),
    location: "IIM Sambalpur, Odisha, India",
    description: `### Conference Theme
Reimagining Management in the Era of Disruption. INDAM is the official regional affiliate of the Academy of Management (AOM), serving as the intellectual bridge between South Asian business scholars and global management scholarship.

### Research Tracks & Focus Areas
- Business Policy and Strategy: Dynamic capabilities and emerging market multinationals
- Organizational Behaviour and Human Resource Management
- Gender, Diversity, and Informal Economy Organizations
- Indigenous Management Theories and South Asian Organizational Realities
- Entrepreneurship and MSME Ecosystems in Non-Metro Geographies

### Doctoral Consortium & Pre-Conference Workshops
Pre-conference methodology workshops on January 6, 2027, covering Qualitative Comparative Analysis (fsQCA), structural equation modeling (SEM), and grounded theory methods.

### Venue & Travel Logistics
Hosted at the newly inaugurated green campus of IIM Sambalpur in Basantpur, Odisha. Accessible via Jharsuguda Airport (JRG) with direct connections from Delhi, Kolkata, and Bangalore, or via Raipur/Bhubaneswar.`,
    url: "https://iimsambalpur.ac.in/indam/",
  },
  {
    id: "apac-acr-2027",
    name: "Asia-Pacific Association for Consumer Research Conference (APAC ACR 2027)",
    acronym: "APAC-ACR 2027",
    startDate: new Date("2027-01-07T00:00:00.000Z"),
    endDate: new Date("2027-01-10T00:00:00.000Z"),
    timezone: "Asia/Kolkata",
    cfpDeadline: new Date("2026-08-31T23:59:00.000Z"),
    location: "SPJIMR, Mumbai, India",
    description: `### Conference Theme
Consumer Research for Societal Impact. Bringing the global community of the Association for Consumer Research (ACR) to India to examine behavioral insights, cultural nuances, and sustainable consumer choices.

### Research Tracks & Focus Areas
- Consumer Behavior, Identity, and Culture in Emerging Asian Markets
- Behavioral Decision Theory, Heuristics, and Financial Decision Making
- Ethical Consumption, Circular Economies, and Pro-Social Behaviors
- AI, Virtual Influencers, and the Psychology of Human-Computer Interaction
- Transformative Consumer Research (TCR) addressing poverty, health, and well-being

### Doctoral Consortium & Mentoring
Intensive half-day Doctoral Symposium on January 7, 2027, pairing early-career scholars with associate editors from the Journal of Consumer Research (JCR) and Journal of Marketing Research (JMR).

### Venue & Travel Logistics
Hosted at the SPJIMR campus in Andheri West, Mumbai. Located 20 minutes from Chhatrapati Shivaji Maharaj International Airport (BOM), close to the Western Express Highway and Mumbai Metro.`,
    url: "https://spjimr.org",
  },

  // --- Operations, Analytics & Supply Chain ---
  {
    id: "dsi-2026",
    name: "57th Decision Sciences Institute Annual Conference (DSI 2026)",
    acronym: "DSI 2026",
    startDate: new Date("2026-11-21T00:00:00.000Z"),
    endDate: new Date("2026-11-23T00:00:00.000Z"),
    timezone: "America/Los_Angeles",
    cfpDeadline: new Date("2026-06-15T23:59:00.000Z"),
    location: "San Francisco, California, USA",
    description: `### Conference Theme
A premier multidisciplinary international conference connecting research across operations management, procurement, business analytics, information systems, and decision theory.

### Research Tracks & Focus Areas
- Supply Chain Risk, Geopolitical Resilience, and Dual-Sourcing Strategies
- Machine Learning, Prescriptive Analytics, and Decision Support Systems
- Healthcare Operations, Patient Flow Optimization, and Resource Allocation
- Sustainable Sourcing, Closed-Loop Supply Chains, and Carbon Accounting
- Empirical Operations Management and Econometric Identifications

### Doctoral Consortium & Workshops
Offers the DSI Doctoral Student Consortium and New Faculty Development Consortium with dedicated job market networking suites.

### Venue & Travel Logistics
Hosted at the San Francisco Marriott Marquis, located steps from Union Square and the Moscone Center in downtown San Francisco. Direct BART subway connection from San Francisco International Airport (SFO).`,
    url: "https://decisionsciences.org",
  },
  {
    id: "poms-2027",
    name: "37th Annual Conference of the Production and Operations Management Society",
    acronym: "POMS 2027",
    startDate: new Date("2027-04-22T00:00:00.000Z"),
    endDate: new Date("2027-04-26T00:00:00.000Z"),
    timezone: "America/New_York",
    cfpDeadline: new Date("2026-12-01T23:59:00.000Z"),
    location: "Orlando, Florida, USA",
    description: `### Conference Theme
The flagship global gathering for production, service operations, supply chain, and revenue management scholars, affiliated with the premier journal Production and Operations Management (POM).

### Research Tracks & Focus Areas
- Supply Chain Management & Vendor Contracting
- Healthcare Operations Management & Clinical Resource Scheduling
- Revenue Management, Dynamic Pricing, and Platform Matching Algorithms
- Behavioral Operations & Experimental Decision Making
- Humanitarian Logistics, Disaster Preparedness, and Public Sector OM
- Sustainable Operations and Environmental Policy Modeling

### Doctoral Consortium & Mentorship
Includes the prestigious POMS Emerging Scholars Program and Doctoral Consortium with travel grants and editorial feedback roundtables.

### Venue & Travel Logistics
Held at the Hyatt Regency Orlando in Orlando, Florida. Minutes from Orlando International Airport (MCO). Shuttle coordination and shared Airbnb boards recommended.`,
    url: "https://pomsmeetings.org",
  },
  {
    id: "msom-2027",
    name: "2027 INFORMS MSOM Conference & SIG Day",
    acronym: "MSOM 2027",
    startDate: new Date("2027-06-20T00:00:00.000Z"),
    endDate: new Date("2027-06-22T00:00:00.000Z"),
    timezone: "America/Edmonton",
    cfpDeadline: new Date("2027-02-15T23:59:00.000Z"),
    location: "Banff, Alberta, Canada",
    description: `### Conference Theme
The annual conference of the Manufacturing and Service Operations Management (MSOM) Society of INFORMS, widely regarded as the most rigorous and selective research venue in operations management.

### Research Tracks & Focus Areas
- Special Interest Group (SIG) Days: Supply Chain Management, Healthcare OM, Service Management, Sustainable OM
- Marketplace Analytics, Gig Economy Platform Design, and Real-Time Driver Allocation
- Algorithmic Fairness, Mechanism Design, and Queueing Optimization
- Empirical OM: Natural experiments, causal inference, and observational datasets

### Doctoral Consortium & Mentorship
Pre-conference SIG workshop day and doctoral research competition featuring top thesis awards and publisher receptions.

### Venue & Travel Logistics
Held at the breathtaking Banff Centre for Arts and Creativity in Banff National Park, Alberta, Canada, hosted by the University of Calgary (Haskayne School of Business). Airport shuttle buses available from Calgary International Airport (YYC).`,
    url: "https://informs.org",
  },
  {
    id: "informs-2027",
    name: "2027 INFORMS Annual Meeting",
    acronym: "INFORMS 2027",
    startDate: new Date("2027-10-24T00:00:00.000Z"),
    endDate: new Date("2027-10-27T00:00:00.000Z"),
    timezone: "America/Los_Angeles",
    cfpDeadline: new Date("2027-05-15T23:59:00.000Z"),
    location: "Seattle, Washington, USA",
    description: `### Conference Theme
The largest international convention of operations research, management science, and business analytics scholars in the world, bringing together over 7,000 academics, industry scientists, and doctoral candidates.

### Research Tracks & Focus Areas
- Operations Research & Mathematical Programming: Stochastic optimization, integer programming
- Information Systems & Artificial Intelligence in Decision Support
- Data Science, Machine Learning, and Big Data Analytics in Management
- Transportation, Logistics, and Smart Mobility Optimization
- Energy, Natural Resources, and Sustainable Infrastructure

### Doctoral Consortium & Job Placement Services
Hosts the famous INFORMS Career Center—the global clearinghouse for academic faculty placements in Operations, Information Systems, and Analytics.

### Venue & Travel Logistics
Hosted at the Seattle Convention Center (Summit Building) and Hyatt Regency Seattle in downtown Seattle, Washington. Connected via Light Rail from Seattle-Tacoma International Airport (SEA).`,
    url: "https://www.informs.org",
  },

  // --- Information Systems (AIS Premier Series) ---
  {
    id: "hicss-2027",
    name: "60th Hawaii International Conference on System Sciences (HICSS-60)",
    acronym: "HICSS 2027",
    startDate: new Date("2027-01-05T00:00:00.000Z"),
    endDate: new Date("2027-01-08T00:00:00.000Z"),
    timezone: "Pacific/Honolulu",
    cfpDeadline: new Date("2026-06-15T23:59:00.000Z"),
    location: "Big Island of Hawaii, Hawaii, USA",
    description: `### Conference Theme
Celebrating 60 years of scientific leadership, HICSS is one of the longest-running and most influential international conferences in Information Systems, Computer Science, and digital technology management.

### Research Tracks & Focus Areas
- AI, Machine Learning, and Cognitive Systems in Organizational Contexts
- Digital and Social Media: Collective intelligence, virality, and misinformation
- Electronic Government, Civic Tech, and Public Sector Informatics
- Healthcare Informatics, Telemedicine, and Digital Health Therapeutics
- Software Technology, Cybersecurity, and Resilient Cloud Architecture
- Organizational Systems and Technology: Hybrid work, enterprise agility, and culture

### Doctoral Consortium & Mentoring
Hosts intensive Ph.D. student seminars and mini-tracks with immediate feedback from senior editors of top MIS journals.

### Venue & Travel Logistics
Held at the Hilton Waikoloa Village on the Kohala Coast of Hawaii's Big Island. Fly directly into Kona International Airport (KOA). Group car rentals and shared condos are popular among academic delegations.`,
    url: "https://hicss.hawaii.edu",
  },
  {
    id: "icis-2026",
    name: "International Conference on Information Systems 2026",
    acronym: "ICIS 2026",
    startDate: new Date("2026-12-13T00:00:00.000Z"),
    endDate: new Date("2026-12-16T00:00:00.000Z"),
    timezone: "Europe/Lisbon",
    cfpDeadline: new Date("2026-05-01T23:59:00.000Z"),
    location: "Lisbon, Portugal",
    description: `### Conference Theme
Digital Collaboration and Coexistence. ICIS is the flagship annual conference of the Association for Information Systems (AIS) and the undisputed premier global academic venue in the Information Systems field.

### Research Tracks & Focus Areas
- Artificial Intelligence and Algorithmic Work in Enterprises
- Digital Platforms, Two-Sided Markets, and Ecosystem Competition
- Information Privacy, Cyberthreats, and National Security Informatics
- Human-Computer Interaction (HCI) and Emerging Immersive Technologies
- Social and Ethical Implications of Digital Technologies
- Research Methods in Information Systems (Design Science, Econometrics, Computational Methods)

### Doctoral Consortium & Pre-Conference Workshops
Features the world-renowned ICIS Doctoral Consortium, Junior Faculty Consortium, and co-located workshops: WITS (Workshop on Information Technologies and Systems) and WISE (Workshop on Information Systems and Economics).

### Venue & Travel Logistics
Hosted at the Lisbon Congress Centre (Centro de Congressos de Lisboa) alongside the scenic Tagus river in historic Lisbon, Portugal. Easy transit via Lisbon Airport (LIS) and the Lisbon Metro system.`,
    url: "https://icis.aisnet.org",
  },
  {
    id: "ecis-2027",
    name: "35th European Conference on Information Systems",
    acronym: "ECIS 2027",
    startDate: new Date("2027-05-24T00:00:00.000Z"),
    endDate: new Date("2027-05-26T00:00:00.000Z"),
    timezone: "Europe/Luxembourg",
    cfpDeadline: new Date("2026-11-20T23:59:00.000Z"),
    location: "Luxembourg City, Luxembourg",
    description: `### Conference Theme
The premier European conference for Information Systems academics and professionals, an official AIS Region 2 flagship event. Known for strong theoretical rigor, qualitative depth, and progressive digital policy research.

### Research Tracks & Focus Areas
- Digital Sovereignty, Data Privacy Regulations, and EU AI Act Compliance
- Sustainable Digital Transformation and Green Information Systems
- Digital Innovation, FinTech Ecosystems, and Distributed Ledgers
- Work Transformation, Gig Platforms, and Employee Wellbeing
- Design Science Research and Action Design Methodologies

### Doctoral Consortium & Pre-Conference Workshops
The ECIS Doctoral Consortium takes place May 21–23, 2027, featuring faculty mentors from Europe's top business schools and universities.

### Venue & Travel Logistics
Hosted at the University of Luxembourg campus in Luxembourg City. Accessible via Luxembourg Airport (LUX) with excellent high-speed train connections across Europe. Public transit across the entire country of Luxembourg is completely free of charge.`,
    url: "https://ecis2027.uni.lu",
  },
  {
    id: "pacis-2027",
    name: "Pacific Asia Conference on Information Systems 2027",
    acronym: "PACIS 2027",
    startDate: new Date("2027-07-05T00:00:00.000Z"),
    endDate: new Date("2027-07-09T00:00:00.000Z"),
    timezone: "Pacific/Auckland",
    cfpDeadline: new Date("2027-02-15T23:59:00.000Z"),
    location: "Auckland, New Zealand",
    description: `### Conference Theme
Innovating a Digital Future for an Inclusive Tomorrow. The flagship AIS Region 3 conference covering the Asia-Pacific region, examining digital leapfrogging, cross-border e-commerce, and digital innovation.

### Research Tracks & Focus Areas
- Digital Financial Inclusion and Mobile Money Ecosystems
- Smart Cities, Intelligent Transportation, and IoT Architectures
- Digital Commerce and Cross-Border Platform Logistics in the Asia-Pacific
- Enterprise Systems, Cloud Migration, and Business Process Management
- Cyber Security, Online Fraud Prevention, and Data Governance

### Doctoral Consortium & Workshops
Doctoral Consortium held July 5–6, 2027, pairing students with leading Asia-Pacific faculty and senior editors from the Journal of the Association for Information Systems (JAIS).

### Venue & Travel Logistics
Hosted at the University of Auckland Business School (Sir Owen G Glenn Building) in central Auckland, New Zealand. Accessible from Auckland Airport (AKL).`,
    url: "https://aisnet.org",
  },
  {
    id: "amcis-2027",
    name: "Americas Conference on Information Systems 2027",
    acronym: "AMCIS 2027",
    startDate: new Date("2027-07-28T00:00:00.000Z"),
    endDate: new Date("2027-07-30T00:00:00.000Z"),
    timezone: "America/Sao_Paulo",
    cfpDeadline: new Date("2027-03-01T23:59:00.000Z"),
    location: "São Paulo, Brazil",
    description: `### Conference Theme
The flagship annual conference of AIS Region 1, attracting information systems scholars across North, Central, and South America to present developmental and full research papers.

### Research Tracks & Focus Areas
- Healthcare Information Systems and Global Telemedicine
- Decision Analytics, Explainable AI, and Big Data Methodologies
- Social Technical Systems, Digital Literacy, and Human Rights Informatics
- FinTech Innovations, Open Banking, and Blockchain Governance
- IT Project Management, Agile Adoption, and Digital Leadership

### Doctoral Consortium & Mentorship
Pre-conference Doctoral Consortium and Early Career Faculty Camp providing structured research development and publishing strategies.

### Venue & Travel Logistics
Held in São Paulo, Brazil. Accessible via São Paulo/Guarulhos International Airport (GRU) and Congonhas Airport (CGH).`,
    url: "https://aisnet.org",
  },

  // --- Marketing ---
  {
    id: "ama-2027",
    name: "2027 AMA Winter Academic Conference",
    acronym: "AMA 2027",
    startDate: new Date("2027-02-12T00:00:00.000Z"),
    endDate: new Date("2027-02-14T00:00:00.000Z"),
    timezone: "America/Chicago",
    cfpDeadline: new Date("2026-08-15T23:59:00.000Z"),
    location: "New Orleans, Louisiana, USA",
    description: `### Conference Theme
The flagship academic conference of the American Marketing Association (AMA), connecting researchers in marketing strategy, behavioral consumer insights, sales management, and brand theory.

### Research Tracks & Focus Areas
- Marketing Strategy in the Era of Generative AI and Algorithmic Retailing
- Consumer Psychology, Brand Attachment, and Hedonic Consumption
- Omnichannel Retail, Customer Journeys, and Digital Touchpoints
- Marketing Analytics, Attribution Models, and Customer Lifetime Value
- Social Media Influencer Dynamics, Word-of-Mouth, and Viral Marketing

### Doctoral Consortium & Mentoring
Features the prestigious DocSIG sessions, networking luncheons with AMA journal editors, and career guidance roundtables.

### Venue & Travel Logistics
Held in the vibrant French Quarter district of New Orleans, Louisiana. Direct flight connections to Louis Armstrong New Orleans International Airport (MSY).`,
    url: "https://www.ama.org/events/",
  },
  {
    id: "emac-2027",
    name: "56th European Marketing Academy Annual Conference (EMAC 2027)",
    acronym: "EMAC 2027",
    startDate: new Date("2027-05-23T00:00:00.000Z"),
    endDate: new Date("2027-05-28T00:00:00.000Z"),
    timezone: "Europe/Rome",
    cfpDeadline: new Date("2026-12-02T23:59:00.000Z"),
    location: "Rome, Italy",
    description: `### Conference Theme
Europe's premier annual marketing research conference, hosted by the European Marketing Academy to promote scholarly exchange across behavioral, managerial, and quantitative marketing.

### Research Tracks & Focus Areas
- Advertising, Promotion, and Digital Media Campaigns
- Consumer Behavior & Social Influences
- Digital Marketing, E-Commerce, and Social Commerce
- Marketing Strategy, Alliances, and Market Orientation
- Pricing, Promotion, and Revenue Management
- Relationship Marketing, CRM, and Customer Experience Management

### Doctoral Colloquium
The highly competitive EMAC Doctoral Colloquium takes place May 23–25, 2027, offering dedicated tracks for advanced and beginner PhD candidates.

### Venue & Travel Logistics
Hosted at LUISS University (Libera Università Internazionale degli Studi Sociali) in Rome, Italy. Easily reachable via Rome Fiumicino (FCO) and Ciampino (CIA) airports.`,
    url: "https://emac2027.org",
  },
  {
    id: "mktg-sci-2027",
    name: "2027 INFORMS ISMS Marketing Science Conference",
    acronym: "MKTG SCI 2027",
    startDate: new Date("2027-06-24T00:00:00.000Z"),
    endDate: new Date("2027-06-26T00:00:00.000Z"),
    timezone: "America/Los_Angeles",
    cfpDeadline: new Date("2027-01-20T23:59:00.000Z"),
    location: "Seattle, Washington, USA",
    description: `### Conference Theme
The premier global annual conference for quantitative marketing, empirical industrial organization, machine learning in marketing, and econometric methods, sponsored by the INFORMS Society for Marketing Science (ISMS).

### Research Tracks & Focus Areas
- Empirical IO, Dynamic Structural Models, and Competitive Strategy
- Causal Machine Learning, Digital Advertising Auctions, and Bandit Algorithms
- Recommender Systems, Personalization, and Customer Targeting Models
- Pricing Analytics, Subscription Models, and Churn Forecasting
- Social Networks, Viral Diffusion, and Graph Neural Networks in Marketing

### Doctoral Consortium & Mentorship
Pre-conference ISMS Doctoral Consortium on June 23, 2027, bringing together the world's leading quantitative marketing researchers and editors of Marketing Science.

### Venue & Travel Logistics
Hosted at the Sheraton Seattle Hotel in downtown Seattle, Washington. Close to Pike Place Market and the Seattle waterfront.`,
    url: "https://informs.org",
  },
  {
    id: "acr-2027",
    name: "Association for Consumer Research Annual Conference (ACR 2027)",
    acronym: "ACR 2027",
    startDate: new Date("2027-10-28T00:00:00.000Z"),
    endDate: new Date("2027-10-31T00:00:00.000Z"),
    timezone: "America/Los_Angeles",
    cfpDeadline: new Date("2027-03-15T23:59:00.000Z"),
    location: "Anaheim, California, USA",
    description: `### Conference Theme
Flourishing. The Association for Consumer Research (ACR) Annual Conference is the definitive international summit for consumer behavior, behavioral decision theory, and consumer psychology.

### Research Tracks & Focus Areas
- Self-Regulation, Goal Pursuit, and Impulse Control
- Emotion, Affect, and Sensory Marketing (Haptics, Olfaction, Auditory Branding)
- Social Justice, Vulnerability, and Marketplace Inequity
- Human-AI Interaction, Robotics, and Algorithmic Decision Making
- Cultural Psychology, Materialism, and Sustainable Well-Being

### Doctoral Symposium & Mentorship
Includes the prestigious ACR Doctoral Symposium on October 28, 2027, offering intensive career workshops and research roundtables.

### Venue & Travel Logistics
Held at the Anaheim Marriott in Anaheim, California. Accessible from John Wayne Airport (SNA) and Los Angeles International Airport (LAX).`,
    url: "https://acrwebsite.org",
  },

  // --- Finance & Accounting ---
  {
    id: "afa-2027",
    name: "2027 American Finance Association Annual Meeting",
    acronym: "AFA 2027",
    startDate: new Date("2027-01-03T00:00:00.000Z"),
    endDate: new Date("2027-01-05T00:00:00.000Z"),
    timezone: "America/New_York",
    cfpDeadline: new Date("2026-03-15T23:59:00.000Z"),
    location: "Washington, D.C., USA",
    description: `### Conference Theme
The premier academic finance conference in the world, held jointly with the Allied Social Science Associations (ASSA) and affiliated with The Journal of Finance (JF).

### Research Tracks & Focus Areas
- Theoretical and Empirical Asset Pricing, Factor Anomalies, and Term Structure
- Corporate Finance, Capital Structure, and Executive Compensation
- Financial Intermediation, Bank Runs, and Central Bank Interventions
- FinTech, Cryptocurrency Markets, and Distributed Ledger Infrastructure
- Macro-Finance, Sovereign Debt, and Global Monetary Policy Spillovers
- Climate Finance, ESG Disclosure, and Greenwashing Detection

### Doctoral Consortium & Academic Job Market
Serves as the global epicenter for the Academic Job Market in Finance and Economics, where graduating PhD candidates interview with universities worldwide.

### Venue & Travel Logistics
Held at the Westin Washington, DC Downtown in Washington, D.C. Accessible via Ronald Reagan Washington National Airport (DCA) and Washington Dulles (IAD).`,
    url: "https://afajof.org",
  },
  {
    id: "wfa-2027",
    name: "2027 Western Finance Association Annual Meeting",
    acronym: "WFA 2027",
    startDate: new Date("2027-06-27T00:00:00.000Z"),
    endDate: new Date("2027-06-30T00:00:00.000Z"),
    timezone: "America/Los_Angeles",
    cfpDeadline: new Date("2026-11-18T23:59:00.000Z"),
    location: "Indian Wells, California, USA",
    description: `### Conference Theme
Universally recognized alongside AFA as one of the most selective and rigorous academic finance conferences in the world, featuring high-impact research selected through double-blind peer review.

### Research Tracks & Focus Areas
- Asset Pricing & Market Microstructure
- Behavioral Finance & Retail Investor Trading Dynamics
- Corporate Governance, Activism, and Shareholder Proxy Voting
- Private Equity, Venture Capital, and Entrepreneurial Finance
- International Finance, Exchange Rate Volatility, and Sovereign Risk

### Paper Awards & Receptions
Features the Wharton School-WRDS Best Paper Award and prestigious academic receptions with editors of JF, JFE, and RFS.

### Venue & Travel Logistics
Hosted at the luxurious Grand Hyatt Indian Wells Resort & Villas in the Palm Springs desert valley, California. Fly into Palm Springs International Airport (PSP) or Ontario International (ONT).`,
    url: "https://westernfinance.org",
  },
  {
    id: "aaa-2027",
    name: "2027 American Accounting Association Annual Meeting (AAA Global Connect)",
    acronym: "AAA 2027",
    startDate: new Date("2027-07-31T00:00:00.000Z"),
    endDate: new Date("2027-08-04T00:00:00.000Z"),
    timezone: "America/New_York",
    cfpDeadline: new Date("2027-01-15T23:59:00.000Z"),
    location: "Orlando, Florida, USA",
    description: `### Conference Theme
The largest and most comprehensive gathering of accounting educators, researchers, and doctoral scholars in the world, affiliated with The Accounting Review (TAR), JAR, and JAE.

### Research Tracks & Focus Areas
- Financial Accounting and Reporting: Earnings quality, materiality, and disclosure
- Auditing and Assurance: Auditor independence, PCAOB inspections, and AI audit tools
- Management Accounting: Cost behavior, performance measurement, and incentives
- Tax Policy and Corporate Tax Avoidance Strategies
- Accounting Information Systems, XBRL, and Forensic Accounting

### Doctoral Consortium & Colloquium
Includes the AAA Doctoral Consortium and New Faculty Consortium, bringing together hundreds of doctoral students for intensive research workshops.

### Venue & Travel Logistics
Held in Orlando, Florida. Accessible via Orlando International Airport (MCO). Excellent hotel convention rates and family-friendly resort amenities.`,
    url: "https://aaahq.org",
  },
  {
    id: "efa-2027",
    name: "54th European Finance Association Annual Meeting (EFA 2027)",
    acronym: "EFA 2027",
    startDate: new Date("2027-08-18T00:00:00.000Z"),
    endDate: new Date("2027-08-21T00:00:00.000Z"),
    timezone: "Europe/Copenhagen",
    cfpDeadline: new Date("2027-02-01T23:59:00.000Z"),
    location: "Aarhus, Denmark",
    description: `### Conference Theme
The flagship academic finance conference in Europe, organized by the European Finance Association (EFA) to present cutting-edge empirical and theoretical corporate finance, asset pricing, and banking research.

### Research Tracks & Focus Areas
- Corporate Finance, Distress, and Restructuring
- Asset Pricing, Derivatives, and Fixed Income Modeling
- Banking, Non-Bank Financial Intermediation, and Shadow Banking
- Household Finance, Financial Literacy, and Wealth Inequality
- Sustainable Finance, ESG Criteria, and Impact Investing

### Doctoral Tutorial & Mentoring
Features the prestigious EFA Doctoral Tutorial on August 18, 2027, where eight promising doctoral students present their job market papers to senior discussants.

### Venue & Travel Logistics
Hosted at University City (Universitetsbyen), Aarhus University in Aarhus, Denmark. Fly into Aarhus Airport (AAR) or Billund Airport (BLL), with direct trains to Aarhus Central Station.`,
    url: "https://au.dk",
  },

  // --- Management, Strategy, Entrepreneurship & International Business ---
  {
    id: "bcerc-2027",
    name: "47th Babson College Entrepreneurship Research Conference (BCERC 2027)",
    acronym: "BCERC 2027",
    startDate: new Date("2027-06-09T00:00:00.000Z"),
    endDate: new Date("2027-06-12T00:00:00.000Z"),
    timezone: "Europe/Zurich",
    cfpDeadline: new Date("2026-10-15T23:59:00.000Z"),
    location: "Lausanne, Switzerland",
    description: `### Conference Theme
Widely considered the premier entrepreneurship research conference in the world, founded by Babson College to advance empirical and theoretical entrepreneurship scholarship.

### Research Tracks & Focus Areas
- New Venture Creation, Opportunity Recognition, and Founder Teams
- Venture Capital, Angel Investing, and Crowdfunding Dynamics
- Corporate Entrepreneurship and Strategic Innovation in Incumbents
- Family Business Governance and Intergenerational Transitions
- Social Entrepreneurship, Sustainable Ventures, and B-Corps
- High-Growth Scaling, Pivot Decisions, and Startup Mortality

### Doctoral Consortium
Co-hosts the BCERC Doctoral Consortium sponsored by the Ewing Marion Kauffman Foundation, providing mentorship for PhD dissertations in entrepreneurship.

### Venue & Travel Logistics
Jointly hosted by EPFL (École polytechnique fédérale de Lausanne) and IMD Business School in Lausanne, Switzerland, along the shores of Lake Geneva. Accessible via Geneva Airport (GVA) by direct 45-minute train.`,
    url: "https://babson.edu/bcerc",
  },
  {
    id: "euram-2027",
    name: "European Academy of Management Annual Conference 2027",
    acronym: "EURAM 2027",
    startDate: new Date("2027-06-23T00:00:00.000Z"),
    endDate: new Date("2027-06-25T00:00:00.000Z"),
    timezone: "Europe/Rome",
    cfpDeadline: new Date("2027-01-10T23:59:00.000Z"),
    location: "Florence, Italy",
    description: `### Conference Theme
Europe's leading academic community of management scholars and doctoral research consortia, known for rich developmental feedback and interdisciplinary tracks.

### Research Tracks & Focus Areas
- Business for Society, Sustainable Development, and Ethical Leadership
- Corporate Governance, Board Diversity, and Stakeholder Governance
- Innovation Management, Open Innovation, and Ecosystems
- Organizational Behavior, Leadership, and Work Identity
- Strategic Management, Dynamic Capabilities, and Platform Strategies
- Research Methods: Qualitative, Quantitative, and Mixed-Methods Innovations

### Doctoral Colloquium
Includes the EURAM Doctoral Colloquium on June 22–23, 2027, offering dedicated workshops for PhD candidates at various stages of dissertation writing.

### Venue & Travel Logistics
Hosted in the historic city of Florence (Firenze), Italy. Accessible via Florence Airport (FLR) or Pisa International Airport (PSA) with frequent train connections.`,
    url: "https://euram.academy/",
  },
  {
    id: "aib-2027",
    name: "2027 Academy of International Business Annual Meeting (AIB 2027)",
    acronym: "AIB 2027",
    startDate: new Date("2027-06-27T00:00:00.000Z"),
    endDate: new Date("2027-06-30T00:00:00.000Z"),
    timezone: "Asia/Kuala_Lumpur",
    cfpDeadline: new Date("2027-01-15T23:59:00.000Z"),
    location: "Sunway City (Kuala Lumpur), Malaysia",
    description: `### Conference Theme
The flagship global conference for international business and multinational management scholars, affiliated with the Journal of International Business Studies (JIBS).

### Research Tracks & Focus Areas
- MNE Strategy and Global Value Chain Configuration
- Geopolitics, De-Globalization, and Cross-Border Regulatory Risk
- Emerging Market Multinationals (EMNEs) and South-South Investments
- Cross-Cultural Management, Global Leadership, and Expatriate Mobility
- International Entrepreneurship, Born-Globals, and Digital Internationalization

### Doctoral Consortium & Mentoring
Features the famous AIB/Sheth Doctoral Consortium and Peter J. Buckley and Mark Casson AIB Dissertation Award sessions.

### Venue & Travel Logistics
Held at the Sunway Resort Hotel & Convention Centre in Sunway City, Greater Kuala Lumpur, Malaysia. Accessible via Kuala Lumpur International Airport (KUL).`,
    url: "https://www.aib.world",
  },
  {
    id: "egos-2027",
    name: "43rd EGOS Colloquium 2027",
    acronym: "EGOS 2027",
    startDate: new Date("2027-07-08T00:00:00.000Z"),
    endDate: new Date("2027-07-10T00:00:00.000Z"),
    timezone: "Europe/Vienna",
    cfpDeadline: new Date("2027-01-09T23:59:00.000Z"),
    location: "Vienna, Austria",
    description: `### Conference Theme
The European Group for Organizational Studies (EGOS) flagship annual colloquium, widely celebrated as the intellectual haven for organization theory, sociology of work, and qualitative institutional research. Affiliated with Organization Studies (OS).

### Research Sub-Themes & Focus Areas
- Institutional Logics, Institutional Work, and Category Construction
- Routine Dynamics, Practice-Based Studies, and Process Philosophy
- Paradox Theory, Tensions, and Organizational Ambiguity
- Power, Critical Management Studies, and Digital Surveillance at Work
- Emotions, Identity, and Embodiment in Organizational Life

### Pre-Colloquium Workshops
Features Pre-Colloquium PhD Workshops and Post-Doctoral & Early Career Scholar Workshops on July 6–7, 2027.

### Venue & Travel Logistics
Hosted at the Vienna University of Economics and Business (WU Wien) campus in Vienna, Austria. Direct airport train (CAT) from Vienna International Airport (VIE).`,
    url: "https://www.egos.org/",
  },
  {
    id: "aom-2027",
    name: "87th Annual Meeting of the Academy of Management",
    acronym: "AOM 2027",
    startDate: new Date("2027-08-06T00:00:00.000Z"),
    endDate: new Date("2027-08-10T00:00:00.000Z"),
    timezone: "America/New_York",
    cfpDeadline: new Date("2027-01-12T17:00:00.000Z"),
    location: "Boston, Massachusetts, USA",
    description: `### Conference Theme
The Academy of Management Annual Meeting is the world's premier and largest event for scholarly management research, bringing together over 10,000 professors, doctoral researchers, and editors across 26 distinct divisions.

### Research Divisions & Focus Areas
- STR (Strategic Management): Resource-based view, competitive dynamics, corporate strategy
- OB (Organizational Behavior): Team cognition, leadership, employee motivation
- OMT (Organization and Management Theory): Institutional theory, networks, status
- TIM (Technology and Innovation Management): Disruptive tech, patent strategy
- ENT (Entrepreneurship): Opportunity exploitation, founder psychology, accelerators
- HR (Human Resources): Talent analytics, compensation, strategic HRM
- CTO (Communication, Digital Technology, and Organization)

### Doctoral & Junior Faculty Consortia
Division-specific doctoral consortia and PDWs (Professional Development Workshops) held August 6–7, 2027. Features the global AOM Placement Center for university job market recruitment.

### Venue & Travel Logistics
Held at the Boston Convention & Exhibition Center (BCEC) and Hynes Convention Center in Boston, Massachusetts. Convenient direct access via Boston Logan International Airport (BOS).`,
    url: "https://aom.org/events/annual-meeting",
  },
  {
    id: "sms-2027",
    name: "Strategic Management Society 47th Annual Conference",
    acronym: "SMS 2027",
    startDate: new Date("2027-10-16T00:00:00.000Z"),
    endDate: new Date("2027-10-19T00:00:00.000Z"),
    timezone: "America/Vancouver",
    cfpDeadline: new Date("2027-02-28T23:59:00.000Z"),
    location: "Vancouver, Canada",
    description: `### Conference Theme
The flagship international conference of the Strategic Management Society (SMS), affiliated with the Strategic Management Journal (SMJ) and Strategy Science. The focal meeting place for business strategy scholars worldwide.

### Research Interest Groups (RIGs)
- Competitive Strategy: Industry structure, competitor analysis, positioning
- Corporate Strategy: Diversification, M&A, divestitures, strategic alliances
- Global Strategy: Cross-border arbitrage, global configuration, geopolitical risk
- Behavioral Strategy: Cognitive microfoundations, bounded rationality, heuristics
- Strategy Process & Practice: Strategy formulation, implementation, strategic renewal
- Entrepreneurship & Strategy: Platform ecosystems, business models, startup growth

### Doctoral & Junior Faculty Workshops
Hosts the prestigious SMS Doctoral Workshop and SRF (Strategy Research Foundation) Dissertation Scholar presentations.

### Venue & Travel Logistics
Held at the Sheraton Vancouver Wall Centre in downtown Vancouver, British Columbia, Canada. Accessible via Vancouver International Airport (YVR) via the Canada Line SkyTrain (25 minutes).`,
    url: "https://www.strategicmanagement.net",
  },
];
