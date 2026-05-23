const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const MAX_CONTEXT_CHARS = 8000;
const SCRAPE_TIMEOUT_MS = 8000;
const OPENAI_TIMEOUT_MS = 20000;
const PHONE_RULES = {
  IN: { dial: '91', minDigits: 10, maxDigits: 10 },
  US: { dial: '1', minDigits: 10, maxDigits: 10 },
  CA: { dial: '1', minDigits: 10, maxDigits: 10 },
  GB: { dial: '44', minDigits: 10, maxDigits: 10 },
  AU: { dial: '61', minDigits: 9, maxDigits: 9 },
  SG: { dial: '65', minDigits: 8, maxDigits: 8 },
  AE: { dial: '971', minDigits: 9, maxDigits: 9 },
  SA: { dial: '966', minDigits: 9, maxDigits: 9 },
  ZA: { dial: '27', minDigits: 9, maxDigits: 9 },
  PH: { dial: '63', minDigits: 10, maxDigits: 10 },
  BR: { dial: '55', minDigits: 10, maxDigits: 11 },
  DE: { dial: '49', minDigits: 10, maxDigits: 11 },
  FR: { dial: '33', minDigits: 9, maxDigits: 9 },
  MX: { dial: '52', minDigits: 10, maxDigits: 10 },
  ID: { dial: '62', minDigits: 9, maxDigits: 10 },
  NZ: { dial: '64', minDigits: 8, maxDigits: 9 },
  PK: { dial: '92', minDigits: 10, maxDigits: 10 },
  BD: { dial: '880', minDigits: 10, maxDigits: 10 },
  NG: { dial: '234', minDigits: 10, maxDigits: 10 },
  KE: { dial: '254', minDigits: 9, maxDigits: 9 },
  MY: { dial: '60', minDigits: 9, maxDigits: 10 },
  TH: { dial: '66', minDigits: 9, maxDigits: 9 }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
}

