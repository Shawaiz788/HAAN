export type IdCardType = 'cnic';

export type IdSide = 'front' | 'back';

export type VerificationStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected';

export interface IdCardImages {
  frontUri: string | null;
  backUri: string | null;
}

export interface IdVerificationPayload {
  cardType: IdCardType;
  frontUri: string;
  backUri: string;
  fullName?: string;
  idNumber?: string;
}

export interface VerificationRecord {
  status: VerificationStatus;
  fullName?: string;
  idNumber?: string;
  cardType?: IdCardType;
  frontUri?: string;
  backUri?: string;
  submittedAt?: string;
  rejectionReason?: string;
}

export interface IdVerificationService {
  getVerificationStatus(userId: number): Promise<VerificationRecord>;
  submitVerification(userId: number, payload: IdVerificationPayload): Promise<VerificationRecord>;
}
