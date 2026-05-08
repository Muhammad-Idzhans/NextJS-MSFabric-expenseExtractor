import { NextResponse } from 'next/server';
import { BlobServiceClient } from '@azure/storage-blob';

export async function GET() {
  try {
    const connectionString = process.env.BLOB_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return NextResponse.json({ error: 'BLOB_STORAGE_CONNECTION_STRING not configured' }, { status: 500 });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient('receipts-json');

    // Ensure container exists so it doesn't crash if empty
    const exists = await containerClient.exists();
    if (!exists) {
      return NextResponse.json([]);
    }

    const receipts = [];
    
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
            // We only need the first row to represent the receipt header in the table
            const headerRow = events[0];
            
            receipts.push({
              id: headerRow.sourceFile?.split('.')[0] || blob.name,
              merchantName: headerRow.merchantName || 'Unknown Merchant',
              merchantAddress: headerRow.merchantAddress || '',
              transactionDate: headerRow.transactionDate || 'Unknown Date',
              category: headerRow.receiptType || 'Other',
              currencyCode: headerRow.currencyCode || 'MYR',
              total: headerRow.total || 0,
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
    receipts.sort((a, b) => {
      // Assuming filename is something like name_timestamp.ext
      const timeA = a.fileName.match(/_(\d+)\./)?.[1] || 0;
      const timeB = b.fileName.match(/_(\d+)\./)?.[1] || 0;
      return Number(timeB) - Number(timeA);
    });

    return NextResponse.json(receipts);

  } catch (error: any) {
    console.error('Error fetching receipts from blob:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