function normalizeUrl(input) {
  let url = String(input || '').trim().toLowerCase();
  if (!url) return '';
  url = url.replace(/^https?:\/\//, '');
  url = url.replace(/[/?#].*$/, '').replace(/\/+$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(url)) return '';
  return `https://${url}`;
}

function normalizePhone(phoneCountry, phoneCountryCode, phoneNumber) {
  const selected = PHONE_RULES[String(phoneCountry || '').toUpperCase()] || null;
  if (!selected) return { ok: false };

  const rawDigits = String(phoneNumber || '').replace(/\D/g, '');
  const dial = String(selected.dial);
  let national = rawDigits;
  if (rawDigits.startsWith(dial) && rawDigits.length >= selected.minDigits + dial.length && rawDigits.length <= selected.maxDigits + dial.length) {
    national = rawDigits.slice(dial.length);
  }

  if (national.length < selected.minDigits || national.length > selected.maxDigits) return { ok: false };
  if (String(phoneCountryCode || '').replace(/\D/g, '') !== dial) {
    return { ok: false };
  }

  return {
    ok: true,
    formatted: `+${dial} ${national}`,
    country: String(phoneCountry || '').toUpperCase()
  };
}

function stripJsonFences(text) {
  return String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseJsonLoose(text) {
  const cleaned = stripJsonFences(text);
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw error;
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeWebsite(url) {
  try {
    const scrapeUrl = `https://r.jina.ai/${url}`;
    const res = await fetchWithTimeout(scrapeUrl, { headers: { Accept: 'text/plain' } }, SCRAPE_TIMEOUT_MS);
    if (!res.ok) return { scrapeFailed: true, text: '' };
    const text = await res.text();
    return { scrapeFailed: false, text: text.slice(0, MAX_CONTEXT_CHARS) };
  } catch (error) {
    console.error('Jina scrape failed:', error.message);
    return { scrapeFailed: true, text: '' };
  }
}

async function callOpenAI(messages, temperature = 0.2) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const res = await fetchWithTimeout(
    OPENAI_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature,
        response_format: { type: 'json_object' },
        messages
      })
    },
    OPENAI_TIMEOUT_MS
  );

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${raw}`);
  }

  const data = JSON.parse(raw);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned no content');
  return parseJsonLoose(content);
}

function fallbackResearch(brandName, url) {
  return {
    category: 'brand or business with limited public context',
    topCompetitor: 'a leading direct competitor',
    secondCompetitor: 'another direct competitor',
    q1: 'What are the best options in this category right now?',
    q2: `I need help solving the problem ${brandName} addresses — what do you recommend?`,
    q3: `Tell me about ${brandName} — what do they do?`,
    q4: `Compare ${brandName} with a leading direct competitor — which is better?`,
    q5: `Is ${brandName} good for its main use case?`
  };
}

function ensureResearchShape(research, brandName, url) {
  const fallback = fallbackResearch(brandName, url);
  return {
    category: String(research?.category || fallback.category),
    topCompetitor: String(research?.topCompetitor || fallback.topCompetitor),
    secondCompetitor: String(research?.secondCompetitor || fallback.secondCompetitor),
    q1: String(research?.q1 || fallback.q1),
    q2: String(research?.q2 || fallback.q2),
    q3: String(research?.q3 || fallback.q3),
    q4: String(research?.q4 || fallback.q4),
    q5: String(research?.q5 || fallback.q5)
  };
}

function validScore(value, allowed) {
  const number = Number(value);
  return allowed.includes(number) ? number : 0;
}

function calculateScores(scoreData) {
  const v1 = [0, 2, 4, 6, 8];
  const v2 = [0, 1, 4, 7, 10];
  const v3 = [0, 5, 10];
  const p1Signals = scoreData?.pillar1?.signals || {};
  const p2Signals = scoreData?.pillar2?.signals || {};

  const p1Scores = [
    p1Signals.brandNameClarity,
    p1Signals.categoryOwnership,
    p1Signals.contentDepth,
    p1Signals.externalSignalStrength,
    p1Signals.competitiveDistinctiveness
  ].map((v) => validScore(v, v1));
  const p1Total = Math.min(p1Scores.reduce((a, b) => a + b, 0), 40);

  const p2Scores = [
    p2Signals.brandRepresentationAccuracy,
    p2Signals.recommendationWorthiness,
    p2Signals.competitivePositioningClarity
  ].map((v) => validScore(v, v2));
  const p2Total = Math.min(p2Scores.reduce((a, b) => a + b, 0), 30);

  const wiki = validScore(scoreData?.pillar3?.wikipedia, v3);
  const thirdParty = validScore(scoreData?.pillar3?.thirdPartyCoverage, v3);
  const structured = validScore(scoreData?.pillar3?.structuredData, v3);
  const p3Total = wiki + thirdParty + structured;
  const rawTotal = p1Total + p2Total + p3Total;
  const authorityBonus = Math.min(
    15,
    (wiki === 10 ? 4 : wiki === 5 ? 2 : 0) +
      (thirdParty === 10 ? 4 : thirdParty === 5 ? 2 : 0) +
      (structured === 10 ? 2 : structured === 5 ? 1 : 0) +
      (p1Scores[0] >= 6 ? 2 : 0) +
      (p1Scores[1] >= 6 ? 2 : 0) +
      (p2Scores[0] >= 7 ? 1 : 0) +
      (p2Scores[1] >= 7 ? 1 : 0)
  );
  const fullScore = Math.min(100, rawTotal + authorityBonus);

  let verdictBand;
  if (fullScore >= 91) verdictBand = 'Category leader';
  else if (fullScore >= 81) verdictBand = 'Strong visibility';
  else if (fullScore >= 61) verdictBand = 'Partial visibility';
  else if (fullScore >= 41) verdictBand = 'Barely visible';
  else verdictBand = 'Not visible';

  return { p1Scores, p1Total, p2Scores, p2Total, wiki, thirdParty, structured, p3Total, rawTotal, authorityBonus, fullScore, verdictBand };
}

async function saveToSheets(payload) {
  if (!process.env.SHEETS_WEBHOOK_URL) return;
  try {
    await fetchWithTimeout(
      process.env.SHEETS_WEBHOOK_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      },
      10000
    );
  } catch (error) {
    console.error('Sheets webhook failed:', error.message);
  }
}

async function saveToContactSheets(payload) {
  if (!process.env.CONTACT_SHEETS_WEBHOOK_URL) return;
  try {
    await fetchWithTimeout(
      process.env.CONTACT_SHEETS_WEBHOOK_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      },
      10000
    );
  } catch (error) {
    console.error('Contact sheets webhook failed:', error.message);
  }
}

async function lookupInSheets(params) {
  if (!process.env.SHEETS_WEBHOOK_URL) {
    return { ok: false, error: 'SHEETS_WEBHOOK_URL is not configured' };
  }

  const query = new URLSearchParams({
    mode: 'lookup',
    brand_name: params.brand_name || '',
    brand_website: params.brand_website || ''
  });

  try {
    const res = await fetchWithTimeout(`${process.env.SHEETS_WEBHOOK_URL}?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    }, 10000);
    const raw = await res.text();
    if (!res.ok) {
      return { ok: false, error: raw || `Lookup failed (${res.status})` };
    }
    const data = JSON.parse(raw);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      if (String(params.mode || '').toLowerCase() !== 'lookup') {
        return response(405, { error: 'Method not allowed' });
      }
      const brandName = String(params.brand_name || '').trim();
      const brandWebsite = String(params.brand_website || '').trim();
      if (!brandName && !brandWebsite) {
        return response(400, { error: 'brand_name or brand_website is required' });
      }
      const result = await lookupInSheets({ brand_name: brandName, brand_website: brandWebsite });
      if (!result.ok) {
        return response(500, { error: result.error || 'Lookup failed' });
      }
      return response(200, result.data);
    } catch (error) {
      return response(500, { error: 'Lookup failed', message: error.message });
    }
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const formType = String(body.form_type || 'audit').trim().toLowerCase();
    const brandName = String(body.brand_name || '').trim();
    const websiteInput = String(body.brand_website || '').trim();
    const email = String(body.email_id || '').trim();
    const phoneCountry = String(body.phone_country || '').trim();
    const phoneCountryCode = String(body.phone_country_code || '').trim();
    const phone = String(body.phone_number || '').trim();
    const additionalNote = String(body.additional_note || '').trim();

    if (!brandName || !websiteInput || !email || !phoneCountry || !phoneCountryCode || !phone) {
      return response(400, { error: 'brand_name, brand_website, email_id, and phone_number are required' });
    }

    const url = normalizeUrl(websiteInput);
    if (!url) {
      return response(400, { error: 'Please enter a valid website in the format https://yourbrand.com' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response(400, { error: 'Please enter a valid email address' });
    }
    const normalizedPhone = normalizePhone(phoneCountry, phoneCountryCode, phone);
    if (!normalizedPhone.ok) {
      return response(400, { error: 'Please enter a valid phone number for the selected country' });
    }

    if (formType === 'contact') {
      await saveToContactSheets({
        type: 'contact',
        brandName,
        website: url,
        email,
        phone: normalizedPhone.formatted,
        additionalNote
      });
      return response(200, {
        success: true,
        type: 'contact',
        message: 'We will get back to you soon.'
      });
    }

    const { scrapeFailed, text } = await scrapeWebsite(url);
    const context = text || `No website content available. Use your training knowledge about ${brandName}.`;

    const researchPrompt = `BRAND: ${brandName}
WEBSITE: ${url}
CONTEXT: ${context}

Return ONLY this JSON:
{
  "category": "<specific e.g. Indian D2C skincare brand, B2B SaaS CRM tool>",
  "topCompetitor": "<single most direct competitor>",
  "secondCompetitor": "<second competitor>",
  "q1": "<What are the best [actual category] options right now?>",
  "q2": "<I need [problem this brand solves] — what do you recommend?>",
  "q3": "<Tell me about ${brandName} — what do they do?>",
  "q4": "<Compare ${brandName} with [topCompetitor] — which is better?>",
  "q5": "<Is ${brandName} good for [use case]?>"
}
Replace ALL placeholders with real specific values. Queries must sound like real users typing into ChatGPT.`;

    const researchRaw = await callOpenAI(
      [
        { role: 'system', content: 'You are a brand research expert. Return ONLY valid JSON, no markdown, no extra text.' },
        { role: 'user', content: researchPrompt }
      ],
      0.25
    );
    const research = ensureResearchShape(researchRaw, brandName, url);

    const scoringPrompt = `BRAND: ${brandName}
WEBSITE: ${url}
CATEGORY: ${research.category}
COMPETITOR 1: ${research.topCompetitor}
COMPETITOR 2: ${research.secondCompetitor}
CONTEXT: ${context}
QUERIES:
Q1: ${research.q1}
Q2: ${research.q2}
Q3: ${research.q3}
Q4: ${research.q4}
Q5: ${research.q5}

Return ONLY this JSON:
{
  "brandName": "...",
  "category": "...",
  "topCompetitor": "...",
  "secondCompetitor": "...",
  "pillar1": {
    "signals": {
      "brandNameClarity": <0|2|4|6|8>,
      "categoryOwnership": <0|2|4|6|8>,
      "contentDepth": <0|2|4|6|8>,
      "externalSignalStrength": <0|2|4|6|8>,
      "competitiveDistinctiveness": <0|2|4|6|8>
    },
    "reasoning": "<2 sentences>"
  },
  "pillar2": {
    "signals": {
      "brandRepresentationAccuracy": <0|1|4|7|10>,
      "recommendationWorthiness": <0|1|4|7|10>,
      "competitivePositioningClarity": <0|1|4|7|10>
    },
    "reasoning": "<2 sentences>"
  },
  "pillar3": {
    "wikipedia": <0|5|10>,
    "thirdPartyCoverage": <0|5|10>,
    "structuredData": <0|5|10>,
    "reasoning": "<2 sentences>"
  },
  "oneSentenceSummary": "...",
  "topPriorityFix": "..."
}

SCORING RULES:
- Pillar 1 max 40: each of 5 signals scored ONLY 0/2/4/6/8
- Pillar 2 max 30: each of 3 signals scored ONLY 0/1/4/7/10
- Pillar 3 max 30: each of 3 items scored ONLY 0/5/10
- Be brutally honest. Most D2C brands score 25-55/100.
- Well-known brands with strong public authority should not be pinned into the 70s unless there are clear entity or coverage gaps.`;

    const scoreData = await callOpenAI(
      [
        { role: 'system', content: 'You are a precise GEO audit scoring engine. Return ONLY valid JSON. Never use markdown. Score prominent and well-established consumer brands generously when their public authority signals are strong.' },
        { role: 'user', content: scoringPrompt }
      ],
      0.15
    );

    const calculated = calculateScores(scoreData);
    const safeScoreData = {
      ...scoreData,
      brandName: String(scoreData?.brandName || brandName),
      category: String(scoreData?.category || research.category),
      topCompetitor: String(scoreData?.topCompetitor || research.topCompetitor),
      secondCompetitor: String(scoreData?.secondCompetitor || research.secondCompetitor),
      oneSentenceSummary: String(scoreData?.oneSentenceSummary || 'This brand has limited AI visibility signals and needs clearer entity, category, and authority coverage.'),
      topPriorityFix: String(scoreData?.topPriorityFix || 'Create a clear, structured brand and category page with proof points, comparisons, schema, and third-party citations.')
    };

    const sheetsPayload = {
      type: 'audit',
      brandName: safeScoreData.brandName,
      website: url,
      email,
      phone: normalizedPhone.formatted,
      additionalNote: '',
      fullScore: calculated.fullScore,
      p1Total: calculated.p1Total,
      p2Total: calculated.p2Total,
      p3Total: calculated.p3Total,
      rawTotal: calculated.rawTotal,
      authorityBonus: calculated.authorityBonus,
      verdictBand: calculated.verdictBand,
      summary: safeScoreData.oneSentenceSummary,
      topFix: safeScoreData.topPriorityFix,
      category: safeScoreData.category,
      competitor1: safeScoreData.topCompetitor,
      competitor2: safeScoreData.secondCompetitor
    };
    await saveToSheets(sheetsPayload);

    return response(200, {
      brandName: safeScoreData.brandName,
      website: url,
      email,
      phone: normalizedPhone.formatted,
      category: safeScoreData.category,
      competitor1: safeScoreData.topCompetitor,
      competitor2: safeScoreData.secondCompetitor,
      queries: research,
      scrapeFailed,
      fullScore: calculated.fullScore,
      verdictBand: calculated.verdictBand,
      p1Total: calculated.p1Total,
      p2Total: calculated.p2Total,
      p3Total: calculated.p3Total,
      rawTotal: calculated.rawTotal,
      authorityBonus: calculated.authorityBonus,
      p1Scores: calculated.p1Scores,
      p2Scores: calculated.p2Scores,
      wiki: calculated.wiki,
      thirdParty: calculated.thirdParty,
      structured: calculated.structured,
      pillar1: {
        signals: {
          brandNameClarity: calculated.p1Scores[0],
          categoryOwnership: calculated.p1Scores[1],
          contentDepth: calculated.p1Scores[2],
          externalSignalStrength: calculated.p1Scores[3],
          competitiveDistinctiveness: calculated.p1Scores[4]
        },
        reasoning: String(scoreData?.pillar1?.reasoning || '')
      },
      pillar2: {
        signals: {
          brandRepresentationAccuracy: calculated.p2Scores[0],
          recommendationWorthiness: calculated.p2Scores[1],
          competitivePositioningClarity: calculated.p2Scores[2]
        },
        reasoning: String(scoreData?.pillar2?.reasoning || '')
      },
      pillar3: {
        wikipedia: calculated.wiki,
        thirdPartyCoverage: calculated.thirdParty,
        structuredData: calculated.structured,
        reasoning: String(scoreData?.pillar3?.reasoning || '')
      },
      summary: safeScoreData.oneSentenceSummary,
      topFix: safeScoreData.topPriorityFix
    });
  } catch (error) {
    console.error('Audit failed:', error);
    return response(500, {
      error: 'Audit failed',
      message: error.message
    });
  }
};

