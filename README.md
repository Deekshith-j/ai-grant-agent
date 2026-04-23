# 🎓 AI Grant & Scholarship Hunter Agent

An autonomous multi-agent AI system that helps students discover, evaluate, and apply for scholarships efficiently using intelligent reasoning and real-time web search.

---

## 🚀 Overview

The AI Grant & Scholarship Hunter Agent automates the entire scholarship discovery pipeline:

**Profile → Search → Score → Generate → Track**

It reduces manual effort, improves matching accuracy, and increases the chances of successful applications.

---

## 🧠 System Architecture

The system follows a **multi-agent pipeline** orchestrated by a central Manager Agent:

1. **Profile Ingestion Agent**

   * Converts unstructured input (resume/text) into structured JSON

2. **Scholarship Search Agent**

   * Performs web searches across multiple scholarship sources

3. **Eligibility Scorer Agent**

   * Scores scholarships based on profile compatibility

4. **Essay Writer Agent**

   * Generates and refines tailored application essays

5. **Deadline Manager Agent**

   * Tracks deadlines and generates reminders

---

## ⚙️ Tech Stack

### AI / LLM

* Google Gemini API (Pro + Flash)

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL

### Search & Scraping

* Web Search APIs (Serper / SerpAPI)
* Playwright / BeautifulSoup

### Queue & Rate Limiting

* Redis
* BullMQ

---

## 🔄 Workflow

```bash
User Input
   ↓
Profile Extraction
   ↓
Scholarship Search (50+ sources)
   ↓
Eligibility Scoring (filter < 40%)
   ↓
Top 10–15 Results
   ↓
Essay Generation (self-improving loop)
   ↓
Deadline Tracking
   ↓
Final Output
```

---

## 🔑 Key Features

* ✅ Automated scholarship discovery
* ✅ Real-time web search with verified links
* ✅ Intelligent eligibility scoring (0–100%)
* ✅ AI-generated personalized essays
* ✅ Deadline tracking & reminders
* ✅ Self-correcting agent pipeline

---

## 🧠 Self-Correction Mechanisms

* **Profile Validation**
  Ensures required fields are complete before processing

* **Eligibility Threshold Filtering**
  Removes low-relevance scholarships (<40%)

* **Essay Improvement Loop**
  Iteratively refines essays up to 3 times

* **Search Fallback Strategy**
  Retries with broader queries if results are insufficient

---

## 🔐 Credential Handling

The system dynamically requests:

* Gemini API Key
* Optional Calendar API access

Security rules:

* Credentials are session-based
* No permanent storage without consent

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/grant-hunter-agent.git

# Navigate to project
cd grant-hunter-agent

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## ⚡ Environment Variables

Create a `.env` file:

```env
GEMINI_API_KEY=your_api_key
SERPER_API_KEY=your_api_key
REDIS_URL=your_redis_url
DATABASE_URL=your_postgres_url
```

---

## ▶️ Usage

1. Provide student profile (text/resume/form)
2. System extracts structured data
3. Agent searches and filters scholarships
4. View top matches with application links
5. Generate essays and track deadlines

---

## 📊 Output Format

```json
{
  "profile": {...},
  "scholarships": [
    {
      "title": "",
      "match_score": 85,
      "deadline": "",
      "application_link": ""
    }
  ],
  "essays": [...],
  "deadlines": [...]
}
```

---

## 🚨 Limitations

* Depends on availability and accuracy of web data
* Some scholarships may require manual verification
* Essay outputs may need final human review

---

## 🔮 Future Enhancements

* Auto-application submission
* Integration with university portals
* Mobile application
* Multi-language support
* Advanced ML-based personalization

---

## 🙌 Acknowledgements

Built using modern AI tools and multi-agent architecture principles to simplify scholarship discovery and application workflows.

---

