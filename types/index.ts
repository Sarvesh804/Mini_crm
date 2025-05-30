export interface Customer {
    id: string;
    name: string;
    email: string;
    totalSpent: number;
    visits: number;
    lastVisit: Date | null;
    createdAt: Date;
  }
  
  export interface Order {
    id: string;
    customerId: string;
    amount: number;
    createdAt: Date;
  }
  
  export interface Campaign {
    id: string;
    name: string;
    rules: SegmentRule[];
    message: string;
    audienceSize: number;
    createdBy: string;
    createdAt: Date;
  }
  
  export interface SegmentRule {
    field: string;
    operator: string;
    value: string | number;
    logic?: 'AND' | 'OR';
  }
  
  export interface CommunicationLog {
    id: string;
    campaignId: string;
    customerId: string;
    status: 'PENDING' | 'SENT' | 'FAILED';
    message: string;
    sentAt: Date | null;
    createdAt: Date;
  }
  
  export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: unknown[];
  }