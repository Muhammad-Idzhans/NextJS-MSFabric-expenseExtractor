import { NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';

export async function GET() {
  try {
    const connectionString = process.env.BLOB_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return NextResponse.json({ error: 'BLOB_STORAGE_CONNECTION_STRING not configured' }, { status: 500 });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient('invoices-json');

    // Ensure container exists so it doesn't crash if empty
    const exists = await containerClient.exists();
    if (!exists) {
      return NextResponse.json([]);
    }

    const invoices = [];
    
    // List all blobs
    for await (const blob of containerClient.listBlobsFlat()) {
      if (blob.name.endsWith('.json')) {
        const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
        const downloadBlockBlobResponse = await blockBlobClient.download(0);
        
        // Read stream to string
        const downloadedStr = await new Promise<string>((resolve, reject) => {
          let str = '';
          downloadBlockBlobResponse.readableStreamBody?.on('data', (data) => {
            str += data.toString();
          });
          downloadBlockBlobResponse.readableStreamBody?.on('end', () => resolve(str));
          downloadBlockBlobResponse.readableStreamBody?.on('error', reject);
        });

        try {
          const events = JSON.parse(downloadedStr);
          if (events && events.length > 0) {
            // We only need the first row to represent the invoice header in the table
            const headerRow = events[0];
            
            invoices.push({
              id: headerRow.sourceFile?.split('.')[0] || blob.name,
              invoiceId: headerRow.invoiceId || 'Unknown ID',
              purchaseOrder: headerRow.purchaseOrder || '',
              vendorName: headerRow.vendorName || 'Unknown Vendor',
              vendorAddress: headerRow.vendorAddress || '',
              customerName: headerRow.customerName || 'Unknown Customer',
              invoiceDate: headerRow.invoiceDate || 'Unknown Date',
              dueDate: headerRow.dueDate || 'Unknown Date',
              currencyCode: headerRow.currencyCode || 'MYR',
              invoiceTotal: headerRow.invoiceTotal || 0,
              fileName: headerRow.sourceFile || blob.name,
              blobUrl: headerRow.blobUrl || '',
              status: 'Synced'
            });
          }
        } catch (parseError) {
          console.error(`Failed to parse blob ${blob.name}:`, parseError);
        }
      }
    }

    // Sort by most recent (descending) based on timestamp in filename if possible
    invoices.sort((a, b) => {
      const timeA = a.fileName.match(/_(\d+)\./)?.[1] || 0;
      const timeB = b.fileName.match(/_(\d+)\./)?.[1] || 0;
      return Number(timeB) - Number(timeA);
    });

    return NextResponse.json(invoices);

  } catch (error: any) {
    console.error('Error fetching invoices from blob:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
