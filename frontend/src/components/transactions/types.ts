export interface Transaction {
    id: string;
    event_type: string;
    contract_address: string;
    basename: string | null;
    transaction_hash: string;
    block_number: number;
    event_data: any;
    created_at: string;
    role?: string;
    from_address?: string;
    template_id?: string;
}
