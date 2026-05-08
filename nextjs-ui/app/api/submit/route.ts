import { NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';
import { EventHubProducerClient } from '@azure/event-hubs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const metadataStr = formData.get('metadata') as string | null;
    const docType = formData.get('docType') as string | null; // 'invoice' or 'receipt'

    if (!file || !metadataStr || !docType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const connectionString = process.env.BLOB_STORAGE_CONNECTION_STRING;
    // 1. Dynamically route to the correct Eventstream URL based on docType
    const eventHubConnectionString = docType === 'invoice'
      ? process.env.FABRIC_EVENTSTREAM_URL_INVOICE
      : process.env.FABRIC_EVENTSTREAM_URL_RECEIPT;

    if (!connectionString) {
      throw new Error('BLOB_STORAGE_CONNECTION_STRING is not configured');
    }
    // 2. Dynamically throw an error identifying exactly which variable is missing
    if (!eventHubConnectionString) {
      const missingEnv = docType === 'invoice'
        ? 'FABRIC_EVENTSTREAM_URL_INVOICE'
        : 'FABRIC_EVENTSTREAM_URL_RECEIPT';
      throw new Error(`${missingEnv} is not configured`);
    }

    const containerName = docType === 'invoice' ? 'invoices' : 'receipts';

    // --- 1. UPLOAD TO BLOB STORAGE ---
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure container exists
    await containerClient.createIfNotExists();

    const originalName = file.name;
    const ext = path.extname(originalName) || '';
    const baseName = path.basename(originalName, ext);

    // Generate unique name
    const timestamp = Date.now();
    const uniqueFileName = `${baseName}_${timestamp}${ext}`;

    const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: file.type }
    });

    const blobUrl = blockBlobClient.url;

    // --- 2. FLATTEN AND STREAM TO FABRIC ---
    const rawData = JSON.parse(metadataStr);
    const lineItems = rawData.lineItems || [];

    // Build the base row with ONLY fields relevant to this document type
    const buildBaseRow = () => {
      const common = {
        docType,
        sourceFile: uniqueFileName,
        blobUrl,
      };

      if (docType === 'invoice') {
        return {
          ...common,
          invoiceId: rawData.invoiceId || null,
          currencyCode: rawData.currencyCode || null,
          invoiceDate: rawData.invoiceDate || null,
          dueDate: rawData.dueDate || null,
          purchaseOrder: rawData.purchaseOrder || null,
          paymentTerm: rawData.paymentTerm || null,
          vendorName: rawData.vendorName || null,
          vendorAddress: rawData.vendorAddress || null,
          vendorTaxId: rawData.vendorTaxId || null,
          customerName: rawData.customerName || null,
          customerId: rawData.customerId || null,
          customerAddress: rawData.customerAddress || null,
          customerTaxId: rawData.customerTaxId || null,
          billingAddress: rawData.billingAddress || null,
          shippingAddress: rawData.shippingAddress || null,
          subTotal: rawData.subTotal ?? null,
          totalDiscount: rawData.totalDiscount ?? null,
          totalTax: rawData.totalTax ?? null,
          invoiceTotal: rawData.invoiceTotal ?? null,
          amountDue: rawData.amountDue ?? null,
          previousUnpaidBalance: rawData.previousUnpaidBalance ?? null,
          serviceStartDate: rawData.serviceStartDate || null,
          serviceEndDate: rawData.serviceEndDate || null,
        };
      } else {
        return {
          ...common,
          merchantName: rawData.merchantName || null,
          merchantPhone: rawData.merchantPhone || null,
          merchantAddress: rawData.merchantAddress || null,
          transactionDate: rawData.transactionDate || null,
          transactionTime: rawData.transactionTime || null,
          receiptType: rawData.receiptType || null,
          countryRegion: rawData.countryRegion || null,
          currencyCode: rawData.currencyCode || null,
          subtotal: rawData.subtotal ?? null,
          totalTax: rawData.totalTax ?? null,
          tip: rawData.tip ?? null,
          total: rawData.total ?? null,
          arrivalDate: rawData.arrivalDate || null,
          departureDate: rawData.departureDate || null,
          balance: rawData.balance ?? null,
        };
      }
    };

    // Create an array of flat objects
    const flattenedEvents = [];
    const baseRow = buildBaseRow();

    console.log(`[FABRIC] Processing ${docType}. Base row keys:`, Object.keys(baseRow));

    if (lineItems.length === 0) {
      // No line items — send one row with empty line item fields
      const event = {
        ...baseRow,
        lineItemId: `${docType}-${timestamp}-0`,
        itemDescription: null,
        itemQuantity: null,
        itemUnitPrice: null,
        itemAmount: null,
        itemTax: null,
        itemProductCode: null,
      };
      console.log(`[FABRIC] Sending single row event for ${docType}`);
      flattenedEvents.push(event);
    } else {
      // Flatten line items into multiple rows
      lineItems.forEach((item: any, index: number) => {
        const event = {
          ...baseRow,
          lineItemId: `${docType}-${timestamp}-${index + 1}`,
          itemDescription: item.description || null,
          itemQuantity: item.quantity ?? null,
          itemUnitPrice: item.unitPrice ?? item.price ?? null,
          itemAmount: item.amount ?? item.totalPrice ?? null,
          itemTax: item.tax ?? null,
          itemProductCode: item.productCode || null,
        };
        if (index === 0) console.log(`[FABRIC] Sending multi-row event (row 1) for ${docType}. Keys:`, Object.keys(event));
        flattenedEvents.push(event);
      });
    }

    // --- 3. SAVE JSON TO BLOB STORAGE ---
    const jsonContainerName = docType === 'invoice' ? 'invoices-json' : 'receipts-json';
    const jsonContainerClient = blobServiceClient.getContainerClient(jsonContainerName);
    await jsonContainerClient.createIfNotExists();
    
    const jsonBlobName = `${baseName}_${timestamp}.json`;
    const jsonBlockBlobClient = jsonContainerClient.getBlockBlobClient(jsonBlobName);
    
    const jsonBuffer = Buffer.from(JSON.stringify(flattenedEvents, null, 2));
    await jsonBlockBlobClient.uploadData(jsonBuffer, {
      blobHTTPHeaders: { blobContentType: 'application/json' }
    });
    console.log(`[BLOB] Uploaded JSON to ${jsonContainerName}/${jsonBlobName}`);

    // Send the batch to Fabric Eventstream
    const producer = new EventHubProducerClient(eventHubConnectionString);
    const batch = await producer.createBatch();

    for (const event of flattenedEvents) {
      const isAdded = batch.tryAdd({ body: event });
      if (!isAdded) {
        console.warn('Event too large to fit in batch');
      }
    }

    await producer.sendBatch(batch);
    await producer.close();

    return NextResponse.json({
      success: true,
      blobUrl,
      fileName: uniqueFileName,
      container: containerName,
      message: `Uploaded to Blob and streamed ${flattenedEvents.length} rows to Fabric successfully.`,
    });

  } catch (error: any) {
    console.error('Submit Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
