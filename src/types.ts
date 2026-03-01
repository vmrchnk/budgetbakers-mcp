export interface MoneyAmount {
  value: number;
  currencyCode: string;
}

export interface Account {
  id: string;
  name: string;
  archived: boolean;
  color: string;
  accountType: string;
  initialBalance: MoneyAmount;
  initialBaseBalance: MoneyAmount;
  excludeFromStats: boolean;
  createdAt: string;
  updatedAt: string;
  recordStats?: {
    recordCount: number;
    recordDate: { min: string; max: string };
    createdAt: { min: string; max: string };
  };
  [key: string]: unknown;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  customCategory: boolean;
  customName: boolean;
  iconName?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface RecordCategory {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: MoneyAmount;
  baseAmount: MoneyAmount;
  recordDate: string;
  category: RecordCategory;
  recordState: string;
  recordType: string;
  paymentType: string;
  note?: string;
  payee?: string;
  labelIds?: string[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface AgentHint {
  type: string;
  severity: "instruction" | "warning" | "info";
  text: string;
  action?: { url: string };
  data?: Record<string, unknown>;
}

export interface ApiEnvelope<T> {
  agentHints: AgentHint[];
  limit: number;
  offset: number;
  nextOffset?: number;
  [key: string]: unknown;
}