/*
Google Sheets Apps Script webhook:

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  var headers = ['Timestamp','Type','Brand','Website','Email','Phone','Additional Note','Full Score','P1','P2','P3','Verdict','Summary','Top Fix','Category','Competitor 1','Competitor 2'];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    var currentHeader = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var needsHeaderUpdate = false;
    for (var h = 0; h < headers.length; h++) {
      if (String(currentHeader[h] || '') !== headers[h]) {
        needsHeaderUpdate = true;
        break;
      }
    }
    if (needsHeaderUpdate) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  var rows = sheet.getDataRange().getValues();
  if (String(data.type || '') === 'audit') {
    var key = String(data.website || '').trim().toLowerCase() + '|' + String(data.brandName || '').trim().toLowerCase();
    for (var i = 1; i < rows.length; i++) {
      var rowType = String(rows[i][1] || '').trim().toLowerCase();
      var existingKey = String(rows[i][3] || '').trim().toLowerCase() + '|' + String(rows[i][2] || '').trim().toLowerCase();
      if (rowType === 'audit' && existingKey === key) {
        return ContentService.createTextOutput(JSON.stringify({success:true, duplicate:true})).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  sheet.appendRow([
    new Date().toISOString(),
    data.type || 'audit',
    data.brandName,
    data.website,
    data.email,
    data.phone,
    data.additionalNote || '',
    data.fullScore || '',
    data.p1Total || '',
    data.p2Total || '',
    data.p3Total || '',
    data.verdictBand || '',
    data.summary || '',
    data.topFix || '',
    data.category || '',
    data.competitor1 || '',
    data.competitor2 || ''
  ]);
  return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = (e && e.parameter) || {};
  var brand = String(params.brand_name || '').trim().toLowerCase();
  var website = String(params.brand_website || '').trim().toLowerCase();
  if (!brand && !website) {
    return ContentService.createTextOutput(JSON.stringify({success:false, error:'brand_name or brand_website required'})).setMimeType(ContentService.MimeType.JSON);
  }
  var rows = sheet.getDataRange().getValues();
  var matches = [];
  for (var i = 1; i < rows.length; i++) {
    var rowType = String(rows[i][1] || '').trim().toLowerCase();
    if (rowType !== 'audit') continue;
    var rowBrand = String(rows[i][2] || '').trim().toLowerCase();
    var rowWebsite = String(rows[i][3] || '').trim().toLowerCase();
    if ((brand && rowBrand === brand) || (website && rowWebsite === website)) {
      matches.push({
        timestamp: rows[i][0],
        type: rows[i][1],
        brandName: rows[i][2],
        website: rows[i][3],
        email: rows[i][4],
        phone: rows[i][5],
        fullScore: rows[i][7],
        verdictBand: rows[i][11],
        category: rows[i][14]
      });
    }
  }
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    found: matches.length > 0,
    count: matches.length,
    matches: matches
  })).setMimeType(ContentService.MimeType.JSON);
}
*/
