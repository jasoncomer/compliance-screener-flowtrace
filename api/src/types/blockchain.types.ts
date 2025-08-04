import { BtcTransaction } from "@src/models";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalTxs: number;
  limit: number;
}

export interface TransactionResponse {
  txs: BtcTransaction[];
  pagination: PaginationInfo;
} 