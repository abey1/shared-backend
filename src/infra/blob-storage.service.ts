import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { randomUUID } from 'crypto';

export type BlobContainerKey = 'equipment' | 'conditions' | 'disputes' | 'deliveries';

@Injectable()
export class BlobStorageService {
  private credential: StorageSharedKeyCredential | null = null;
  private serviceClient: BlobServiceClient | null = null;

  constructor(private readonly config: ConfigService) {
    const name = this.config.get<string>('blob.accountName', '');
    const key = this.config.get<string>('blob.accountKey', '');
    if (name && key) {
      this.credential = new StorageSharedKeyCredential(name, key);
      this.serviceClient = new BlobServiceClient(
        `https://${name}.blob.core.windows.net`,
        this.credential,
      );
    }
  }

  private ensureConfigured(): StorageSharedKeyCredential {
    if (!this.credential || !this.serviceClient) {
      throw new ServiceUnavailableException(
        'Azure Blob Storage is not configured (AZURE_STORAGE_ACCOUNT_NAME / KEY).',
      );
    }
    return this.credential;
  }

  private container(key: BlobContainerKey): ContainerClient {
    const cred = this.ensureConfigured();
    const map = this.config.get<Record<BlobContainerKey, string>>('blob.containers')!;
    const containerName = map[key];
    return this.serviceClient!.getContainerClient(containerName);
  }

  async createUploadSas(
    key: BlobContainerKey,
    extension: string,
    ttlMinutes = 15,
  ): Promise<{ uploadUrl: string; blobPath: string }> {
    const ext = extension.replace(/^\./, '').slice(0, 8);
    const blobPath = `${randomUUID()}.${ext}`;
    const container = this.container(key);
    const blobClient = container.getBlockBlobClient(blobPath);
    const credential = this.ensureConfigured();
    const startsOn = new Date(Date.now() - 60_000);
    const expiresOn = new Date(Date.now() + ttlMinutes * 60_000);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: container.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('cw'),
        startsOn,
        expiresOn,
      },
      credential,
    ).toString();
    return { uploadUrl: `${blobClient.url}?${sas}`, blobPath };
  }

  async createReadSas(
    key: BlobContainerKey,
    blobPath: string,
    ttlMinutes = 60,
  ): Promise<string> {
    const container = this.container(key);
    const blobClient = container.getBlobClient(blobPath);
    const credential = this.ensureConfigured();
    const startsOn = new Date(Date.now() - 60_000);
    const expiresOn = new Date(Date.now() + ttlMinutes * 60_000);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: container.containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
      },
      credential,
    ).toString();
    return `${blobClient.url}?${sas}`;
  }
}
