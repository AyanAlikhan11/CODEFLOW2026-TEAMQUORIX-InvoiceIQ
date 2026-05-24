EXTRACTION_PROMPT = """
You are an expert invoice and receipt analyst. Carefully examine this invoice/bill image and extract ALL available information.

Return ONLY a valid JSON object — no markdown fences, no preamble — with this exact schema:

{
  "merchant_name": "string or null",
  "merchant_address": "string or null",
  "merchant_phone": "string or null",
  "invoice_number": "string or null",
  "date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "subtotal": number or null,
  "tax": number or null,
  "discount": number or null,
  "tip": number or null,
  "total_amount": number or null,
  "currency": "ISO 4217 code e.g. USD INR EUR or null",
  "payment_method": "Cash/Card/UPI/Online/etc. or null",
  "category": "one of: Food, Shopping, Travel, Medical, Utilities, Entertainment, Fuel, Education, Subscriptions, Personal Care, Electronics, Home & Garden, Professional Services, Consulting, Legal & Compliance, Marketing & Advertising, Logistics & Courier, Insurance, Real Estate & Rent, Financial Services, IT & Software, Construction & Contracting, Events & Catering, Agriculture, Automotive, Other",
  "category_confidence": "High/Medium/Low",
  "category_reason": "one sentence explaining why you chose this category",
  "purchased_items": [
    {
      "name": "string",
      "quantity": number or null,
      "unit_price": number or null,
      "total_price": number or null
    }
  ],
  "raw_text": "key visible text only — merchant, dates, amounts, item names. Do NOT copy the entire document verbatim. Max 300 characters."
}

Categorization rules — pick the MOST SPECIFIC matching category:
- Food: restaurants, cafes, grocery stores, food delivery, bakeries, canteens
- Shopping: clothing, general merchandise, e-commerce, department stores, gifts
- Travel: airlines, hotels, taxis, ride-share, trains, buses, toll, travel agencies
- Medical: hospitals, pharmacies, clinics, labs, dental, vision, medical equipment
- Utilities: electricity, water, gas, internet, phone/mobile bill, broadband
- Entertainment: movies, concerts, sports events, gaming, amusement parks, streaming services
- Fuel: petrol, diesel, CNG, EV charging stations
- Education: schools, colleges, online courses, books, stationery, tuition
- Subscriptions: SaaS tools, magazines, membership fees, annual plans (non-software)
- Personal Care: salons, spas, beauty products, gym, fitness
- Electronics: gadgets, appliances, computer hardware, mobile phones, accessories
- Home & Garden: furniture, hardware, home decor, gardening, cleaning services
- Professional Services: data analysis, business analytics, MIS reporting, financial review, auditing, accounting, bookkeeping, reconciliation, payroll, tax consultation, invoice processing, dashboard/report creation — any structured analytical or financial back-office work billed by hours or deliverables
- Consulting: management consulting, strategy consulting, HR consulting, IT consulting, business advisory, project management consulting
- Legal & Compliance: lawyers, legal fees, notary, compliance audits, trademark/patent filing, court fees, regulatory filings
- Marketing & Advertising: digital marketing, SEO, social media, print ads, PR agencies, branding, creative agencies, media buying
- Logistics & Courier: courier, freight, shipping, warehousing, last-mile delivery, cargo
- Insurance: life, health, vehicle, property, business insurance premiums
- Real Estate & Rent: office rent, co-working space, property purchase, brokerage, lease
- Financial Services: banking fees, loan processing, investment advisory, brokerage, forex, factoring
- IT & Software: software licenses, cloud hosting (AWS/Azure/GCP), IT support, web development, app development, cybersecurity
- Construction & Contracting: civil works, interior design, architecture, renovation, plumbing, electrical contracting
- Events & Catering: event planning, catering, venue hire, AV equipment, wedding services
- Agriculture: seeds, fertilizers, farm equipment, irrigation, crop insurance
- Automotive: car purchase, vehicle servicing, spare parts, vehicle insurance (use Insurance if insurance-only)
- Other: only if absolutely nothing above fits

Be precise with amounts — use the exact numbers shown, do not round.
""".strip()