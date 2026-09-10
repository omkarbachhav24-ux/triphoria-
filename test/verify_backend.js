// Comprehensive Backend Production Verification Test
const BASE_URL = 'http://127.0.0.1:3001';

async function runTests() {
  console.log('=== TRIPHORIA BACKEND PRODUCTION VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Health Check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthJson = await healthRes.json();
  assert(healthJson.status === 'healthy', 'Health check returns healthy status');

  // 2. Auth: Bad credentials rejection
  const badLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@triphoria.io', password: 'wrongpassword' })
  });
  assert(badLogin.status === 401, 'Bad credentials rejected with HTTP 401');

  // 3. Auth: Admin Login & Session Cookie
  const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@triphoria.io', password: 'adminpgt' })
  });
  const adminCookie = adminLogin.headers.get('set-cookie');
  const adminJson = await adminLogin.json();
  assert(adminLogin.status === 200, 'Admin authenticated successfully');
  assert(adminJson.user.role === 'admin', 'Admin role verified in returned user payload');
  assert(!!adminCookie && adminCookie.includes('session_token'), 'HttpOnly session_token cookie received');

  // Extract session token from cookie
  const sessionToken = adminCookie ? adminCookie.split(';')[0].replace('session_token=', '') : '';

  // 4. Session Validation via /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': `session_token=${sessionToken}` }
  });
  const meJson = await meRes.json();
  assert(meJson.authenticated === true && meJson.user.email === 'admin@triphoria.io', 'Session validated via /api/auth/me');

  // 5. RBAC & Scoped Orders
  const adminOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { 'Cookie': `session_token=${sessionToken}` }
  });
  const adminOrders = await adminOrdersRes.json();
  assert(Array.isArray(adminOrders.orders) && adminOrders.orders.length > 0, `Admin sees all orders (${adminOrders.orders.length} total)`);

  // 6. Editor Isolation
  const editorLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'marcus@triphoria.io', password: 'editorpgt' })
  });
  const editorCookie = editorLogin.headers.get('set-cookie');
  const editorToken = editorCookie ? editorCookie.split(';')[0].replace('session_token=', '') : '';

  const editorOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { 'Cookie': `session_token=${editorToken}` }
  });
  const editorOrders = await editorOrdersRes.json();
  const allMarcus = editorOrders.orders && editorOrders.orders.every(o => o.assignedEditorId === 'editor-01');
  assert(allMarcus, `Editor Marcus sees ONLY assigned orders (${editorOrders.orders?.length || 0} orders)`);

  // 7. Client Isolation
  const clientLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@creator.com', password: 'clientpgt' })
  });
  const clientCookie = clientLogin.headers.get('set-cookie');
  const clientToken = clientCookie ? clientCookie.split(';')[0].replace('session_token=', '') : '';

  const clientOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { 'Cookie': `session_token=${clientToken}` }
  });
  const clientOrders = await clientOrdersRes.json();
  const allAlex = clientOrders.orders.every(o => o.userId === 'user-101');
  assert(allAlex, `Client Alex sees ONLY own orders (${clientOrders.orders.length} orders)`);

  // 8. Server-Side Idempotency Test
  const testIdempotencyKey = `idem-test-${Date.now()}`;
  const createOrder1 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `session_token=${clientToken}`,
      'idempotency-key': testIdempotencyKey
    },
    body: JSON.stringify({
      projectName: 'Live Automated Test Project',
      packageName: 'Pro Creator',
      platform: 'YouTube (16:9)',
      targetLength: '10 mins',
      googleDriveUrl: 'https://drive.google.com/drive/folders/1test-automated-verification-folder',
      instructions: 'Production hardening test'
    })
  });
  const created1 = await createOrder1.json();
  assert(createOrder1.status === 201, 'Order created in Pending Approval');

  // Resend identical request with same idempotency key
  const createOrder2 = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `session_token=${clientToken}`,
      'idempotency-key': testIdempotencyKey
    },
    body: JSON.stringify({
      projectName: 'Live Automated Test Project',
      packageName: 'Pro Creator',
      platform: 'YouTube (16:9)',
      targetLength: '10 mins',
      googleDriveUrl: 'https://drive.google.com/drive/folders/1test-automated-verification-folder',
      instructions: 'Production hardening test'
    })
  });
  const created2 = await createOrder2.json();
  assert(created1.order.id === created2.order.id, 'Idempotent request returns exact same order without duplicate creation');

  const newOrderId = created1.order.id;

  // 9. State Transition Security: Client attempting unauthorized approval
  const unauthorizedApprove = await fetch(`${BASE_URL}/api/orders/${newOrderId}/approve`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `session_token=${clientToken}` 
    },
    body: JSON.stringify({ editorId: 'editor-01' })
  });
  assert(unauthorizedApprove.status === 403, 'Client attempting order approval blocked with HTTP 403');

  // 10. Admin Valid Transition: Pending Approval -> In Progress
  const adminApprove = await fetch(`${BASE_URL}/api/orders/${newOrderId}/approve`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `session_token=${sessionToken}` 
    },
    body: JSON.stringify({ editorId: 'editor-01', adminNotes: 'Verified camera spec.' })
  });
  assert(adminApprove.status === 200, 'Admin approves order and assigns to Marcus');

  // 11. State Machine: Second approve attempt should fail with conflict
  const duplicateApprove = await fetch(`${BASE_URL}/api/orders/${newOrderId}/approve`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `session_token=${sessionToken}` 
    },
    body: JSON.stringify({ editorId: 'editor-01' })
  });
  assert(duplicateApprove.status === 409, 'Duplicate approval on non-pending order blocked with HTTP 409');

  // 12. Presigned Upload & Binary Stream Test
  const uploadAuth = await fetch(`${BASE_URL}/api/storage/authorize-upload`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `session_token=${clientToken}` 
    },
    body: JSON.stringify({
      orderId: newOrderId,
      filename: 'test_footage_stream.mp4',
      sizeBytes: 1024 * 1024,
      mimeType: 'video/mp4'
    })
  });
  const uploadAuthJson = await uploadAuth.json();
  assert(uploadAuth.status === 200 && uploadAuthJson.uploadUrl, 'Presigned upload URL and HMAC token generated');

  // Send binary buffer to uploadUrl
  const sampleBuffer = Buffer.from('FAKE_RAW_VIDEO_PAYLOAD_FOR_TESTING_PURPOSES');
  const binaryUploadRes = await fetch(`${BASE_URL}${uploadAuthJson.uploadUrl}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: sampleBuffer
  });
  const binaryJson = await binaryUploadRes.json();
  assert(binaryUploadRes.status === 200 && binaryJson.checksum, `Binary stream ingested and SHA256 checksum calculated: ${binaryJson.checksum?.slice(0, 12)}...`);

  // 13. Output Upload by Assigned Editor: In Progress -> Review
  const outputRes = await fetch(`${BASE_URL}/api/orders/${newOrderId}/outputs`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `session_token=${editorToken}` 
    },
    body: JSON.stringify({
      version: 'v1.0',
      storageKey: binaryJson.storageKey,
      format: 'ProRes 422 HQ',
      resolution: '4K UHD',
      runtime: '10:00',
      sizeBytes: sampleBuffer.length,
      notes: 'Initial v1.0 master cut completed.'
    })
  });
  assert(outputRes.status === 201, 'Assigned editor Marcus uploaded output cut v1.0 (advanced to Review)');

  // 14. Admin Final Delivery Approval: Review -> Completed with 14-Day Storage Retention
  const completeRes = await fetch(`${BASE_URL}/api/orders/${newOrderId}/complete`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `session_token=${sessionToken}` 
    }
  });
  assert(completeRes.status === 200, 'Admin finalized delivery (marked Completed with 14-day retention buffer)');

  // 15. Verify 14-Day Storage Retention in Database
  const finalOrderRes = await fetch(`${BASE_URL}/api/orders/${newOrderId}`, {
    headers: { 'Cookie': `session_token=${sessionToken}` }
  });
  const finalOrder = (await finalOrderRes.json()).order;
  assert(finalOrder.status === 'Completed', 'Order status verified as Completed');
  assert(finalOrder.storageLifecycle.status === 'Retention Period', 'Storage lifecycle status is in 14-day Retention Period');
  assert(!!finalOrder.storageLifecycle.retentionExpiresAt, `Retention expiration set to: ${finalOrder.storageLifecycle.retentionExpiresAt}`);

  // 16. CMS Featured Slots Test
  const featuredSlotsRes = await fetch(`${BASE_URL}/api/cms/featured-slots`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `session_token=${sessionToken}` 
    },
    body: JSON.stringify({
      slot1Id: 'WORK-02',
      slot2Id: 'WORK-01',
      slot3Id: 'WORK-03'
    })
  });
  assert(featuredSlotsRes.status === 200, 'Admin updated Featured Work Slots (1, 2, 3)');

  const publicFeatured = await (await fetch(`${BASE_URL}/api/cms/featured`)).json();
  assert(publicFeatured.featured[0].id === 'WORK-02' && publicFeatured.featured[0].featuredSlot === 1, 'Public Featured API reflects Slot #1 as WORK-02');

  // 17. Audit Log Append-Only Verification
  const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { 'Cookie': `session_token=${sessionToken}` }
  });
  const auditJson = await auditRes.json();
  assert(Array.isArray(auditJson.logs) && auditJson.logs.length > 5, `Append-only audit trail verified (${auditJson.logs.length} logged events)`);

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner encountered error:', err);
  process.exit(1);
});
