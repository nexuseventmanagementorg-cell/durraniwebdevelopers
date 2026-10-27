# Ahlam Collections local preview

Manually authored, non-agent prototype for inquiry `DW-944529`. It is not the AI workforce deliverable and should not be used to judge whether the workforce can build an ecommerce store. Run it from this directory:

```powershell
python -m http.server 3001
```

Then open `http://localhost:3001`. The admin interface is `http://localhost:3001/admin.html`.

## Scope captured

- Pakistani traditional ladieswear catalog with stitched and unstitched choices.
- Illustrative international display at twice the Pakistan base and selectable destination/currency. Exchange rates are fixed examples, not live financial data.
- Customer design reference image picker with local-only browser preview and a 5 MB limit.
- Illustrative TCS/Leopards domestic and DHL/UPS international delivery choices.
- Price summary and mock checkout interaction.
- Admin dashboard visual preview for orders, custom designs, product catalog, delivery and sample analytics.
- Honest placeholder review section (does not invent customer testimonials or ratings).

## Explicit prototype limitations

- This is a static front-end draft, not a production-ready ecommerce system.
- No login/access control, server, database, customer image upload service, order persistence, review submission/verification, payment gateway, international FX feed, courier account/API, live tracking, stock control, or transactional email/WhatsApp is connected.
- Checkout does not accept or collect personal/payment information. The design image stays in the browser session and is not sent to a server.
- Product imagery uses remote Unsplash image URLs; no local image-generation service was available on the workstation when this draft was created. Images, catalog names, prices, reviews, analytics, and order examples are placeholders pending client approval and licensed business assets.
- PKR 320,000 is the inquiry's estimated project budget, not a product price list or proof of a paid advance. Admin approval/payment status must be verified before a real client delivery.
- This sample was explicitly authorized by the admin for prototype work. It does not authorize publication, customer contact, payment collection, courier bookings, or production deployment.

## Separate AI workforce run

The latest inquiry-specific local agent run is recorded as **failed**, not completed. Fashion UX Designer and Ecommerce Architect completed; Storefront Coder failed acceptance checks for the product catalog and explicit international 2x price disclosure after three attempts. Admin Dashboard Coder and QA Reviewer did not run. See `D:\website-projects-backup\Durrani_AI-Agents\projects\DW-944529-ahlam-collections-preview\latest-agent-run.json` and the referenced run folder. This manually authored preview remains separate and must not be presented as the agent output.
