import { androidpublisher_v3, google } from 'googleapis';

function getServiceAccountJson() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is required');
  return JSON.parse(raw);
}

async function getPublisherClient() {
  const credentials = getServiceAccountJson();
  const auth = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    ['https://www.googleapis.com/auth/androidpublisher'],
  );
  await auth.authorize();
  return google.androidpublisher({ version: 'v3', auth });
}

export function packageNameFromEnv(fallback?: string) {
  return process.env.GOOGLE_PLAY_PACKAGE_NAME || fallback || '';
}

export async function verifyProductPurchase(params: {
  packageName: string;
  productId: string;
  purchaseToken: string;
}) {
  const publisher = await getPublisherClient();
  const result = await publisher.purchases.productsv2.getproductpurchasev2({
    packageName: params.packageName,
    productId: params.productId,
    token: params.purchaseToken,
  });

  const data = result.data as androidpublisher_v3.Schema$ProductPurchaseV2;
  const purchaseState = data.purchaseStateContext?.purchaseState;
  const acknowledged = data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';
  const valid = purchaseState === 'PURCHASED' || purchaseState === 'PURCHASE_STATE_PURCHASED';

  return {
    valid,
    acknowledged,
    raw: data,
  };
}
