export interface IApiBlockCypherResponse {
  address: string;
  total_received: number;
  total_sent: number;
  balance: number;
  unconfirmed_balance: number;
  final_balance: number;
  n_tx: number;
  unconfirmed_n_tx: number;
  final_n_tx: number;
  hasMore: boolean;
  txs: Tx[];
}

export interface Tx {
  block_hash: string;
  block_height: number;
  block_index: number;
  hash: string;
  addresses: string[];
  total: number;
  fees: number;
  size: number;
  vsize: number;
  preference: string;
  relayed_by: string;
  confirmed: string;
  received: string;
  ver: number;
  double_spend: boolean;
  vin_sz: number;
  vout_sz: number;
  opt_in_rbf: boolean;
  confirmations: number;
  confidence: number;
  inputs: Input[];
  outputs: Output[];
  next_inputs: string;
}

export interface Input {
  prev_hash: string;
  output_index: number;
  script: string;
  output_value: number;
  sequence: number;
  addresses: string[];
  script_type: string;
  age: number;
  witness?: string[];
}

export interface Output {
  value: number;
  script: string;
  spent_by: string;
  addresses: string[];
  script_type: string;
}

export interface IReport {
  address: string;
  totalReceived: number;
  totalSent: number;
  transactionCount: number;
  txs: Tx[];

  currentBalance?: number;
  currentBalanceUsd?: number;
  highestBalance?: number;
  highestBalanceUsd?: number;
  highestBalanceDate?: string;
  totalReceivedUsd?: number;
  totalSentUsd?: number;
}
