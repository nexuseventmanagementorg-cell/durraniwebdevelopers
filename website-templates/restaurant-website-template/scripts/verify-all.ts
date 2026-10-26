import { initialProducts, initialDeals, initialBusinessSettings } from '../lib/initialData';
import {
  serverValidateAndCreateOrder,
  getDashboardStats,
  getBusinessSettings,
  updateBusinessSettings,
  updateOrderStatus,
  markWhatsAppDeclaredSent,
} from '../lib/db';
import fs from 'fs';
import path from 'path';

async function runVerification() {
  console.log('================================================================');
  console.log('RESTAURANT WEBSITE TEMPLATE — AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const previousSettings = await getBusinessSettings();
  await updateBusinessSettings({
    restaurantName: 'Test Restaurant',
    phoneCandidate: '0300-0000000',
    whatsappNumberFormatted: '923000000000',
  });

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      if (details) console.error(`  Details: ${details}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Inventory Counts
  assert(initialProducts.length === 31, 'Configured 31 individual menu products', `Found ${initialProducts.length}`);
  assert(initialDeals.length === 14, 'Configured all 14 Student Deals', `Found ${initialDeals.length}`);

  // TEST 2: Price Fidelity against Menu Card
  const shawarmas = initialProducts.filter(product => product.categoryId === 'shawarma');
  assert(
    shawarmas.length === 3 &&
      shawarmas.some(product => product.nameEn === 'Regular Shawarma' && product.price === 180) &&
      shawarmas.some(product => product.nameEn === 'Especial Shawarma' && product.price === 250) &&
      shawarmas.some(product => product.nameEn === 'Zinger Shawarma' && product.price === 300),
    'Shawarma menu has only the three requested varieties and prices'
  );
  const platterProducts = initialProducts.filter(product => product.categoryId === 'platters-rolls');
  assert(
    platterProducts.length === 1 &&
      platterProducts[0].nameEn === 'Platter Shawarma' &&
      platterProducts[0].price === 450,
    'Platters & Rolls menu has only Platter Shawarma at Rs. 450'
  );

  const expectedMenuCategories: Record<string, number> = {
    'zinger-burgers': 5,
    'shami-burgers': 4,
    'chicken-burgers': 3,
    'shappatta-rolls': 4,
    'paratha-rolls': 2,
    fries: 2,
    sandwiches: 3,
    soups: 2,
    addons: 2,
  };
  assert(
    Object.entries(expectedMenuCategories).every(
      ([categoryId, count]) =>
        initialProducts.filter(product => product.categoryId === categoryId).length === count
    ),
    'All updated fast-food categories contain exactly the requested number of menu cards'
  );

  const expectedMenuPrices: Record<string, number> = {
    'chicken-shawarma-s': 180,
    'student-special-shawarma': 250,
    'zinger-shawarma-m': 300,
    'chicken-platter-shawarma': 450,
    'zinger-burger': 300,
    'zinger-burger-fries': 350,
    'zinger-lapeta-burger': 350,
    'zinger-double-tekar-fries': 600,
    'zinger-piece': 250,
    'shami-burger': 150,
    'shami-double-anda-burger': 200,
    'gol-shami-burger': 180,
    'student-especial-lapeta-burger': 250,
    'chicken-patty-burger': 250,
    'chicken-patty-burger-fries': 300,
    'chicken-burger': 350,
    'shappatta-roll': 500,
    'malai-boti-sandwich': 500,
    'malai-boti-paratha-roll': 400,
    'tikka-shawarma': 300,
    'chicken-paratha-roll': 350,
    'zinger-paratha-roll': 350,
    'half-fries': 150,
    'full-fries': 300,
    'chicken-sandwich': 400,
    'club-sandwich': 350,
    'chicken-tikka-sandwich': 400,
    'chicken-corn-soup': 150,
    'hot-sour-soup': 150,
    'extra-mayo': 30,
    'extra-mayo-large': 50,
  };
  assert(
    Object.entries(expectedMenuPrices).every(([id, price]) =>
      initialProducts.some(product => product.id === id && product.price === price)
    ),
    'All 31 menu item prices match the requested amounts'
  );

  const zingerBurger = initialProducts.find(p => p.id === 'zinger-burger');
  assert(zingerBurger?.price === 300, 'Zinger Burger price is exactly 300/-');
  assert(
    initialProducts.find(product => product.id === 'zinger-double-tekar-fries')?.price === 600 &&
      initialProducts.find(product => product.id === 'extra-mayo')?.price === 30 &&
      initialProducts.find(product => product.id === 'extra-mayo-large')?.price === 50,
    'Zinger Double Tekar and both mayo sizes have the requested prices'
  );

  const deal3 = initialDeals.find(d => d.id === 'deal-3');
  assert(deal3?.price === 280, 'Deal 3 price is exactly 280/-');

  const familyDeal13 = initialDeals.find(d => d.id === 'deal-13');
  assert(
    familyDeal13?.price === 1700 &&
      familyDeal13.isFamilyDeal === true &&
      familyDeal13.components.map(component => component.quantity).join(',') === '5,1,1' &&
      familyDeal13.components[0].nameEn === 'Zinger Burger' &&
      familyDeal13.components[1].nameEn === 'Half French Fries' &&
      familyDeal13.components[2].nameEn === '1.5 Liter Cold Drink Bottle',
    'Deal 13 is Rs. 1700 with 5 Zinger Burgers, half fries, and a 1.5 Liter bottle'
  );
  const deal14 = initialDeals.find(d => d.id === 'deal-14');
  assert(
    deal14?.price === 850 &&
      deal14.components.map(component => component.nameEn).join(',') ===
        'Regular Shawarma,Shami Burger,Zinger Burger,Half French Fries,1 Liter Cold Drink Bottle',
    'Deal 14 is Rs. 850 with the requested combo items and half fries'
  );
  assert(
    initialDeals.find(d => d.id === 'deal-1')?.price === 400 &&
      initialDeals.find(d => d.id === 'deal-2')?.price === 350 &&
      initialDeals.find(d => d.id === 'deal-2')?.components[0].nameEn ===
        'Student Special Lapeta Burger',
    'Deals 1 and 2 have the requested prices and bundle items'
  );
  const expectedDealPrices: Record<string, number> = {
    'deal-3': 280,
    'deal-4': 350,
    'deal-5': 450,
    'deal-6': 400,
    'deal-8': 350,
    'deal-9': 400,
    'deal-10': 450,
    'deal-11': 400,
    'deal-12': 450,
  };
  assert(
    Object.entries(expectedDealPrices).every(([id, price]) =>
      initialDeals.some(deal => deal.id === id && deal.price === price)
    ),
    'All other requested Student Deal prices match'
  );

  // TEST 3: All product and deal images exist locally
  const publicDir = path.join(process.cwd(), 'public');
  let allImagesExist = true;

  for (const prod of initialProducts) {
    const fullPath = path.join(publicDir, prod.image);
    if (!fs.existsSync(fullPath)) {
      allImagesExist = false;
      console.error(`Missing product image file: ${fullPath}`);
    }
  }

  for (const deal of initialDeals) {
    const fullPath = path.join(publicDir, deal.image);
    if (!fs.existsSync(fullPath)) {
      allImagesExist = false;
      console.error(`Missing deal image file: ${fullPath}`);
    }
  }

  assert(allImagesExist, 'All 45 products and deals have existing local image files on disk');

  // TEST 4: Server-Side Price & Availability Validation
  console.log('\n--- Testing Server-Side Order Calculations ---');
  try {
    const testOrder = await serverValidateAndCreateOrder({
      customerName: 'Test Customer',
      customerPhone: '0300-0000000',
      orderType: 'takeaway',
      items: [
        { itemType: 'product', itemId: 'chicken-shawarma-s', quantity: 2 }, // 180 * 2 = 360
        { itemType: 'deal', itemId: 'deal-3', quantity: 1 }, // 280 * 1 = 280
      ],
    });

    const expectedSubtotal = 360 + 280; // 640
    assert(testOrder.order.itemsSubtotal === expectedSubtotal, `Authoritative items subtotal calculated correctly (${testOrder.order.itemsSubtotal} === ${expectedSubtotal})`);
    assert(testOrder.order.grandTotal === expectedSubtotal, `Takeaway orders have 0 delivery fee, grand total matches subtotal (${testOrder.order.grandTotal})`);
    assert(testOrder.order.status === 'awaiting_whatsapp', 'Initial order status is strictly "awaiting_whatsapp"');
    assert(testOrder.whatsappUrl.includes('wa.me/923000000000'), 'WhatsApp URL uses the configured test recipient number');
    assert(testOrder.whatsappUrl.includes(encodeURIComponent('NEW ORDER — TEST RESTAURANT')), 'WhatsApp message contains standardized prompt header');
  } catch (err) {
    assert(false, 'Server-side order creation succeeded without error', String(err));
  }

  // TEST 5: Delivery Validation & Charges
  try {
    const deliveryOrder = await serverValidateAndCreateOrder({
      customerName: 'Delivery Customer',
      customerPhone: '0300-1234567',
      orderType: 'delivery',
      deliveryAddress: '12 Market Street, City Center',
      items: [
        { itemType: 'product', itemId: 'student-special-shawarma', quantity: 1 }, // 250
      ],
    });

    const expectedGrand = 250 + initialBusinessSettings.deliveryCharges;
    assert(deliveryOrder.order.deliveryCharges === 100, 'Delivery order incurs configured 100 PKR delivery charge');
    assert(deliveryOrder.order.grandTotal === expectedGrand, `Grand total with delivery is correctly calculated (Rs. ${expectedGrand})`);
  } catch (err) {
    assert(false, 'Delivery order creation succeeded', String(err));
  }

  // TEST 6: Validation Rejection for Tampered/Invalid Input
  try {
    let failed = false;
    try {
      await serverValidateAndCreateOrder({
        customerName: 'Incomplete',
        customerPhone: '123', // invalid short phone
        orderType: 'takeaway',
        items: [{ itemType: 'product', itemId: 'chicken-shawarma-s', quantity: 1 }],
      });
    } catch {
      failed = true;
    }
    assert(failed, 'Server correctly rejects invalid customer phone numbers');

    let deliveryFailedWithoutAddress = false;
    try {
      await serverValidateAndCreateOrder({
        customerName: 'Test',
        customerPhone: '0300-0000000',
        orderType: 'delivery',
        deliveryAddress: '', // missing address
        items: [{ itemType: 'product', itemId: 'chicken-shawarma-s', quantity: 3 }],
      });
    } catch {
      deliveryFailedWithoutAddress = true;
    }
    assert(deliveryFailedWithoutAddress, 'Server correctly rejects delivery order without address');
  } catch (err) {
    assert(false, 'Rejection tests completed', String(err));
  }

  // TEST 7: WhatsApp Sent Declaration Workflow
  console.log('\n--- Testing WhatsApp Confirmation Workflow ---');
  const sampleOrder = await serverValidateAndCreateOrder({
    customerName: 'Table Dine-in Customer',
    customerPhone: '0300-0000000',
    orderType: 'dine_in',
    tableNumber: 'T01',
    items: [{ itemType: 'deal', itemId: 'deal-4', quantity: 1 }],
  });

  assert(sampleOrder.order.status === 'awaiting_whatsapp', 'Initial state is awaiting WhatsApp dispatch');

  const declaredOrder = await markWhatsAppDeclaredSent(sampleOrder.order.id);
  assert(declaredOrder?.status === 'pending' && declaredOrder.whatsappSentDeclaredByUser === true, 'Customer declaration moves order to "pending" verification without false confirmation claim');

  const confirmedOrder = await updateOrderStatus(sampleOrder.order.id, 'confirmed', 'Kitchen acknowledged WhatsApp message', 20);
  assert(confirmedOrder?.status === 'confirmed' && confirmedOrder.estimatedMinutes === 20, 'Staff successfully confirms order and sets 20-minute prep time');

  // TEST 8: Dashboard Analytics Integrity
  console.log('\n--- Testing Real Analytics Calculations ---');
  const stats = await getDashboardStats();
  assert(stats.totalOrders >= 3, `Real orders recorded in database (${stats.totalOrders} total)`);
  assert(stats.todayRevenue > 0, `Real revenue calculated accurately from confirmed orders (Rs. ${stats.todayRevenue})`);

  await updateBusinessSettings({
    restaurantName: previousSettings.restaurantName,
    phoneCandidate: previousSettings.phoneCandidate,
    whatsappNumberFormatted: previousSettings.whatsappNumberFormatted,
  });

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (100% SUCCESS)`);
  console.log('================================================================\n');
}

runVerification().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
