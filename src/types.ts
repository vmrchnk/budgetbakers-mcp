export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
  [key: string]: unknown;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  type?: string;
  [key: string]: unknown;
}

export interface Label {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  categoryId?: string;
  date: string;
  payee?: string;
  note?: string;
  labelIds?: string[];
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore?: boolean;
}
