import api from './api';

export interface Supplier {
    id: number;
    code: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    tax_id?: string;
    payment_terms?: number;
    bank_name?: string;
    bank_account?: string;
    status: 'active' | 'inactive' | 'blacklisted';
}

export const supplierService = {
    async getAll(): Promise<Supplier[]> {
        const response = await api.get('/suppliers');
        return response.data.data || [];
    },
    async create(data: Partial<Supplier>): Promise<Supplier> {
        const response = await api.post('/suppliers', data);
        return response.data.data;
    }
};
